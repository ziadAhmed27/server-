#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "zezo2_2EX";
const char* password = "ANSMZz27932";

// Server configuration
const char* serverUrl = "server-production-e100.up.railway.app"; // Replace with your server IP
const char* streamName = "esp32cam"; // Stream name for this camera

// ESP32-CAM pin configuration
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    22
#define XCLK_GPIO_NUM     0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM       5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     4

// Streaming settings
const int frameInterval = 100; // Milliseconds between frames (10 FPS)
const int jpegQuality = 10; // JPEG quality (0-63, lower is better quality)
const int frameWidth = 640;
const int frameHeight = 480;

// Status variables
bool isConnected = false;
unsigned long lastFrameTime = 0;
int frameCount = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("ESP32-CAM Streaming Setup");

  // Configure camera
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.frame_size = FRAMESIZE_VGA;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.jpeg_quality = jpegQuality;
  config.fb_count = 2;

  // Initialize camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }
  Serial.println("Camera initialized successfully");

  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("WiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  // Create stream on server
  createStream();
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    WiFi.reconnect();
    delay(5000);
    return;
  }

  // Send frame at specified interval
  unsigned long currentTime = millis();
  if (currentTime - lastFrameTime >= frameInterval) {
    sendFrame();
    lastFrameTime = currentTime;
  }

  delay(10); // Small delay to prevent watchdog issues
}

void createStream() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected");
    return;
  }

  HTTPClient http;
  http.begin(String(serverUrl) + "/streams");
  http.addHeader("Content-Type", "application/json");

  // Create JSON payload
  StaticJsonDocument<200> doc;
  doc["stream_name"] = streamName;
  
  String jsonString;
  serializeJson(doc, jsonString);

  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Stream creation response: " + response);
    if (httpResponseCode == 201) {
      Serial.println("Stream created successfully");
      isConnected = true;
    }
  } else {
    Serial.println("Error creating stream: " + http.errorToString(httpResponseCode));
  }
  
  http.end();
}

void sendFrame() {
  if (!isConnected) {
    Serial.println("Not connected to server");
    return;
  }

  // Capture frame
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return;
  }

  // Send frame to server
  HTTPClient http;
  http.begin(String(serverUrl) + "/streams/" + streamName + "/frame");
  
  // Create multipart form data
  String boundary = "----WebKitFormBoundary" + String(random(0xFFFFFFFF), HEX);
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
  
  String postData = "--" + boundary + "\r\n";
  postData += "Content-Disposition: form-data; name=\"frame\"; filename=\"frame.jpg\"\r\n";
  postData += "Content-Type: image/jpeg\r\n\r\n";
  
  // Calculate content length
  int contentLength = postData.length() + fb->len + boundary.length() + 6;
  
  http.addHeader("Content-Length", String(contentLength));
  
  // Send request
  int httpResponseCode = http.POST((uint8_t*)postData.c_str(), postData.length());
  
  if (httpResponseCode > 0) {
    if (httpResponseCode == 200) {
      frameCount++;
      if (frameCount % 30 == 0) { // Log every 30 frames
        Serial.printf("Sent frame %d\n", frameCount);
      }
    } else {
      Serial.printf("HTTP error: %d\n", httpResponseCode);
    }
  } else {
    Serial.println("Error sending frame: " + http.errorToString(httpResponseCode));
    // Try to recreate stream if there's an error
    if (httpResponseCode == -1) {
      Serial.println("Attempting to recreate stream...");
      createStream();
    }
  }
  
  http.end();
  
  // Return frame buffer
  esp_camera_fb_return(fb);
}

// Optional: Add a function to get stream statistics
void getStreamStats() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;
  http.begin(String(serverUrl) + "/streams/" + streamName + "/stats");
  
  int httpResponseCode = http.GET();
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Stream stats: " + response);
  }
  
  http.end();
} 