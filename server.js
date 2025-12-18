const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const os = require('os');

const app = express();
const PORT = 3000;

// Helper to find local IP
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if ('IPv4' === iface.family && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Security & Performance Middleware
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Serve Static Files
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Simple JSON Database for Shared Data ---
const DB_FILE = path.join(__dirname, 'shared_patients.json');

// Helper to save patient data
app.post('/api/share', (req, res) => {
  const patient = req.body;
  if (!patient || !patient.bookingId) {
    return res.status(400).json({ error: 'Invalid patient data or missing bookingId' });
  }

  let db = {};
  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE));
    } catch (e) {
      console.error('Error reading DB:', e);
    }
  }

  db[patient.bookingId] = patient;

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    res.json({ success: true, message: 'Patient data shared successfully.' });
  } catch (e) {
    console.error('Error writing DB:', e);
    res.status(500).json({ error: 'Failed to save data on server.' });
  }
});

// Helper to get patient data
app.get('/api/patient/:id', (req, res) => {
  const { id } = req.params;
  if (!fs.existsSync(DB_FILE)) return res.status(404).json({ error: 'No shared data found.' });

  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE));
    const patient = db[id];
    if (patient) res.json(patient);
    else res.status(404).json({ error: 'Patient not found.' });
  } catch (e) {
    res.status(500).json({ error: 'Server error reading data.' });
  }
});

// Config Endpoint
app.get('/api/config', (req, res) => {
  res.json({
    ip: getLocalIp(),
    port: PORT,
    baseUrl: `http://${getLocalIp()}:${PORT}`
  });
});

// --- Upload Logic ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    cb(null, `${name}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

app.post('/upload', upload.array('files'), (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded.' });
  const filePaths = req.files.map(file => `/uploads/${file.filename}`);
  res.json({ paths: filePaths });
});

// --- Health Check ---
app.get('/health', (req, res) => res.send('OK'));

// --- Error Handling & Exit Prevention ---
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});

// Start Server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 CURVE PRODUCTION SERVER IS LIVE`);
  console.log(`-----------------------------------`);
  console.log(`URL: http://x3dmanagement.com`);
  console.log(`Internal: http://localhost:${PORT}`);
  console.log(`Local IP: http://${getLocalIp()}:${PORT}`);
  console.log(`-----------------------------------\n`);
});

// Production Timeouts for large 3D files
server.timeout = 10 * 60 * 1000; // 10 minutes
server.keepAliveTimeout = 61 * 1000;
server.headersTimeout = 65 * 1000;
