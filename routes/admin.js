// routes/admin.js — Admin login/logout + enquiries
const express = require('express');
const { login, logout, requireAuth, getAdminAuthConfigError } = require('../middleware/auth');
const { stmts } = require('../db/database');

const router = express.Router();

// POST /api/admin/login
router.post('/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ success: false, message: 'Password required.' });

  try {
    const result = await login(req, password);
    if (!result.ok) {
      return res.status(result.status).json({ success: false, message: result.message });
    }

    return res.json({ success: true, message: 'Logged in successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Unable to start admin session.' });
  }
});

// POST /api/admin/logout
router.post('/logout', requireAuth, async (req, res) => {
  try {
    await logout(req);
    res.clearCookie('elite_motors_admin');
    return res.json({ success: true, message: 'Logged out.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Unable to end admin session.' });
  }
});

// GET /api/admin/session
router.get('/session', (req, res) => {
  const configError = getAdminAuthConfigError();
  if (configError) {
    return res.status(503).json({ success: false, authenticated: false, message: configError });
  }

  if (!req.session?.admin?.authenticated) {
    return res.status(401).json({ success: false, authenticated: false, message: 'Unauthorised. Please login.' });
  }

  return res.json({ success: true, authenticated: true });
});

// GET /api/admin/enquiries
router.get('/enquiries', requireAuth, (req, res) => {
  try {
    const enquiries = stmts.getAllEnquiries.all();
    return res.json({ success: true, enquiries });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/admin/enquiries/:id/replied
router.patch('/enquiries/:id/replied', requireAuth, (req, res) => {
  stmts.markEnquiryReplied.run(req.params.id);
  return res.json({ success: true });
});

// GET /api/admin/subscribers
router.get('/subscribers', requireAuth, (req, res) => {
  const subs = stmts.getAllSubscribers.all();
  return res.json({ success: true, subscribers: subs });
});

module.exports = router;
