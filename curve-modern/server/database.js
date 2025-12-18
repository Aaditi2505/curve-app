const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const dbPath = path.join(dataDir, 'curve.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Initialize Tables
db.serialize(() => {
    // Appointments Table
    db.run(`CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bookingId TEXT UNIQUE,
        branch TEXT,
        name TEXT,
        age TEXT,
        sex TEXT,
        date TEXT,
        time TEXT,
        contact TEXT,
        whatsapp TEXT,
        address TEXT,
        chiefComplaint TEXT,
        treatmentPlan TEXT,
        status TEXT DEFAULT 'Pending' -- Pending, Approved, Completed
    )`);

    // Files Table (Linked to Appointments)
    db.run(`CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bookingId TEXT,
        fileType TEXT, -- e.g., 'scan', 'face_video', 'planning_pdf'
        filePath TEXT,
        originalName TEXT,
        uploadDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(bookingId) REFERENCES appointments(bookingId)
    )`);

    // Users Table (For Auth) - Simple setup
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT, -- 'ADMINISTRATOR' or 'USER'
        branch TEXT
    )`);

    // Seed Initial Data (if empty)
    db.get("SELECT count(*) as count FROM users", [], (err, row) => {
        if (row && row.count === 0) {
            const stmt = db.prepare("INSERT INTO users (username, password, role, branch) VALUES (?, ?, ?, ?)");
            stmt.run("admin", "admin123", "ADMINISTRATOR", "CHENNAI");
            stmt.run("user", "user123", "USER", "CHENNAI");
            stmt.finalize();
            console.log("Seeded initial users.");
        }
    });
});

module.exports = db;
