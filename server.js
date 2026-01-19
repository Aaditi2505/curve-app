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

// Force browser to always get the latest version (Cache Buster)
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

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

// Helper to get all patients
app.get('/api/patients', (req, res) => {
  if (!fs.existsSync(DB_FILE)) return res.json({});
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE));
    res.json(db);
  } catch (e) {
    res.status(500).json({ error: 'Server error reading data.' });
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

// Bulk save (optional but useful for first-time sync)
app.post('/api/save-all', (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid data' });
  }

  let db = {};
  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE));
    } catch (e) { }
  }

  // Merge new data into db
  Object.assign(db, data);

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    res.json({ success: true, count: Object.keys(data).length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save all data.' });
  }
});

// Helper to delete a patient
app.delete('/api/patient/:id', (req, res) => {
  const { id } = req.params;
  if (!fs.existsSync(DB_FILE)) return res.json({ success: true });

  try {
    let db = JSON.parse(fs.readFileSync(DB_FILE));
    if (db[id]) {
      delete db[id];
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
      res.json({ success: true, message: 'Patient deleted successfully.' });
    } else {
      res.json({ success: true, message: 'Patient not found or already deleted.' });
    }
  } catch (e) {
    console.error('Error deleting patient:', e);
    res.status(500).json({ error: 'Failed to delete patient on server.' });
  }
});

// Helper to delete ENTIRE BRANCH (Reset)
app.delete('/api/branch/:name', (req, res) => {
  const { name } = req.params;
  if (!fs.existsSync(DB_FILE)) return res.json({ success: true, count: 0 });

  try {
    let db = JSON.parse(fs.readFileSync(DB_FILE));
    const initialCount = Object.keys(db).length;

    // Filter out entries belonging to this branch
    // Check both exact branch name and normalized versions
    const newDb = {};
    let deletedCount = 0;

    Object.keys(db).forEach(key => {
      const appt = db[key];
      const apptBranch = (appt.branch || '').toUpperCase();
      const targetBranch = name.toUpperCase();

      // Flexible matching for X3D
      const isX3D = (targetBranch.includes('X3D') && apptBranch.includes('X3D')) ||
        (targetBranch.includes('X3D') && apptBranch.includes('CHENNAI') || apptBranch.includes('COIMBATORE'));

      const isExact = apptBranch === targetBranch;

      if (isX3D || isExact) {
        deletedCount++;
      } else {
        newDb[key] = appt;
      }
    });

    fs.writeFileSync(DB_FILE, JSON.stringify(newDb, null, 2));
    res.json({ success: true, deleted: deletedCount, remaining: Object.keys(newDb).length });

  } catch (e) {
    console.error('Error wiping branch:', e);
    res.status(500).json({ error: 'Failed to wipe branch.' });
  }
});

// STARTUP CLEANER (One-time auto-wipe for specific ghost records)
if (fs.existsSync(DB_FILE)) {
  try {
    let db = JSON.parse(fs.readFileSync(DB_FILE));
    let changes = false;
    Object.keys(db).forEach(k => {
      const p = db[k];
      // Kill specific names or old X3D records (IDs 0001, 0002 etc if they are old)
      if (p.name && (p.name.toLowerCase().includes('previn') || p.name.toLowerCase().includes('unni') || p.name.toLowerCase().includes('unique'))) {
        console.log(`[STARTUP CLEANER] Removing ghost record: ${p.name} (${k})`);
        delete db[k];
        changes = true;
      }
    });
    if (changes) {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
      console.log('[STARTUP CLEANER] Ghost records removed successfully.');
    }
  } catch (e) { console.error('Startup clean failed', e); }
}
app.get('/api/config', (req, res) => {
  res.json({
    ip: getLocalIp(),
    port: PORT,
    baseUrl: `http://x3dmanagement.com` // Official Production URL
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
  console.log(`Status: Running on port ${PORT}`);
  console.log(`-----------------------------------\n`);
});

// Production Timeouts for large 3D files (Extended to 30 mins)
server.timeout = 30 * 60 * 1000;
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
