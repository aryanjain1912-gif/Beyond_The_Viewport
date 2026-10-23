# Mystic Sanctum

**Team Beyond The Viewport (Team ID 76)** · Webster 2026 · MNNIT Allahabad (CodeSamgam)

**Live site:** [Mystic Sanctum](https://mystic-sanctum.vercel.app)

Mystic Sanctum is a full-stack refectory and meal-management application for **The Kamar-Taj Refectory**. Students can browse menus, record dietary preferences, reserve and cancel meals before cutoffs, and present one-use meal passes. Staff can verify passes at the counter, including queued scans captured during a network outage. Administrators can manage menus, schedules, roles, reports, and manual rebate ledger entries.

## Tech stack

- Next.js App Router (JavaScript) and regular CSS
- Supabase Auth and PostgreSQL with row-level security
- `qrcode.react` for passes and `html5-qrcode` for camera scanning
- Browser service worker and local storage for the offline scan queue

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project. In **Project Settings → API**, copy the project URL and publishable key.

3. Copy `.env.example` to `.env.local` and set:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-project-publishable-key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   Do not put a Supabase secret/service-role key in a `NEXT_PUBLIC_` variable or in client code. This application uses the publishable key with authenticated, row-level-security-protected requests.

4. In the Supabase SQL Editor, run the SQL files in [`supabase/migrations`](./supabase/migrations) in chronological order. The initial migration creates the role-aware schema, RLS policies, booking/pass/check-in database functions, default meal slots, and clearly marked sample menus. The menu-dishes migration adds individual dish cards and preserves existing menu items.

5. In **Authentication → URL Configuration**, set the Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/confirm` to the redirect URL allow list. For a deployed site, set `NEXT_PUBLIC_SITE_URL` to its HTTPS origin and add the matching `/auth/confirm` URL to the allow list.

6. Run the app:

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>. The public home page explains the setup state if the Supabase environment values are missing.

### First administrator and staff accounts

Open student registration creates student accounts only; a submitted role is never accepted from the browser. Create and confirm your account first, then use the Supabase SQL Editor to promote that account to the first administrator:

```sql
update public.profiles
set role = 'admin'
where email = 'your-confirmed-admin@example.com';
```

Sign in again. From **Accounts & roles**, promote trusted registered accounts to `staff` or `admin`. The first administrator must be promoted through the SQL Editor because no administrator exists yet to grant that role. Database policies prevent users from granting themselves a role.

If email confirmation is enabled in Supabase Auth, confirm the signup email before promotion and sign-in. Set the Supabase redirect allow list as described above.

## How it works

- **Student dashboard:** role-protected student pages for current menus, meal bookings, dietary preferences, booking/check-in history, one-use passes, and the rebate ledger.
- **Booking cutoffs:** bookings and cancellations are performed by PostgreSQL functions that check role, published menu, date, and cutoff in `Asia/Kolkata`. Client-side time displays are informational only.
- **Meal passes:** each pass is a high-entropy, one-use token; only its SHA-256 hash is stored. The database issues passes only for a confirmed booking and rejects expired, revoked, duplicate, or out-of-window check-ins atomically. Check-in is allowed only from the scheduled meal start through its scheduled end.
- **Staff scanning:** camera scans and manual pass-code entry use the same server-verified check-in function. Successful checks create a unique attendance record.
- **Offline queue:** in a production build, open `/offline-scan` while online to cache its app shell and scanner assets. During a network outage, scans can be queued in that browser’s local storage. After reconnecting, staff sign in and choose **Sync queue**. A queued scan is not attendance until the server validates it, and the server accepts it only during the scheduled meal window. This queue is device-local and is not shared between staff devices.
- **Admin tools:** administrators manage menus and meal times, grant roles to existing accounts, set a reference meal allowance, and record student credits/debits. Menu editors can add up to ten dishes per meal, with an optional direct HTTPS photo URL from `images.unsplash.com` for each dish. Rebate entries are bookkeeping only; the app does not process money or issue automatic refunds.
- **Reports:** utilization compares confirmed reservations with verified check-ins. Unclaimed reservations are only a planning signal, not a measurement of physical food waste.

The staff camera needs camera permission and a secure context. `localhost` is considered secure for development; production deployments should use HTTPS. The service worker is enabled only in production builds.

## Validation

```bash
npm run lint
npm run build
```

Live authentication, persistence, and scanner synchronization require a configured Supabase project and the SQL migration above.

## Team

| Member | Branch |
| --- | --- |
| Aryan Jain | CSE |
| Aryan Verma (frontend / UI) | CSE |
| Ayush Kumar | CSE |

All members are first-year students at MNNIT Allahabad.
