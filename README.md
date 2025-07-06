# ESP32-CAM Live Streaming Server

A complete Node.js server solution for streaming live video from ESP32-CAM modules with real-time WebSocket support and MJPEG streaming capabilities.

## 🚀 Live Demo

[Deployed on Railway](https://your-app-name.railway.app)

## ✨ Features

- **Real-time streaming** via WebSocket connections
- **MJPEG streaming** for direct browser viewing
- **Multiple stream support** - handle multiple ESP32-CAM devices
- **Stream statistics** - track frame count, timestamps, and connection status
- **Web viewer** - built-in HTML interface for viewing streams
- **RESTful API** - complete API for stream management
- **Cloud deployment ready** - configured for Railway deployment

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Real-time**: Socket.IO
- **Database**: SQLite
- **File Upload**: Multer
- **Deployment**: Railway

## 📦 Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/esp32-cam-streaming-server.git
   cd esp32-cam-streaming-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Access the application**
   - Server: http://localhost:3000
   - Stream Viewer: http://localhost:3000/stream-viewer.html

### Railway Deployment

1. **Fork this repository** to your GitHub account

2. **Connect to Railway**
   - Go to [Railway.app](https://railway.app)
   - Sign in with GitHub
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your forked repository

3. **Configure environment variables** (if needed)
   - Go to your Railway project settings
   - Add any environment variables under "Variables" tab

4. **Deploy**
   - Railway will automatically detect the Node.js app
   - It will install dependencies and start the server
   - Your app will be available at the provided Railway URL

## 🔧 ESP32-CAM Setup

### Required Libraries
- ESP32 board support for Arduino IDE
- ArduinoJson by Benoit Blanchon

### Configuration
Edit `esp32cam_streaming.ino` and update:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "https://your-app-name.railway.app"; // Your Railway URL
const char* streamName = "esp32cam";
```

### Upload Instructions
1. Connect ESP32-CAM to your computer
2. Select ESP32 board in Arduino IDE
3. Upload the code
4. Open Serial Monitor to see connection status

## 📡 API Endpoints

### Stream Management
- `POST /streams` - Create a new stream
- `GET /streams` - List all streams
- `DELETE /streams/:streamName` - Delete a stream

### Frame Upload
- `POST /streams/:streamName/frame` - Upload a frame from ESP32-CAM

### Streaming
- `GET /streams/:streamName/mjpeg` - MJPEG stream endpoint
- `GET /streams/:streamName/stats` - Get stream statistics

### WebSocket Events
- `join-stream` - Join a stream room
- `leave-stream` - Leave a stream room
- `new-frame` - Receive new frame data

## 🌐 Usage

### Web Interface
1. Open the stream viewer: `https://your-app-name.railway.app/stream-viewer.html`
2. Enter your stream name (default: "esp32cam")
3. Click "Connect WebSocket" for real-time streaming
4. Or click "View MJPEG Stream" for direct browser streaming

### API Examples

**Create Stream**
```bash
curl -X POST https://your-app-name.railway.app/streams \
  -H "Content-Type: application/json" \
  -d '{"stream_name": "mycamera"}'
```

**Get Stream Stats**
```bash
curl https://your-app-name.railway.app/streams/mycamera/stats
```

**List All Streams**
```bash
curl https://your-app-name.railway.app/streams
```

## 📁 Project Structure

```
├── server.js                 # Main server file
├── package.json             # Dependencies and scripts
├── railway.json             # Railway deployment config
├── Procfile                 # Railway process file
├── .gitignore              # Git ignore rules
├── stream-viewer.html       # Web viewer interface
├── esp32cam_streaming.ino   # ESP32-CAM Arduino code
├── README.md               # This file
└── README_ESP32_Streaming.md # Detailed ESP32 setup guide
```

## 🔒 Environment Variables

For Railway deployment, you can set these environment variables:

- `PORT` - Server port (Railway sets this automatically)
- `NODE_ENV` - Environment (production/development)

## 🚀 Performance Tips

- Use 5-10 FPS for stable streaming
- Optimize JPEG quality (10-20 for good balance)
- Use lower resolution (640x480 or 320x240)
- Ensure good WiFi signal strength

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

- Check the [ESP32 Setup Guide](README_ESP32_Streaming.md) for detailed instructions
- Review the troubleshooting section in the ESP32 guide
- Check server logs in Railway dashboard
- Verify network connectivity and WiFi credentials

## 🔗 Links

- [Railway Documentation](https://docs.railway.app/)
- [ESP32-CAM Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/camera.html)
- [Socket.IO Documentation](https://socket.io/docs/)

---

⭐ **Star this repository if you find it helpful!** 