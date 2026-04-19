// middleware/mailer.js — Email service using Nodemailer
const nodemailer = require('nodemailer');
require('dotenv').config();

// ── TRANSPORTER ──────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST  || 'smtp.gmail.com',
  port:   parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── SHARED STYLES ────────────────────────────────────────
const base = (content) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Montserrat:wght@300;400&display=swap');
  body { margin:0; padding:0; background:#0a0a0a; font-family:'Montserrat',sans-serif; font-weight:300; color:#f0ece4; }
  .wrap { max-width:580px; margin:0 auto; background:#0d0d0d; }
  .header { padding:44px 48px 36px; border-bottom:1px solid rgba(201,169,110,.18); background:#080808; text-align:center; }
  .logo { font-family:'Cormorant Garamond',serif; font-size:22px; letter-spacing:.42em; color:#f0ece4; }
  .logo b { color:#c9a96e; font-weight:400; }
  .tagline { font-size:9px; letter-spacing:.38em; text-transform:uppercase; color:#4a4642; margin-top:8px; }
  .body { padding:48px; }
  .gold-line { width:52px; height:1px; background:#c9a96e; margin:0 auto 28px; }
  h1 { font-family:'Cormorant Garamond',serif; font-size:36px; font-weight:300; letter-spacing:.04em; margin:0 0 14px; text-align:center; }
  h1 em { font-style:italic; color:#c9a96e; }
  .subtitle { font-size:11.5px; letter-spacing:.1em; line-height:1.9; color:rgba(240,236,228,.5); text-align:center; margin-bottom:40px; }
  .info-box { background:#111; border:1px solid rgba(201,169,110,.14); padding:32px 36px; margin-bottom:32px; }
  .info-row { display:flex; justify-content:space-between; align-items:flex-start; padding:11px 0; border-bottom:1px solid rgba(240,236,228,.06); }
  .info-row:last-child { border-bottom:none; }
  .info-lbl { font-size:9px; letter-spacing:.36em; text-transform:uppercase; color:#c9a96e; padding-top:2px; }
  .info-val { font-size:13px; letter-spacing:.07em; color:#f0ece4; text-align:right; max-width:60%; }
  .ref { text-align:center; font-size:9px; letter-spacing:.3em; text-transform:uppercase; color:#4a4642; margin:28px 0; }
  .ref span { color:#c9a96e; }
  .cta { display:block; text-align:center; margin:36px auto; }
  .cta a { display:inline-block; background:#c9a96e; color:#050505; font-family:'Montserrat',sans-serif; font-size:9.5px; letter-spacing:.32em; text-transform:uppercase; padding:16px 46px; text-decoration:none; }
  .footer { padding:28px 48px 40px; border-top:1px solid rgba(201,169,110,.1); text-align:center; }
  .footer p { font-size:9.5px; letter-spacing:.14em; color:#2e2c2a; line-height:2; }
  .footer a { color:#7a5c2a; text-decoration:none; }
  .status-badge { display:inline-block; padding:6px 18px; font-size:9px; letter-spacing:.3em; text-transform:uppercase; margin:0 auto; }
  .status-pending   { background:rgba(201,169,110,.14); color:#c9a96e; border:1px solid rgba(201,169,110,.3); }
  .status-confirmed { background:rgba(46,213,115,.12); color:#2ed573; border:1px solid rgba(46,213,115,.3); }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="logo">ÉLITE <b>MOTORS</b></div>
    <div class="tagline">Ultra Luxury Automotive Collection</div>
  </div>
  <div class="body">
    ${content}
  </div>
  <div class="footer">
    <p>DLF Cybercity, Gurugram, Haryana &nbsp;|&nbsp; +91 98100 00000<br>
    <a href="mailto:contact@elitemotors.com">contact@elitemotors.com</a><br><br>
    © 2024 Élite Motors. All Rights Reserved.</p>
  </div>
</div>
</body>
</html>`;

// ── EMAIL: Client Confirmation ────────────────────────────
function bookingConfirmation(booking) {
  const html = base(`
    <div class="gold-line"></div>
    <h1>Viewing <em>Confirmed</em></h1>
    <p class="subtitle">Thank you, ${booking.name.split(' ')[0]}. Your private viewing request has been received.<br>Our specialist will contact you within 24 hours to finalise the details.</p>

    <div style="text-align:center;margin-bottom:32px">
      <span class="status-badge status-pending">Awaiting Confirmation</span>
    </div>

    <div class="info-box">
      <div class="info-row"><span class="info-lbl">Reference</span><span class="info-val" style="color:#c9a96e;font-family:'Cormorant Garamond',serif;font-size:15px">#${booking.id.split('-')[0].toUpperCase()}</span></div>
      <div class="info-row"><span class="info-lbl">Name</span><span class="info-val">${booking.name}</span></div>
      <div class="info-row"><span class="info-lbl">Brand of Interest</span><span class="info-val">${booking.brand}</span></div>
      ${booking.model ? `<div class="info-row"><span class="info-lbl">Model</span><span class="info-val">${booking.model}</span></div>` : ''}
      ${booking.preferred_date ? `<div class="info-row"><span class="info-lbl">Preferred Date</span><span class="info-val">${booking.preferred_date}</span></div>` : ''}
      ${booking.preferred_time ? `<div class="info-row"><span class="info-lbl">Preferred Time</span><span class="info-val">${booking.preferred_time}</span></div>` : ''}
      <div class="info-row"><span class="info-lbl">Contact</span><span class="info-val">${booking.phone}</span></div>
    </div>

    <p style="font-size:11.5px;letter-spacing:.08em;line-height:1.95;color:rgba(240,236,228,.45);text-align:center">
      Our showroom is located at DLF Cybercity, Gurugram.<br>
      Monday to Saturday, 10:00 AM – 7:00 PM.
    </p>
  `);

  return {
    from:    process.env.EMAIL_FROM || 'ÉLITE MOTORS <no-reply@elitemotors.com>',
    to:      booking.email,
    subject: `Viewing Request Received — ${booking.brand} | Élite Motors`,
    html,
  };
}

// ── EMAIL: Dealer Notification ────────────────────────────
function dealerNotification(booking) {
  const html = base(`
    <div class="gold-line"></div>
    <h1>New <em>Booking</em> Request</h1>
    <p class="subtitle">A new private viewing request has been submitted via the website.</p>

    <div class="info-box">
      <div class="info-row"><span class="info-lbl">Booking ID</span><span class="info-val" style="color:#c9a96e">${booking.id}</span></div>
      <div class="info-row"><span class="info-lbl">Client Name</span><span class="info-val">${booking.name}</span></div>
      <div class="info-row"><span class="info-lbl">Email</span><span class="info-val">${booking.email}</span></div>
      <div class="info-row"><span class="info-lbl">Phone</span><span class="info-val">${booking.phone}</span></div>
      <div class="info-row"><span class="info-lbl">Brand Interest</span><span class="info-val">${booking.brand}</span></div>
      ${booking.model ? `<div class="info-row"><span class="info-lbl">Model</span><span class="info-val">${booking.model}</span></div>` : ''}
      ${booking.preferred_date ? `<div class="info-row"><span class="info-lbl">Preferred Date</span><span class="info-val">${booking.preferred_date}</span></div>` : ''}
      ${booking.preferred_time ? `<div class="info-row"><span class="info-lbl">Preferred Time</span><span class="info-val">${booking.preferred_time}</span></div>` : ''}
      ${booking.message ? `<div class="info-row"><span class="info-lbl">Message</span><span class="info-val">${booking.message}</span></div>` : ''}
      <div class="info-row"><span class="info-lbl">Source IP</span><span class="info-val">${booking.ip_address || 'Unknown'}</span></div>
      <div class="info-row"><span class="info-lbl">Submitted At</span><span class="info-val">${new Date().toLocaleString('en-IN', {timeZone:'Asia/Kolkata'})}</span></div>
    </div>

    <div class="cta"><a href="http://localhost:3000/admin">View in Admin Panel →</a></div>
  `);

  return {
    from:    process.env.EMAIL_FROM || 'ÉLITE MOTORS <no-reply@elitemotors.com>',
    to:      process.env.DEALER_EMAIL || 'dealer@elitemotors.com',
    subject: `🚗 New Booking: ${booking.name} — ${booking.brand}`,
    html,
  };
}

// ── EMAIL: Status Update ──────────────────────────────────
function statusUpdateEmail(booking, newStatus) {
  const messages = {
    confirmed:  { heading: 'Viewing <em>Confirmed</em>',  sub: 'Your private viewing has been confirmed. We look forward to welcoming you.', badge: 'status-confirmed' },
    cancelled:  { heading: 'Booking <em>Cancelled</em>',  sub: 'Your booking has been cancelled. Please contact us to reschedule.', badge: 'status-pending' },
    completed:  { heading: 'Thank You for <em>Visiting</em>', sub: 'It was a pleasure hosting your private viewing. We hope to see you again.', badge: 'status-confirmed' },
  };
  const m = messages[newStatus] || messages.confirmed;

  const html = base(`
    <div class="gold-line"></div>
    <h1>${m.heading}</h1>
    <p class="subtitle">${m.sub}</p>
    <div style="text-align:center;margin-bottom:32px">
      <span class="status-badge ${m.badge}">${newStatus.charAt(0).toUpperCase()+newStatus.slice(1)}</span>
    </div>
    <div class="info-box">
      <div class="info-row"><span class="info-lbl">Reference</span><span class="info-val" style="color:#c9a96e">#${booking.id.split('-')[0].toUpperCase()}</span></div>
      <div class="info-row"><span class="info-lbl">Name</span><span class="info-val">${booking.name}</span></div>
      <div class="info-row"><span class="info-lbl">Brand</span><span class="info-val">${booking.brand}</span></div>
    </div>
  `);

  return {
    from:    process.env.EMAIL_FROM,
    to:      booking.email,
    subject: `Booking Update — ${newStatus.charAt(0).toUpperCase()+newStatus.slice(1)} | Élite Motors`,
    html,
  };
}

// ── SEND HELPER ───────────────────────────────────────────
async function sendMail(mailOptions) {
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your@gmail.com') {
    console.log('[MAILER] Email not configured — skipping send.');
    console.log('[MAILER] Would send to:', mailOptions.to);
    return { skipped: true };
  }
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[MAILER] Sent:', info.messageId);
    return info;
  } catch (err) {
    console.error('[MAILER] Error:', err.message);
    return { error: err.message };
  }
}

module.exports = { sendMail, bookingConfirmation, dealerNotification, statusUpdateEmail };
