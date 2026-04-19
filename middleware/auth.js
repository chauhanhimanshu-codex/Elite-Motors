// middleware/auth.js — Session-based admin authentication
require('dotenv').config();

const ADMIN_SESSION_KEY = 'admin';
const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;
const BLOCKED_PASSWORDS = new Set([
  'EliteMotors2024',
  'change_this_admin_password',
]);

function getAdminAuthConfigError() {
  const password = process.env.ADMIN_PASSWORD?.trim();
  const sessionSecret = process.env.SESSION_SECRET?.trim();

  if (!password || BLOCKED_PASSWORDS.has(password)) {
    return 'Admin login is disabled until a unique ADMIN_PASSWORD is configured.';
  }

  if (!sessionSecret) {
    return 'Admin login is disabled until SESSION_SECRET is configured.';
  }

  return null;
}

// Protect admin API routes
function requireAuth(req, res, next) {
  const configError = getAdminAuthConfigError();
  if (configError) {
    return res.status(503).json({ success: false, message: configError });
  }

  const adminSession = req.session?.[ADMIN_SESSION_KEY];
  if (!adminSession?.authenticated) {
    return res.status(401).json({ success: false, message: 'Unauthorised. Please login.' });
  }

  if (Date.now() - adminSession.createdAt > SESSION_LIFETIME_MS) {
    return req.session.destroy(() => {
      res.clearCookie('elite_motors_admin');
      res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
    });
  }

  req.admin = adminSession;
  next();
}

function login(req, password) {
  return new Promise((resolve, reject) => {
    const configError = getAdminAuthConfigError();
    if (configError) {
      return resolve({ ok: false, status: 503, message: configError });
    }

    if (password !== process.env.ADMIN_PASSWORD) {
      return resolve({ ok: false, status: 401, message: 'Invalid password.' });
    }

    req.session.regenerate((err) => {
      if (err) return reject(err);

      req.session[ADMIN_SESSION_KEY] = {
        authenticated: true,
        createdAt: Date.now(),
      };

      resolve({ ok: true });
    });
  });
}

function logout(req) {
  return new Promise((resolve, reject) => {
    if (!req.session) return resolve();
    req.session.destroy((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

module.exports = { requireAuth, login, logout, getAdminAuthConfigError };
