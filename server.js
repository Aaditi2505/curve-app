const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os'); // Added for IP detection

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

app.use(cors());
app.use(express.static(__dirname)); // Serve frontend files from root
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Explicitly serve uploads

app.use(express.json({ limit: '50mb' }));

// Endpoint for frontend to know the server's IP
app.get('/api/config', (req, res) => {
  res.json({
    ip: getLocalIp(),
    port: PORT,
    baseUrl: `http://${getLocalIp()}:${PORT}`
  });
});

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

  // Update or Insert
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

  if (!fs.existsSync(DB_FILE)) {
    return res.status(404).json({ error: 'No shared data found.' });
  }

  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE));
    const patient = db[id];

    if (patient) {
      res.json(patient);
    } else {
      res.status(404).json({ error: 'Patient not found.' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Server error reading data.' });
  }
});

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Preserve extension, prepend timestamp for uniqueness
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${Date.now()}${ext}`);
  }
});

const upload = multer({ storage: storage });

// Upload endpoint
// Accepts multiple fields or a single 'files' field.
// We'll use a generic 'files' field for simplicity or specific fields if needed.
// 'files' allows multiple file selection.
app.post('/upload', upload.array('files'), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }

  // Return paths
  const filePaths = req.files.map(file => `/uploads/${file.filename}`);
  res.json({ paths: filePaths });
});



app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
