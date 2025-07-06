const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(bodyParser.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create streams directory for live streaming
const streamsDir = path.join(process.cwd(), 'streams');
if (!fs.existsSync(streamsDir)) {
  fs.mkdirSync(streamsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Configure multer for stream uploads
const streamStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, streamsDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'stream-' + Date.now() + '.jpg');
  }
});

const streamUpload = multer({ 
  storage: streamStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for stream frames
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// SQLite connection
const dbPath = path.resolve(__dirname, 'customerdb.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    return;
  }
  console.log('Connected to SQLite database.');
});

// Create tables if not exists
const createTablesQuery = `
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    nationality TEXT NOT NULL,
    currently_in_egypt BOOLEAN NOT NULL,
    date_of_arrival TEXT,
    date_of_leaving TEXT,
    currently_in_risk BOOLEAN NOT NULL
  );

  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    customer_id INTEGER,
    upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers (id)
  );

  CREATE TABLE IF NOT EXISTS streams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stream_name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_frame_time DATETIME,
    frame_count INTEGER DEFAULT 0
  );
`;

db.exec(createTablesQuery, (err) => {
  if (err) {
    console.error('Failed to create tables:', err.message);
  } else {
    console.log('Tables created successfully.');
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-stream', (streamName) => {
    socket.join(streamName);
    console.log(`Client ${socket.id} joined stream: ${streamName}`);
  });
  
  socket.on('leave-stream', (streamName) => {
    socket.leave(streamName);
    console.log(`Client ${socket.id} left stream: ${streamName}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.get('/', (req, res) => {
  res.send('ESP32-CAM Streaming Server is running!');
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Signup endpoint
app.post('/signup', (req, res) => {
  const { email, password, name, nationality, currently_in_egypt, date_of_arrival, date_of_leaving, currently_in_risk } = req.body;
  if (!email || !password || !name || !nationality || currently_in_egypt === undefined || currently_in_risk === undefined) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }
  const query = `INSERT INTO customers (email, password, name, nationality, currently_in_egypt, date_of_arrival, date_of_leaving, currently_in_risk) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  db.run(query, [email, password, name, nationality, currently_in_egypt ? 1 : 0, date_of_arrival || null, date_of_leaving || null, currently_in_risk ? 1 : 0], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ message: 'Email already exists.' });
      }
      console.error(err);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    res.status(201).json({ message: 'Customer created successfully.' });
  });
});

// Signin endpoint
app.post('/signin', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  const query = `SELECT * FROM customers WHERE email = ?`;
  db.get(query, [email], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: 'Customer not found.' });
    }
    if (row.password === password) {
      // Remove password before sending data
      const { password, ...customerData } = row;
      return res.status(200).json({ message: 'Sign in successful.', customer: customerData });
    } else {
      return res.status(401).json({ message: 'Incorrect password.' });
    }
  });
});

// Upload photo endpoint
app.post('/upload-photo', upload.single('photo'), (req, res) => {
  console.log('Upload request received');
  console.log('Request body:', req.body);
  console.log('Request file:', req.file);
  
  if (!req.file) {
    console.log('No file uploaded');
    return res.status(400).json({ message: 'No photo uploaded.' });
  }

  const { customer_id, description } = req.body;
  const filename = req.file.filename;
  const originalName = req.file.originalname;
  const filePath = req.file.path;

  console.log('File details:', { filename, originalName, filePath, customer_id, description });

  const query = `INSERT INTO photos (filename, original_name, file_path, customer_id, description) VALUES (?, ?, ?, ?, ?)`;
  db.run(query, [filename, originalName, filePath, customer_id || null, description || null], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    console.log('Photo saved to database with ID:', this.lastID);
    res.status(201).json({ 
      message: 'Photo uploaded successfully.',
      photo: {
        id: this.lastID,
        filename: filename,
        original_name: originalName,
        customer_id: customer_id,
        description: description,
        upload_time: new Date().toISOString()
      }
    });
  });
});

// Get photos endpoint
app.get('/photos', (req, res) => {
  const { customer_id, limit = 50 } = req.query;
  let query = `SELECT * FROM photos`;
  let params = [];

  if (customer_id) {
    query += ` WHERE customer_id = ?`;
    params.push(customer_id);
  }

  query += ` ORDER BY upload_time DESC LIMIT ?`;
  params.push(parseInt(limit));

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    res.json({ photos: rows });
  });
});

// Get photo file endpoint
app.get('/photos/:id/file', (req, res) => {
  const photoId = req.params.id;
  const query = `SELECT file_path, original_name FROM photos WHERE id = ?`;
  
  db.get(query, [photoId], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: 'Photo not found.' });
    }
    
    // Check if file exists
    if (!fs.existsSync(row.file_path)) {
      return res.status(404).json({ message: 'Photo file not found.' });
    }
    
    res.sendFile(row.file_path);
  });
});

