# Simplify the guide and admin calendars

## Goal

Make both calendars easy to scan and use on a phone, while preserving current assignments, availability, conflict protection, and booking logic. Create an app for guides to dowioad 

## Changes

- Give both calendars the same clear month header, large previous/next controls, a Today shortcut, and a selected-day summary.
- Guide calendar: make every date selectable, show a simple day-status marker, and list that day's tour or availability below the month. Tour days open the tour details from the day summary.
- Admin calendar: reduce the colour coding to clear labels, make booked counts easier to read, and show selected-day tours as actionable rows with assignment status and a direct Operations link.
- Simplify the admin mobile menu so the primary work areas remain visible without squeezing eight items into one row; secondary destinations move into a compact More menu.
- Keep the existing real-time data, guide privacy, booking availability, pricing, payments, and assignment rules unchanged.

## Verification

- Check guide and admin calendars at 393px and desktop widths.
- Confirm month navigation, Today, date selection, tour-detail links, and Operations links work.
- Confirm no clipping, overlap, runtime errors, or build errors.

## Technical details

- Reuse the existing calendar data and routes; this is a presentation and navigation simplification only.
- Use existing semantic tokens and shared Button controls; no database migration or booking-logic change.