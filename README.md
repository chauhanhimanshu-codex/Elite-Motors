# ÉLITE MOTORS — Backend System

A production-ready Node.js + Express + SQLite backend for the Élite Motors luxury car dealer website.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd elite-motors-backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Edit `.env` and fill in:
- `ADMIN_PASSWORD` — your chosen admin panel password
- `SESSION_SECRET` — a long random secret used to sign the admin session cookie
- `EMAIL_USER` / `EMAIL_PASS` — Gmail + App Password for email sending
- `DEALER_EMAIL` — where booking notifications go

### 3. Run the Server
```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

Server starts at: **http://localhost:3000**
Admin panel at: **http://localhost:3000/admin**

---

## 📁 Project Structure

```
elite-motors-backend/
│
├── server.js                 # Express app entry point
├── .env.example              # Environment variable template
├── package.json
│
├── db/
│   └── database.js           # SQLite schema + prepared statements
│
├── routes/
│   ├── bookings.js           # Booking CRUD API
│   └── admin.js              # Admin auth + enquiries
│
├── middleware/
│   ├── auth.js               # Session-based admin authentication
│   └── mailer.js             # Nodemailer email templates
│
└── public/
    ├── index.html            # (place your main website here)
    └── admin/
        └── index.html        # Admin panel UI
```

---

## 🔌 API Reference

### Public Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/bookings` | Submit a viewing request |
| `GET`  | `/api/bookings/status/:id` | Check booking status (public) |
| `GET`  | `/api/health` | Health check |

### Admin Endpoints (require `X-Admin-Token` header)

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/admin/login` | Login — returns token |
| `POST` | `/api/admin/logout` | Logout |
| `GET`  | `/api/bookings` | Get all bookings |
| `GET`  | `/api/bookings?status=pending` | Filter by status |
| `GET`  | `/api/bookings?search=ferrari` | Search bookings |
| `GET`  | `/api/bookings/stats` | Dashboard stats |
| `GET`  | `/api/bookings/:id` | Booking detail + logs |
| `PATCH`| `/api/bookings/:id/status` | Update status |
| `PATCH`| `/api/bookings/:id/notes` | Add notes |
| `DELETE`| `/api/bookings/:id` | Delete booking |
| `GET`  | `/api/admin/enquiries` | All enquiries |
| `PATCH`| `/api/admin/enquiries/:id/replied` | Mark enquiry replied |

---

## 📬 Booking Submission (Frontend)

Connect the website's booking form to the API:

```javascript
document.querySelector('.cf-submit').addEventListener('click', async () => {
  const data = {
    name:           document.querySelector('input[placeholder="Full Name"]').value,
    email:          document.querySelector('input[placeholder="Email Address"]').value,
    phone:          document.querySelector('input[placeholder="Phone Number"]').value,
    brand:          document.querySelector('select').value,
    preferred_time: 'Morning (10AM–1PM)',   // optional
    message:        document.querySelector('textarea').value,
  };

  const res = await fetch('http://localhost:3000/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const result = await res.json();
  if (result.success) {
    alert(`Booking submitted! Reference: #${result.reference}`);
  } else {
    alert('Error: ' + (result.errors?.[0]?.msg || result.message));
  }
});
```

---

## 🔐 Email Setup (Gmail)

1. Go to Google Account → Security → 2-Step Verification → App Passwords
2. Generate an App Password for "Mail"
3. Set in `.env`:
   ```
   EMAIL_USER=you@gmail.com
   EMAIL_PASS=xxxx xxxx xxxx xxxx
   ```

---

## 🌐 Deploying to Railway / Render

1. Push the folder to GitHub
2. Create new project on Railway/Render
3. Set environment variables from `.env.example`
4. Deploy — done!

---

## 🗃️ Database

SQLite file is created automatically at `./db/elite_motors.db`.

Tables:
- `bookings` — all viewing requests with full details
- `booking_logs` — status change history
- `enquiries` — general contact messages
- `subscribers` — newsletter emails