// Delete photo endpoint
app.delete('/photos/:id', (req, res) => {
  const photoId = req.params.id;
  const query = `SELECT file_path FROM photos WHERE id = ?`;
  
  db.get(query, [photoId], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: 'Photo not found.' });
    }
    
    // Delete file from filesystem
    if (fs.existsSync(row.file_path)) {
      fs.unlinkSync(row.file_path);
    }
    
    // Delete from database
    const deleteQuery = `DELETE FROM photos WHERE id = ?`;
    db.run(deleteQuery, [photoId], function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database error', error: err.message });
      }
      res.json({ message: 'Photo deleted successfully.' });
    });
  });
});

// ===== ESP32-CAM STREAMING ENDPOINTS =====

// Create a new stream
app.post('/streams', (req, res) => {
  const { stream_name } = req.body;
  if (!stream_name) {
    return res.status(400).json({ message: 'Stream name is required.' });
  }
  
  const query = `INSERT INTO streams (stream_name) VALUES (?)`;
  db.run(query, [stream_name], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ message: 'Stream name already exists.' });
      }
      console.error(err);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    res.status(201).json({ 
      message: 'Stream created successfully.',
      stream: {
        id: this.lastID,
        stream_name: stream_name,
        is_active: true
      }
    });
  });
});

// Get all streams
app.get('/streams', (req, res) => {
  const query = `SELECT * FROM streams ORDER BY created_at DESC`;
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    res.json({ streams: rows });
  });
});

// Upload stream frame from ESP32-CAM
app.post('/streams/:streamName/frame', streamUpload.single('frame'), (req, res) => {
  const streamName = req.params.streamName;
  
  if (!req.file) {
    return res.status(400).json({ message: 'No frame uploaded.' });
  }

  const framePath = req.file.path;
  const frameBuffer = fs.readFileSync(framePath);
  const frameBase64 = frameBuffer.toString('base64');

  // Update stream statistics
  const updateQuery = `UPDATE streams SET last_frame_time = CURRENT_TIMESTAMP, frame_count = frame_count + 1 WHERE stream_name = ?`;
  db.run(updateQuery, [streamName], function(err) {
    if (err) {
      console.error('Database error:', err);
    }
  });

  // Broadcast frame to all clients watching this stream
  io.to(streamName).emit('new-frame', {
    streamName: streamName,
    frame: frameBase64,
    timestamp: new Date().toISOString()
  });

  // Clean up the temporary file
  fs.unlinkSync(framePath);

  res.status(200).json({ 
    message: 'Frame uploaded and broadcasted successfully.',
    streamName: streamName
  });
});

// MJPEG stream endpoint for direct ESP32-CAM streaming
app.get('/streams/:streamName/mjpeg', (req, res) => {
  const streamName = req.params.streamName;
  
  res.writeHead(200, {
    'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
    'Cache-Control': 'no-cache',
    'Connection': 'close',
    'Pragma': 'no-cache'
  });

  const frameHandler = (data) => {
    if (data.streamName === streamName) {
      const boundary = '\r\n--frame\r\n';
      const headers = 'Content-Type: image/jpeg\r\nContent-Length: ' + Buffer.from(data.frame, 'base64').length + '\r\n\r\n';
      res.write(boundary + headers);
      res.write(Buffer.from(data.frame, 'base64'));
    }
  };

  io.on('new-frame', frameHandler);

  req.on('close', () => {
    io.off('new-frame', frameHandler);
  });
});

// Get stream statistics
app.get('/streams/:streamName/stats', (req, res) => {
  const streamName = req.params.streamName;
  const query = `SELECT * FROM streams WHERE stream_name = ?`;
  
  db.get(query, [streamName], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: 'Stream not found.' });
    }
    res.json({ stream: row });
  });
});

// Delete stream
app.delete('/streams/:streamName', (req, res) => {
  const streamName = req.params.streamName;
  const query = `DELETE FROM streams WHERE stream_name = ?`;
  
  db.run(query, [streamName], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Stream not found.' });
    }
    res.json({ message: 'Stream deleted successfully.' });
  });
});

// Error handling middleware for multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('Multer error:', error);
    return res.status(400).json({ message: 'File upload error', error: error.message });
  } else if (error) {
    console.error('Upload error:', error);
    return res.status(400).json({ message: 'Upload error', error: error.message });
  }
  next();
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`ESP32-CAM Streaming Server running on http://${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
      process.exit(0);
    });
  });
}); 