# PhysioClinic Pro

A production-ready physiotherapy clinic management system with patient records, visit tracking, and dual-ledger accounting.

## Prerequisites

- Node.js 18+
- PostgreSQL 13+ running locally

## Quick Setup

### 1. Create the database
```bash
psql -U postgres -c "CREATE DATABASE physio_db;"
```

### 2. Configure environment
Edit `.env` to match your PostgreSQL credentials:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=physio_db
DB_USER=postgres
DB_PASSWORD=your_password
```

### 3. Install dependencies
```bash
npm install
```

### 4. Start the application
```bash
npm start
```

This runs both the Express API (port 5000) and React frontend (port 3000) concurrently.

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Features

### 🏥 Patient Management
- Add, edit, and search patients
- Unique Patient IDs (PT01001, PT01002, ...)
- Track diagnosis, referring doctor, and clinical notes
- Active/Inactive status

### 📅 Visit Management
- Record therapy sessions with date, time, therapist, type
- Document chief complaint, treatment given, session notes
- Support for 14+ therapy types
- Day view or all-visits view

### 💰 Daily Ledger
- Track all clinic income and expenses
- Cash vs Online / UPI payment distinction
- Income categories: Therapy Fee, Consultation, Package, etc.
- Expense categories: Rent, Salaries, Equipment, Supplies, etc.
- Date-range filtering with running totals

### 📊 Patient Ledger
- Full financial history per patient
- Total charged, total paid, balance due
- Visit-by-visit breakdown
- Payment transaction log

### 📈 Dashboard
- Today's visits and income
- Active patient count
- Monthly income
- Pending balance tracker
- 7-day income/visit chart

---

## Database Schema

Tables: `patients`, `therapy_plans`, `visits`, `patient_payments`, `daily_ledger`

All payment transactions are automatically recorded in both `patient_payments` and `daily_ledger` when a visit is saved.

## Tech Stack

- **Frontend**: React 18, Recharts, Lucide Icons
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (via `pg` driver)
- **Dev**: Concurrently for unified start

