# Admin simplification — audit and plan (no code changes yet)

## 1. How the admin is organised today

```text
/admin (overview, admin.index.tsx ~1,090 lines)
  3 summary tiles · Latest bookings table · Payment webhook health widget
  AdminNavIndex: 5 groups, 47 separate admin screens linked
/admin/bookings (admin.bookings.index.tsx)
  Toggle: "Operations" | "Day view"
   Operations -> OpsBookingsHub: 5 tabs
     List · Calendar · Needs review · Reconciliation · Sources
     + 6 filters (date, channel, status, payment, guide, tour) + search
     + OpsBookingDetail drawer (Customer, Booking, Payment, Choices,
       Operations, Guide briefing, Ingestion history)
   Day view -> BookingsAvailabilityCalendar + CalendarSubscribePanel
     + PaidSalesSummary + date-bucket lists
/admin/bookings/$id (separate full page, ~500 lines, "frozen snapshot")
/admin/guides, /admin/availability, /admin/enquiries, /admin/emails,
/admin/webhook-events, /admin/payments-env (all separate)
```

Where the confusion comes from:
- Two calendars (Ops Calendar tab and Day view calendar) and two booking lists (Ops List and Day view buckets).
- Two booking detail surfaces (the drawer and `/admin/bookings/$id`) showing overlapping fields.
- Three places for money/health: overview tiles, PaidSalesSummary, webhook health widget.
- Machine plumbing shown as main tabs: Reconciliation and Sources (Gmail scans, dry runs, Bókun, and now WhatsApp) sit next to List/Calendar.
- 47 screens in the nav, most of them SEO, audits and diagnostics the owner rarely needs.
- Filters are always visible (6 selects) even when the owner just wants "today".

## 2. Overloaded or duplicated pieces

| Component | Problem |
|---|---|
| `OpsBookingsHub.tsx` | 5 tabs + 6 filters; mixes daily work with system tools |
| `admin.bookings.index.tsx` | Second parallel UI ("Day view") duplicating the hub |
| `OpsBookingDetail.tsx` vs `admin.bookings.$id.tsx` | Same booking, two layouts |
| `OpsIntegrationsPanel.tsx` + `OpsWhatsAppPanel.tsx` + `OpsReconciliationPanel.tsx` | Three technical panels, many buttons (dry run 30/120, import, preview, apply) |
| `admin.index.tsx` | Tiles, tables, webhook widget and a 47-link index on one page |
| `AdminNavIndex.tsx` | Flat link wall, no priority |
| `badges.tsx` | Up to 4 pills per row (channel, status, payment, guide) — visual noise |

## 3. Proposed structure — four sections

```text
Today        (home: what needs me, today and next 7 days)
Bookings     (all trips: list + calendar in one view, drawer detail)
Guides       (directory + assignments; brief sending lives in the drawer)
Settings     (everything else, grouped and collapsed)
   Connections & automation  (Gmail, WhatsApp, Bókun, payments, reconciliation)
   Prices & experiences      (pricing, catalogue, photos, source of truth)
   Reviews
   Search & visibility       (SEO, domains, GBP)
   Diagnostics               (error log, tests, audits, drift, funnels)
```

All existing addresses keep working; only the menu and landing change.

## 4. The Today screen

Top to bottom, one column on iPhone, two on desktop:

1. One status sentence: "3 trips today · 1 needs a guide · everything else is running." Green/quiet when fine, gold when there is something to do.
2. Needs you (only if not empty), max 5 rows, each one action:
   - trip in the next 7 days without a guide -> Assign
   - trip missing date, pickup or tour -> Complete
   - Needs Review items (email or WhatsApp ambiguity) -> Decide
   - guest cancellation/refund request on a paid trip -> Refund
   - automation failing (Gmail scan, webhook, WhatsApp) -> one line, links to Settings
3. Today and tomorrow: compact timeline (time · tour · guests · pickup · guide initials).
4. Next 7 days: a single line per day with trip count; tap opens the day.
5. A small footer line: paid this month and bookings count (replaces the tile rows).

Each row opens the same drawer. No tables, no filters on this screen.

## 5. Automatic vs visible

Runs quietly in the background (unchanged): 15-minute Gmail scan, internal notification enrichment, Stripe webhook, WhatsApp receiver and matching, duplicate protection, confident-match enrichment.

Shown to the owner only as exceptions: ambiguous matches, missing operational facts on upcoming trips, missing guide, cancellation/refund on a paid trip, any automation that has not succeeded in over an hour.

## 6. Kept, but behind "More" or Settings

- Dry-run / import / preview / apply buttons -> Settings > Connections (one "Run now" per source, dry run inside an "Advanced" disclosure).
- Reconciliation report and per-row evidence -> Settings > Connections > History; in the drawer as a collapsed "Where this came from".
- Ingestion history, raw source links, WhatsApp messages -> collapsed drawer sections.
- Full filters -> a single "Filter" button on Bookings.
- Calendar subscribe, sales summary -> Bookings "More" menu.
- Channel/payment pills -> one pill per row; channel shown as a small text label.
- `/admin/bookings/$id` -> becomes a full-page version of the same drawer component.

## 7. Phases

Phase 1 — layout only (no data or server changes)
- New `AdminShell` with 4-item nav (sidebar desktop, bottom bar iPhone); rework `AdminNavIndex` into the grouped Settings page.
- New Today route using existing server functions from `bookingsOps.functions.ts` (list, review count, integration status).
- Bookings: merge list + calendar into one view inside `OpsBookingsHub`; remove the "Day view" toggle in `admin.bookings.index.tsx`; move Reconciliation/Sources tabs to Settings > Connections, reusing `OpsIntegrationsPanel`, `OpsWhatsAppPanel`, `OpsReconciliationPanel` unchanged.
- Drawer: reorder `OpsBookingDetail` into Essentials (always open) + collapsed sections.

Phase 2 — one detail surface
- Make `admin.bookings.$id.tsx` render the drawer component full-page; retire the duplicate layout.
- Simplify badges to one status pill.

Phase 3 — exceptions engine
- One read-only server function returning the "Needs you" list (computed from existing columns: guide, review flags, missing fields, integration_state freshness). No new tables needed.

Phase 4 — polish and checks
- iPhone (393px) and desktop visual pass, reduced-motion, 44px targets; update admin smoke tests.

Separately: finish the pending WhatsApp admin wiring (drawer conversation section, badge) inside the new structure rather than adding another tab.

## 8. Risks to avoid

- Gmail cron: job 528 calls `/api/public/hooks/gmail-booking-scan`. Do not rename or move that route or change its secret check.
- Stripe authority: do not touch `stripe-session-status`, `create-builder-checkout`, the Stripe webhook, or refund actions (`cancelAndRefundBooking`); the UI only links to them.
- Reconciliation: keep `stripe-voucher-reconcile.server.ts`, parsers and `integration_state` ids (`gmail_bookings`, `whatsapp_*`) unchanged; panels move, their calls do not.
- Guide assignment: keep the existing update server function and `assigned_guide_id`; the drawer is the only editor.
- WhatsApp receiver path `/api/public/whatsapp/webhook` is a fixed contract.
- Admin access: every new screen stays behind the existing admin role check; the Today function must use the same `assertAdmin`.
- Old links: keep all 47 addresses reachable (Settings links) so bookmarks and email links don't break.
- Nothing is published until you approve.
