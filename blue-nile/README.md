# BLUE NILE — Restaurant Website & Management System (RMS)

Production-oriented full-stack MERN website and Restaurant Management System for **Blue Nile**, 102, Bund Garden Road, Agarkar Nagar, Pune, Maharashtra 411001 (`020 2612 5238`).

## Highlights

- **Public editorial website (13 pages)**: Home, About Us, Dynamic Menu, Dish Details, Gallery (lightbox), 8-Step Reservation Wizard, Booking Success, Booking Status & Cancellation, Contact & Directions, FAQ, Privacy Policy, Terms & Conditions, and 404.
- **Customer mobile OTP authentication**: 6-digit OTP hashed with HMAC-SHA256, 5-minute expiry, 45s resend cooldown, 5-attempt lockout, hourly rate limits, anti-enumeration responses, and MSG91 + development-only console adapter.
- **Table & seat inventory engine**: Per-(date, slot) availability calculated from active `DiningTable` documents, configurable dining duration and turnaround buffer, best-fit single table or combination-group allocation, atomic `SlotLock` unique index to prevent double-booking under concurrency, and automatic pending-hold expiry.
- **Full booking lifecycle**: `PENDING → CONFIRMED → CHECKED_IN → SEATED → COMPLETED` plus `REJECTED`, `CANCELLED`, `NO_SHOW`, and `EXPIRED`, with immediate seat release on terminal states.
- **Owner/Manager console (`/admin`)**: Overview KPIs & setup warnings, Recharts analytics (daily/weekly/monthly, status, popular times, party size, sources, cancellation rate), bookings & CSV export, employee management & activity logs, table inventory & live occupancy grid, menu & category CRUD with image uploads, website CMS, reservation/notification settings, and immutable audit logs.
- **Staff portal (`/staff`)**: Mobile-first queues (`New`, `Today`, `Upcoming`, `Checked-in`, `Seated`, `Completed`, `Cancelled`), confirmation dialogs with mandatory cancellation/rejection/no-show reasons, walk-in & phone bookings, customer notes, and phone lookup.
- **Real-time updates**: Cookie-authenticated Socket.IO rooms (`staff`, `owner`) broadcasting `booking:new`, `booking:updated`, and `availability:changed`.
- **Notifications**: WhatsApp Business Cloud API + Email (Resend) adapters with delivery logging and exponential-backoff retry jobs.Customer messages only claim confirmation when status is `CONFIRMED`.

---

## Project Structure

```
blue-nile/
├── client/                 # React 19 + Vite + Tailwind CSS v4 frontend
│   ├── public/             # robots.txt, sitemap.xml, SVG fallback illustrations
│   ├── src/
│   │   ├── components/     # ui/ (public) & dashboard/ (owner/staff)
│   │   ├── context/        # AuthContext, SettingsContext, SocketContext
│   │   ├── hooks/          # useSettings, useAsync
│   │   ├── layouts/        # PublicLayout, DashboardLayout
│   │   ├── pages/          # public/, customer/, owner/, staff/
│   │   ├── routes/         # AppRoutes.jsx
│   │   ├── services/       # Axios API client (CSRF + silent refresh)
│   │   ├── styles/         # index.css, dashboard.css
│   │   └── utils/          # Date/time/price formatters
│   └── vercel.json
├── server/                 # Node.js + Express 5 + Mongoose 9 API & Socket.IO
│   ├── config/             # Zod env validation, MongoDB connection, Cloudinary
│   ├── controllers/        # auth, reservation, staff, admin, table, menu, public
│   ├── jobs/               # Hold expiry, reminders, notification retry cron jobs
│   ├── middleware/         # JWT+CSRF auth, RBAC, Zod validation, rate limits, upload
│   ├── models/             # User, StaffProfile, Reservation, DiningTable, SlotLock, etc.
│   ├── routes/             # /api router
│   ├── scripts/            # seedOwner.js, seedDefaults.js
│   ├── services/           # auth/, booking/, seating/, notification/, auditService
│   ├── sockets/            # Socket.IO server & emitter
│   ├── tests/              # Vitest + Supertest integration & unit suites
│   ├── app.js
│   └── server.js
├── docs/API.md
└── .env.example
```

---

## Local Setup & Running

### 1. Environment variables

Copy `.env.example` to `.env` in `blue-nile/` (or `blue-nile/server/.env`) and fill in your values:

```bash
cp .env.example .env
```

- In `development`, if `MONGO_URI` is left blank, the server automatically starts a local embedded MongoDB instance in `server/.data/mongo` so you can run the project out of the box. In `production`, `MONGO_URI`, `JWT_SECRET` (≥32 chars), and `JWT_REFRESH_SECRET` (≥32 chars) are strictly required.
- Set `OTP_PROVIDER=dev` in development to log OTP codes to the server console (and return `devOtp` to the UI). In production, configure `OTP_PROVIDER=msg91` with `OTP_API_KEY`, `OTP_SENDER_ID`, and `OTP_TEMPLATE_ID`.

### 2. Install dependencies

```bash
cd blue-nile/server && npm install
cd ../client && npm install
```

### 3. Seed default categories & the initial Owner account

```bash
cd blue-nile/server

# Seed default settings, 8 menu categories, and unpriced draft dishes:
npm run seed:defaults

# Create the initial Owner account (one-time; requires SEED_OWNER_* in .env):
SEED_OWNER_NAME="Owner" SEED_OWNER_EMAIL="owner@bluenile.in" SEED_OWNER_PASSWORD="StrongPassword123" npm run seed:owner
```

> Note: Per content rules, no table capacity or menu prices are invented by the seed script. Log into `/admin` to add your physical dining tables (`Seating & Tables`), verify opening hours (`Website Content`), and enter verified dish prices (`Menu`).

### 4. Start development servers

```bash
# Terminal 1 — API & Socket.IO on http://localhost:5000
cd blue-nile/server
npm run dev

# Terminal 2 — Vite React client on http://localhost:5173
cd blue-nile/client
npm run dev
```

---

## Testing & Verification

```bash
# Run all 37 backend unit & integration tests (OTP, RBAC, booking lifecycle, concurrency locks, Socket.IO):
cd blue-nile/server
npm test

# Lint and production-build the React frontend:
cd blue-nile/client
npm run lint
npm run build
```

---

## Deployment

1. **Database (MongoDB Atlas)**: Create a cluster, whitelist your backend host, and set `MONGO_URI`.
2. **Backend (Render / Railway / Node host)**:
   - Root directory: `blue-nile/server`
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment: set all variables from `.env.example` with `NODE_ENV=production` and `CLIENT_URL=https://your-frontend-domain.vercel.app`.
3. **Frontend (Vercel)**:
   - Root directory: `blue-nile/client`
   - Build command: `npm run build` / Output: `dist`
   - Environment: `VITE_API_URL=https://your-api-host.example.com/api` and `VITE_SOCKET_URL=https://your-api-host.example.com`.
