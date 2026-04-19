// server.js — ÉLITE MOTORS Backend Server
require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const session  = require('express-session');

const bookingsRouter = require('./routes/bookings');
const adminRouter    = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// ── MIDDLEWARE ─────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com']            // ← update with your domain
    : ['http://localhost:3000', 'http://localhost:5500', '*'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-Admin-Token'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for real IP addresses
app.set('trust proxy', true);

app.use(session({
  name: 'elite_motors_admin',
  secret: process.env.SESSION_SECRET || 'admin-disabled-until-session-secret-is-configured',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 8 * 60 * 60 * 1000,
  },
}));

// Serve static files (main website + admin panel)
app.use(express.static(path.join(__dirname, 'public')));

// ── ROUTES ─────────────────────────────────────────
app.use('/api/bookings', bookingsRouter);
app.use('/api/admin',    adminRouter);

// ── HEALTH CHECK ───────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status:  'ok',
    version: '1.0.0',
    time:    new Date().toISOString(),
    env:     process.env.NODE_ENV || 'development',
  });
});

// ── ADMIN PANEL ────────────────────────────────────
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

// ── 404 ────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'Endpoint not found.' });
  }
  res.status(404).send('Not found');
});

// ── ERROR HANDLER ──────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ── START ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║    ÉLITE MOTORS — Backend Server     ║');
  console.log('  ╠══════════════════════════════════════╣');
  console.log(`  ║  Running at  http://localhost:${PORT}     ║`);
  console.log(`  ║  Admin Panel http://localhost:${PORT}/admin ║`);
  console.log(`  ║  Environment ${(process.env.NODE_ENV||'development').padEnd(11)}              ║`);
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
});

module.exports = app;
