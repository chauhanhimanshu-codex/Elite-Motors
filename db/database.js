// db/database.js — SQLite schema & initialization
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './db/elite_motors.db';

// Ensure db directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── CREATE TABLES ──────────────────────────────────────
db.exec(`

  -- Bookings (viewing appointments)
  CREATE TABLE IF NOT EXISTS bookings (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL,
    phone         TEXT NOT NULL,
    brand         TEXT NOT NULL,
    model         TEXT,
    message       TEXT,
    preferred_date TEXT,
    preferred_time TEXT,
    status        TEXT DEFAULT 'pending'
                  CHECK(status IN ('pending','confirmed','completed','cancelled')),
    source        TEXT DEFAULT 'website',
    ip_address    TEXT,
    created_at    TEXT DEFAULT (datetime('now')),
    updated_at    TEXT DEFAULT (datetime('now')),
    notes         TEXT
  );

  -- Status change history log
  CREATE TABLE IF NOT EXISTS booking_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id TEXT NOT NULL REFERENCES bookings(id),
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by TEXT DEFAULT 'system',
    note       TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Contact enquiries (not a booking — just general questions)
  CREATE TABLE IF NOT EXISTS enquiries (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    phone      TEXT,
    subject    TEXT,
    message    TEXT NOT NULL,
    replied    INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Newsletter subscribers
  CREATE TABLE IF NOT EXISTS subscribers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT UNIQUE NOT NULL,
    name       TEXT,
    active     INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

`);

// ── PREPARED STATEMENTS ────────────────────────────────
const stmts = {

  // Bookings
  insertBooking: db.prepare(`
    INSERT INTO bookings (id,name,email,phone,brand,model,message,preferred_date,preferred_time,ip_address)
    VALUES (@id,@name,@email,@phone,@brand,@model,@message,@preferred_date,@preferred_time,@ip_address)
  `),

  getBookingById: db.prepare(`SELECT * FROM bookings WHERE id = ?`),

  getAllBookings: db.prepare(`
    SELECT * FROM bookings ORDER BY created_at DESC
  `),

  getBookingsByStatus: db.prepare(`
    SELECT * FROM bookings WHERE status = ? ORDER BY created_at DESC
  `),

  updateStatus: db.prepare(`
    UPDATE bookings SET status = ?, updated_at = datetime('now'), notes = COALESCE(?, notes)
    WHERE id = ?
  `),

  deleteBooking: db.prepare(`DELETE FROM bookings WHERE id = ?`),

  searchBookings: db.prepare(`
    SELECT * FROM bookings
    WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? OR brand LIKE ?
    ORDER BY created_at DESC
  `),

  countByStatus: db.prepare(`
    SELECT status, COUNT(*) as count FROM bookings GROUP BY status
  `),

  recentBookings: db.prepare(`
    SELECT * FROM bookings ORDER BY created_at DESC LIMIT ?
  `),

  // Booking log
  insertLog: db.prepare(`
    INSERT INTO booking_logs (booking_id, old_status, new_status, changed_by, note)
    VALUES (?, ?, ?, ?, ?)
  `),

  getLogsByBooking: db.prepare(`
    SELECT * FROM booking_logs WHERE booking_id = ? ORDER BY created_at ASC
  `),

  // Enquiries
  insertEnquiry: db.prepare(`
    INSERT INTO enquiries (name,email,phone,subject,message)
    VALUES (@name,@email,@phone,@subject,@message)
  `),

  getAllEnquiries: db.prepare(`SELECT * FROM enquiries ORDER BY created_at DESC`),
  markEnquiryReplied: db.prepare(`UPDATE enquiries SET replied = 1 WHERE id = ?`),

  // Subscribers
  insertSubscriber: db.prepare(`
    INSERT OR IGNORE INTO subscribers (email, name) VALUES (?, ?)
  `),

  getAllSubscribers: db.prepare(`SELECT * FROM subscribers WHERE active = 1`),

};

module.exports = { db, stmts };
