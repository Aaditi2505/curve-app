# Modern Curve App (React + Node + SQLite)

This is the new, modern version of the Curve application built for stability and performance.

## Structure
- **client/**: The Frontend built with React and Vite.
- **server/**: The Backend built with Node.js, Express, and SQLite.

## Prerequisites
- Node.js installed (you already have this).

## How to Run

### 1. Start the Server (Backend)
Open a terminal in the `curve-modern/server` directory and run:
```bash
node server.js
```
This runs the API on `http://localhost:3001`.
- It will automatically create the database `data/curve.db`.
- Default credentials:
  - Admin: `admin` / `admin123`
  - User: `user` / `user123`

### 2. Start the Client (Frontend)
Open a NEW terminal in the `curve-modern/client` directory and run:
```bash
npm run dev
```
- Click the local link (e.g., `http://localhost:5173`) to open the app.

## Features Implemented
- **Database**: Real SQLite database (file-based). No complex setup.
- **Login**: Secure login with Role-based access (Admin/User).
- **Appointments**: Create, Read, Update appointments smoothly.
- **Uploads**: Robust file upload system tied to appointments.
