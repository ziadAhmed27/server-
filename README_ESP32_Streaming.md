# ESP32-CAM Live Streaming Server

This project provides a complete solution for streaming live video from an ESP32-CAM to a Node.js server and viewing it in real-time through a web interface.

## Features

- **Real-time streaming** via WebSocket connections
- **MJPEG streaming** for direct browser viewing
- **Multiple stream support** - handle multiple ESP32-CAM devices
- **Stream statistics** - track frame count, timestamps, and connection status
- **Web viewer** - built-in HTML interface for viewing streams
- **RESTful API** - complete API for stream management

## Prerequisites

- Node.js (v14 or higher)
- ESP32-CAM module
- WiFi network
- Arduino IDE with ESP32 board support

## Installation

### 1. Install Server Dependencies

```bash
npm install
```

### 2. Start the Server

```bash
npm start
```

The server will start on port 3000 by default.

## ESP32-CAM Setup

### 1. Install Required Libraries

In Arduino IDE, install these libraries:
- `ESP32` board support
- `ArduinoJson` by Benoit Blanchon

### 2. Configure the ESP32-CAM Code

Edit `esp32cam_streaming.ino` and update:

```cpp
// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server configuration
const char* serverUrl = "http://your-server-ip:3000"; // Replace with your server IP
const char* streamName = "esp32cam"; // Stream name for this camera
```

### 3. Upload to ESP32-CAM

1. Connect your ESP32-CAM to your computer
2. Select the correct board in Arduino IDE
3. Upload the code

## Usage

### 1. Create a Stream

The ESP32-CAM will automatically create a stream when it connects. You can also create streams manually:

```bash
curl -X POST http://localhost:3000/streams \
  -H "Content-Type: application/json" \
  -d '{"stream_name": "mycamera"}'
```

### 2. View the Stream

Open `stream-viewer.html` in your web browser or access the server directly:

- **WebSocket Viewer**: `http://localhost:3000/stream-viewer.html`
- **MJPEG Stream**: `http://localhost:3000/streams/esp32cam/mjpeg`

### 3. API Endpoints

#### Stream Management

- `POST /streams` - Create a new stream
- `GET /streams` - List all streams
- `DELETE /streams/:streamName` - Delete a stream

#### Frame Upload

- `POST /streams/:streamName/frame` - Upload a frame from ESP32-CAM

#### Streaming

- `GET /streams/:streamName/mjpeg` - MJPEG stream endpoint
- `GET /streams/:streamName/stats` - Get stream statistics

#### WebSocket Events

- `join-stream` - Join a stream room
- `leave-stream` - Leave a stream room
- `new-frame` - Receive new frame data

## Configuration

### Server Configuration

You can modify these settings in `server.js`:

```javascript
// Frame upload limits
const streamUpload = multer({ 
  storage: streamStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for stream frames
  }
});

// Frame interval (in milliseconds)
const frameInterval = 100; // 10 FPS
```

### ESP32-CAM Configuration

Modify these settings in `esp32cam_streaming.ino`:

```cpp
// Streaming settings
const int frameInterval = 100; // Milliseconds between frames (10 FPS)
const int jpegQuality = 10; // JPEG quality (0-63, lower is better quality)
const int frameWidth = 640;
const int frameHeight = 480;
```

## Troubleshooting

### Common Issues

1. **ESP32-CAM not connecting**
   - Check WiFi credentials
   - Verify server IP address
   - Ensure server is running

2. **Poor video quality**
   - Reduce frame rate by increasing `frameInterval`
   - Increase JPEG quality (higher number = lower quality)
   - Check WiFi signal strength

3. **High latency**
   - Reduce frame rate
   - Lower JPEG quality
   - Use wired connection for server

4. **Memory issues**
   - Reduce frame buffer count
   - Lower resolution
   - Increase frame interval

### Debug Information

The ESP32-CAM will output debug information to the Serial Monitor:

```
ESP32-CAM Streaming Setup
Camera initialized successfully
Connecting to WiFi...
WiFi connected
IP address: 192.168.1.100
Stream creation response: {"message":"Stream created successfully","stream":{"id":1,"stream_name":"esp32cam","is_active":true}}
Sent frame 30
Sent frame 60
```

## Performance Optimization

### For Better Performance

1. **Reduce frame rate** to 5-10 FPS for stable streaming
2. **Use lower resolution** (320x240 or 640x480)
3. **Optimize JPEG quality** (10-20 for good balance)
4. **Use 5GHz WiFi** if available
5. **Place ESP32-CAM close to WiFi router**

### For Multiple Cameras

1. Use different stream names for each camera
2. Consider using different servers for load balancing
3. Monitor server resources (CPU, memory, network)

## Security Considerations

1. **Change default credentials** in production
2. **Use HTTPS** for secure connections
3. **Implement authentication** for stream access
4. **Limit file upload sizes** to prevent DoS attacks
5. **Validate stream names** to prevent injection attacks

## File Structure

```
server/
├── server.js                 # Main server file
├── package.json             # Dependencies
├── stream-viewer.html       # Web viewer
├── esp32cam_streaming.ino   # ESP32-CAM code
├── uploads/                 # Photo uploads directory
├── streams/                 # Stream frames directory
└── customerdb.sqlite        # Database file
```

## API Examples

### Create Stream
```bash
curl -X POST http://localhost:3000/streams \
  -H "Content-Type: application/json" \
  -d '{"stream_name": "camera1"}'
```

### Get Stream Stats
```bash
curl http://localhost:3000/streams/camera1/stats
```

### List All Streams
```bash
curl http://localhost:3000/streams
```

### Delete Stream
```bash
curl -X DELETE http://localhost:3000/streams/camera1
```

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the debug output from ESP32-CAM
3. Check server logs for errors
4. Verify network connectivity

## License

This project is open source and available under the ISC License. 