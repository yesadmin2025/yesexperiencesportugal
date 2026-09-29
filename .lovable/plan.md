# Operations Calendar + Guide App (v1)

An addition to the current system. Checkout, public site, Stripe, Studio and current Admin pages keep working unchanged. Bookings stay the single source of truth — no second booking system.

## What already exists (reused)
- Bookings table with date, start time, pickup, guests, language, client notes, operational notes and an `assigned_guide_id`.
- Guides table (name, email, phone, notes, active) managed in Admin → Guides.
- Admin roles table and sign-in.
- Current guide briefing email + WhatsApp prefill on the booking detail.

## What you will get

### Admin — /admin/operations
- **Dashboard**: Today / Tomorrow, unassigned tours, unconfirmed assignments, conflicts and alerts ("Needs attention").
- **Master calendar**: day / week / month, every booking colored by status (unassigned, assigned, confirmed by guide, changed, cancelled), filter by guide or tour.
- **Assign / reassign / remove guide** from a booking: only guides free for that time window are offered; busy or unavailable guides are shown greyed with the reason.
- **Hard conflict prevention** enforced by the backend: a guide can never hold two overlapping tours, even if two admins click at once.
- **Guide availability**: see and edit each guide's availability, including recurring weekly patterns and vacations.
- **Operational notes / special requests** per booking with priority (normal, important, critical) and "notify guide".
- **Notification status**: sent, delivered, read, confirmed — with a Resend button.
- **Activity log**: who assigned, reassigned, edited notes, confirmed, when.

### Guide App — /guide (installable on the phone home screen)
- Secure sign-in with the guide's own email (invited by you from Admin → Guides).
- **Today**: what, what time, pickup, how many guests, special requests, what changed.
- **Calendar**, **My Tours**, **Tour details** (no prices, payments, revenue or other guides' data).
- **Confirm assignment** and **Report an issue**.
- **Availability**: set free / unavailable / vacation / partial and recurring weeks. Days with an assigned tour are locked — a guide cannot drop a tour by changing availability; they must use Report an issue.
- **Notifications** and **Profile** (phone, WhatsApp, languages, vehicle).

## Delivery phases
1. Database and permissions (below), plus a new "guide" role.
2. Admin Operations: dashboard, calendar, assignment with conflict checks, availability editor, notes, activity log.
3. Guide App: sign-in, Today, Calendar, My Tours, details, confirm, report issue, availability, profile, installable.
4. Notifications: in-app + email on new assignment, change, removal and important notes; confirmation tracking and resend. WhatsApp stays a prefilled message you send (no automatic WhatsApp sending in v1).
5. QA at 393px and desktop, including a guide trying to open another guide's tour (must get "not found"). Preview only; publish when you ask.

## Assumptions to confirm
- Each tour's end time = start time + the tour's published duration (8 h for full days unless the tour says otherwise). If a booking has no start time, it blocks the guide's whole day.
- Guides only see a booking's guest first name, guest count, ages, language, pickup, and notes — never email, payment or totals. Guest phone is shown only on the tour day (or never, if you prefer).

## Technical details
- New role value `guide` added to the existing role list; `guides.user_id` links a guide to their login. Guide login via invite email (magic link / password set).
- New tables (all with grants + row-level security): `guide_availability`, `guide_recurring_availability`, `tour_assignments` (booking_id, guide_id, start/end, status, viewed_at, confirmed_at, removed_at), `operational_notes`, `ops_notifications`, `operational_activity_log`. Additive columns on `guides` (whatsapp, languages, vehicle_available, vehicle_capacity).
- Overlap protection via a database exclusion constraint on active assignments per guide (time range), so conflicts are impossible regardless of the UI.
- Existing `bookings.assigned_guide_id` kept in sync from `tour_assignments` by trigger so current Admin pages and the briefing email keep working.
- Guides never read `bookings` directly: a secure database function returns only their own assigned tours with a safe column list. Assignments, notes and notifications scoped to the signed-in guide by policy.
- Admin writes go through authenticated server functions that check the admin role; every change writes an activity-log row.
- Existing data preserved; migration is additive only (no drops).
