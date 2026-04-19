// routes/bookings.js — Public booking submission + Admin CRUD
const express  = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { stmts }  = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { sendMail, bookingConfirmation, dealerNotification, statusUpdateEmail } = require('../middleware/mailer');

const router = express.Router();

// ═══════════════════════════════════════
// PUBLIC — POST /api/bookings
// Submit a new viewing request
// ═══════════════════════════════════════
const bookingValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').trim().normalizeEmail().isEmail().withMessage('Valid email required'),
  body('phone').trim().notEmpty().withMessage('Phone is required').matches(/^[+\d\s\-()]{7,20}$/).withMessage('Invalid phone number'),
  body('brand').trim().notEmpty().withMessage('Brand is required').isIn([
    'Rolls-Royce','Mercedes','Ferrari','Lamborghini','Porsche','McLaren','Bugatti','Aston Martin','Mercedes-AMG','BMW M','Other'
  ]).withMessage('Invalid brand'),
  body('model').optional().trim().isLength({ max: 100 }),
  body('message').optional().trim().isLength({ max: 1000 }),
  body('preferred_date').optional().trim().isLength({ max: 30 }),
  body('preferred_time').optional().trim().isIn(['Morning (10AM–1PM)','Afternoon (1PM–4PM)','Evening (4PM–7PM)','']).withMessage('Invalid time slot'),
];

router.post('/', bookingValidation, async (req, res) => {
  // Validate
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, email, phone, brand, model, message, preferred_date, preferred_time } = req.body;

  const booking = {
    id:             uuidv4(),
    name:           name.trim(),
    email:          email.trim().toLowerCase(),
    phone:          phone.trim(),
    brand,
    model:          model?.trim() || null,
    message:        message?.trim() || null,
    preferred_date: preferred_date?.trim() || null,
    preferred_time: preferred_time?.trim() || null,
    ip_address:     req.ip || req.connection.remoteAddress,
  };

  try {
    // Save to DB
    stmts.insertBooking.run(booking);

    // Log creation
    stmts.insertLog.run(booking.id, null, 'pending', 'system', 'Booking created via website');

    // Send emails (non-blocking)
    Promise.all([
      sendMail(bookingConfirmation(booking)),
      sendMail(dealerNotification(booking)),
    ]).catch(err => console.error('[EMAIL]', err));

    return res.status(201).json({
      success:   true,
      message:   'Viewing request submitted successfully.',
      bookingId: booking.id,
      reference: booking.id.split('-')[0].toUpperCase(),
    });

  } catch (err) {
    console.error('[BOOKING CREATE]', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ═══════════════════════════════════════
// PUBLIC — GET /api/bookings/status/:id
// Check booking status by ID (for client)
// ═══════════════════════════════════════
router.get('/status/:id', (req, res) => {
  try {
    const booking = stmts.getBookingById.get(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    // Return limited public info only
    return res.json({
      success:  true,
      booking: {
        id:             booking.id,
        reference:      booking.id.split('-')[0].toUpperCase(),
        name:           booking.name,
        brand:          booking.brand,
        model:          booking.model,
        status:         booking.status,
        preferred_date: booking.preferred_date,
        preferred_time: booking.preferred_time,
        created_at:     booking.created_at,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN ROUTES (all require X-Admin-Token header)
// ═══════════════════════════════════════════════════════

// GET /api/bookings — all bookings (with optional ?status= filter)
router.get('/', requireAuth, (req, res) => {
  try {
    const { status, search, limit } = req.query;
    let bookings;

    if (search) {
      const q = `%${search}%`;
      bookings = stmts.searchBookings.all(q, q, q, q);
    } else if (status) {
      bookings = stmts.getBookingsByStatus.all(status);
    } else if (limit) {
      bookings = stmts.recentBookings.all(parseInt(limit));
    } else {
      bookings = stmts.getAllBookings.all();
    }

    return res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/bookings/stats — summary counts
router.get('/stats', requireAuth, (req, res) => {
  try {
    const counts = stmts.countByStatus.all();
    const stats  = { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    counts.forEach(row => { stats[row.status] = row.count; stats.total += row.count; });
    return res.json({ success: true, stats });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/bookings/:id — single booking detail
router.get('/:id', requireAuth, (req, res) => {
  try {
    const booking = stmts.getBookingById.get(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Not found.' });
    const logs = stmts.getLogsByBooking.all(booking.id);
    return res.json({ success: true, booking, logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/bookings/:id/status — update booking status
router.patch('/:id/status', requireAuth, async (req, res) => {
  const { status, note } = req.body;
  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }

  try {
    const booking = stmts.getBookingById.get(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    const oldStatus = booking.status;
    stmts.updateStatus.run(status, note || null, req.params.id);
    stmts.insertLog.run(req.params.id, oldStatus, status, 'admin', note || null);

    // Notify client on certain status changes
    if (['confirmed', 'cancelled', 'completed'].includes(status)) {
      const updated = stmts.getBookingById.get(req.params.id);
      sendMail(statusUpdateEmail(updated, status)).catch(console.error);
    }

    return res.json({ success: true, message: `Status updated to "${status}".` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/bookings/:id/notes — add admin notes
router.patch('/:id/notes', requireAuth, (req, res) => {
  const { notes } = req.body;
  try {
    stmts.updateStatus.run(undefined, notes, req.params.id);
    // Use a direct update for notes only
    const { db } = require('../db/database');
    db.prepare('UPDATE bookings SET notes = ?, updated_at = datetime(\'now\') WHERE id = ?').run(notes, req.params.id);
    return res.json({ success: true, message: 'Notes saved.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/bookings/:id — delete booking
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const booking = stmts.getBookingById.get(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Not found.' });
    stmts.deleteBooking.run(req.params.id);
    return res.json({ success: true, message: 'Booking deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
