# Mystic Sanctum

**Team Beyond The Viewport (Team ID 76)** · Webster 2026 · MNNIT Allahabad (CodeSamgam)

Mystic Sanctum is our solution to the problem statement **The Kamar-Taj Refectory: Resource Engine & Atomic Meal Check-In**. It is a full-stack mess management platform with automated meal cutoffs and single-use cryptographic QR check-ins.

## Process flow

1. **User login:** separate access for students, mess staff and administrators.
2. **Meal booking:** students view menus, book or cancel meals and set dietary preferences.
3. **Cutoff management:** the system locks bookings after the deadline and generates expected meal counts for the kitchen.
4. **QR check-in:** students receive time-limited QR passes, which staff scan to verify meal eligibility.
5. **Duplicate prevention:** expired, invalid or already-redeemed passes are rejected.
6. **Consumption tracking:** every successful check-in is recorded in the database.
7. **Admin dashboard:** administrators manage menus, schedules, bookings and daily reports.

## Features

### Pass tier (core)

- **Multi-role authentication:** separate login flows and dashboards for students, mess staff and admins.
- **Dynamic menu and preference matrix:** interactive meal calendar to view menus, toggle bookings and save dietary preferences.
- **Atomic cutoff engine:** meal changes are permanently locked once the preparation deadline passes, with real-time countdowns.
- **Short-lifespan QR pass generator:** time-limited, rotating QR codes generated per student.
- **Anti-duplicate verification ledger:** expired, invalid or already-scanned codes are rejected instantly.
- **Real-time attendance ingestion:** consumption records update the moment staff scan a valid pass.
- **Admin control console:** update weekly schedules, edit menus and generate daily reports, including head-count forecasts for the kitchen.

### Victory tier (stretch goals)

- **Offline scan queue:** a service-worker cached scanning client that stores check-ins offline, validates them with HMAC and syncs later.
- **Automated rebate billing:** credit deductions and monthly rebate ledgers.
- **Food waste analytics:** dashboards comparing projected and consumed meals, with surplus alerts.

Priority goes to finishing and testing the Pass tier before starting any Victory-tier work.

## Tech stack

| Part | Choice | License |
| --- | --- | --- |
| Framework | Next.js (React, JavaScript): UI and API routes in one app | MIT |
| Database and auth | Supabase (PostgreSQL, Row-Level Security) | MIT (client SDK) |
| QR generation | `qrcode.react` | ISC |
| QR scanning | `html5-qrcode` | Apache-2.0 |
| Charts (stretch) | Chart.js | MIT |
| Offline (stretch) | Service Workers (browser API) | n/a |

## Architecture

```
[Next.js client UI] --HTTPS--> [Next.js API routes] --query--> [Supabase database]
```

When staff scan a QR code, the app posts the token to a Next.js API route. The route verifies the request and runs a database update in Supabase to mark the meal as redeemed.

### Preventing double meal claims

Checking `is_redeemed` and then updating it in two steps can fail when two scans arrive at nearly the same time. Instead, we validate and update in one atomic statement:

```sql
UPDATE meal_bookings
SET is_redeemed = true
WHERE id = :booking_id AND is_redeemed = false;
```

If the update changes 0 rows, the pass was already used and the scan is rejected. A unique constraint on `(student_id, meal_slot, date)` also blocks duplicate bookings.

## Getting started

```bash
git clone https://github.com/aryanjain1912-gif/Beyond_The_Viewport.git
cd Beyond_The_Viewport
npm install
cp .env.example .env.local   # then fill in the Supabase keys
npm run dev
```

Open http://localhost:3000. Note: camera scanning needs HTTPS (localhost works for development).

## Team

| Member | Branch |
| --- | --- |
| Aryan Jain | CSE |
| Aryan Verma (frontend / UI) | CSE |
| Ayush Kumar | CSE |

All members are first-year students at MNNIT Allahabad.
