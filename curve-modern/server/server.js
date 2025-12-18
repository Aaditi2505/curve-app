const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = 3001; // New port for the modern app

app.use(cors());
app.use(express.json());

// Serve Uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static(uploadDir));

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}-${Date.now()}${ext}`);
    }
});
const upload = multer({ storage });

// --- API ROUTES ---

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        [username, password],
        (err, user) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!user) return res.status(401).json({ error: "Invalid credentials" });
            res.json({
                username: user.username,
                role: user.role,
                branch: user.branch
            });
        }
    );
});

// Get Appointments (with filters)
app.get('/api/appointments', (req, res) => {
    const { branch, date } = req.query;
    let query = "SELECT * FROM appointments WHERE branch = ?";
    let params = [branch];

    if (date) {
        query += " AND date = ?";
        params.push(date);
    }

    query += " ORDER BY id DESC";

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create Appointment
app.post('/api/appointments', (req, res) => {
    const data = req.body;

    // Generate simple Booking ID (e.g., #1001)
    db.get("SELECT MAX(id) as maxId FROM appointments", [], (err, row) => {
        const nextId = (row && row.maxId ? row.maxId : 0) + 1;
        const bookingId = String(nextId).padStart(4, '0');

        const stmt = db.prepare(`
            INSERT INTO appointments (
                bookingId, branch, name, age, sex, date, time, 
                contact, whatsapp, address
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            bookingId, data.branch, data.name, data.age, data.sex, data.date, data.time,
            data.contact, data.whatsapp, data.address,
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, bookingId, id: this.lastID });
            }
        );
        stmt.finalize();
    });
});

// Update Appointment (Generic)
app.put('/api/appointments/:bookingId', (req, res) => {
    const { bookingId } = req.params;
    const data = req.body;
    const keys = Object.keys(data);

    if (keys.length === 0) return res.status(400).json({ error: 'No data to update' });

    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), bookingId];

    db.run(`UPDATE appointments SET ${setClause} WHERE bookingId = ?`, values, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Upload Files
app.post('/api/upload', upload.array('files'), (req, res) => {
    const { bookingId, fileType } = req.body;
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

    const stmt = db.prepare("INSERT INTO files (bookingId, fileType, filePath, originalName) VALUES (?, ?, ?, ?)");

    req.files.forEach(file => {
        const filePath = `/uploads/${file.filename}`;
        stmt.run(bookingId, fileType, filePath, file.originalname);
    });

    stmt.finalize();
    res.json({ success: true, files: req.files.map(f => `/uploads/${f.filename}`) });
});

// Get Files for Appointment
app.get('/api/files/:bookingId', (req, res) => {
    db.all("SELECT * FROM files WHERE bookingId = ?", [req.params.bookingId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(PORT, () => {
    console.log(`Modern API Server running on http://localhost:${PORT}`);
});
