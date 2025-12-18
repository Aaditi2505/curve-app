import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// --- CONFIG ---
const API_URL = 'http://localhost:3001/api';

// --- AUTH CONTEXT ---
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('curve_user')));

  const login = async (username, password) => {
    try {
      const res = await axios.post(`${API_URL}/login`, { username, password });
      setUser(res.data);
      localStorage.setItem('curve_user', JSON.stringify(res.data));
      return true;
    } catch (err) {
      alert(err.response?.data?.error || 'Login failed');
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('curve_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// --- COMPONENTS ---

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  if (!user) return null;

  return (
    <nav className="nav">
      <div className="logo" style={{ fontWeight: 'bold', fontSize: '1.5rem', color: '#14bfce' }}>CURVE</div>
      <div className="nav-links">
        <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>Dashboard</Link>
        {user.role === 'ADMINISTRATOR' && (
          <Link to="/book" className={location.pathname === '/book' ? 'active' : ''}>Book Appointment</Link>
        )}
        <a href="#" onClick={logout} style={{ color: '#e74c3c' }}>Logout</a>
      </div>
      <div className="branch-badge" style={{ background: '#eee', padding: '5px 15px', borderRadius: '20px', fontSize: '0.8rem' }}>
        {user.branch}
      </div>
    </nav>
  );
}

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, user } = useContext(AuthContext);

  if (user) return <Navigate to="/dashboard" />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(username, password);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1 style={{ marginBottom: '20px', color: '#2c3e50' }}>Curve Login</h1>
        <form onSubmit={handleSubmit}>
          <input
            className="form-input"
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <input
            className="form-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button className="btn" style={{ width: '100%', marginTop: '10px' }}>Login</button>
        </form>
        <p style={{ marginTop: '20px', fontSize: '0.9rem', color: '#777' }}>
          By default: admin / admin123
        </p>
      </div>
    </div>
  );
}

function Dashboard() {
  const { user } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    // Fetch appointments
    axios.get(`${API_URL}/appointments?branch=${user.branch}`)
      .then(res => setAppointments(res.data))
      .catch(err => console.error(err));
  }, [user.branch]);

  return (
    <div className="container">
      <h1 style={{ marginBottom: '20px' }}>Dashboard ({user.branch})</h1>

      <div className="grid-3 mb-4">
        <div className="stat-card">
          <h3>Total</h3>
          <h1 style={{ color: '#14bfce' }}>{appointments.length}</h1>
        </div>
        <div className="stat-card">
          <h3>Today</h3>
          <h1 style={{ color: '#0e9aa7' }}>
            {appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length}
          </h1>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>Recent Appointments</h3>
        <br />
        <table>
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Name</th>
              <th>Date</th>
              <th>Time</th>
              <th>Contact</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map(appt => (
              <tr key={appt.id}>
                <td style={{ fontWeight: 'bold', color: '#14bfce' }}>{appt.bookingId}</td>
                <td>{appt.name}</td>
                <td>{appt.date}</td>
                <td>{appt.time}</td>
                <td>{appt.contact}</td>
                <td>{appt.status}</td>
              </tr>
            ))}
            {appointments.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>No appointments found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BookAppointment() {
  const { user } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '', age: '', sex: 'Female', date: new Date().toISOString().split('T')[0],
    time: '10:00', contact: '', whatsapp: '', address: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/appointments`, {
        ...formData,
        branch: user.branch
      });
      alert('Appointment Booked Successfully!');
      // Reset or redirect
      setFormData({ ...formData, name: '', contact: '' });
    } catch (err) {
      alert('Error booking appointment');
    }
  };

  return (
    <div className="container">
      <div className="auth-card" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
        <h2 style={{ marginBottom: '20px' }}>Book Appointment</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          <div>
            <label>Name</label>
            <input name="name" className="form-input" value={formData.name} onChange={handleChange} required />
          </div>
          <div>
            <label>Age</label>
            <input name="age" className="form-input" value={formData.age} onChange={handleChange} required />
          </div>

          <div>
            <label>Sex</label>
            <select name="sex" className="form-input" value={formData.sex} onChange={handleChange}>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label>Date</label>
            <input type="date" name="date" className="form-input" value={formData.date} onChange={handleChange} required />
          </div>

          <div>
            <label>Time</label>
            <input type="time" name="time" className="form-input" value={formData.time} onChange={handleChange} required />
          </div>

          <div>
            <label>Contact</label>
            <input name="contact" className="form-input" value={formData.contact} onChange={handleChange} required />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label>Address</label>
            <textarea name="address" className="form-input" value={formData.address} onChange={handleChange} />
          </div>

          <div style={{ gridColumn: 'span 2', textAlign: 'center' }}>
            <button className="btn" type="submit">Book Appointment</button>
          </div>

        </form>
      </div>
    </div>
  );
}

// --- MAIN APP ---

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/book" element={<ProtectedRoute adminOnly><BookAppointment /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function ProtectedRoute({ children, adminOnly }) {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'ADMINISTRATOR') return <Navigate to="/dashboard" />;
  return children;
}

export default App;
