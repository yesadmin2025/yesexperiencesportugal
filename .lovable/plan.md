# Current preview audit — no changes made

## A. What is correct

### Guide App and Admin
- Guide access is scoped to the signed-in guide by database policies and guide-specific functions. The browser session available for this audit is the owner/admin guide account, so cross-account isolation was confirmed from enforcement rules rather than by impersonating Margarida, Pedro, or Nuno.
- Mobile navigation matches the intended priority: **Today, Calendar, Tours, More**. More contains **Availability, Alerts, Profile** and shows the unread-alert count.
- The Guide calendar has previous/next controls, Today, selectable 44px day cells, Tour/Available/Unavailable markers, and a selected-day summary below.
- Tour entries link to `/guide/tours/{assignmentId}` from Today, Tours, and calendar day details.
- The Admin Tour Calendar has the month view, Free/Booked/Full key, booking counts, selected-day details, Assigned/Needs guide status, and an Open Operations action.
- Availability remains editable in **More → Availability**, including date ranges and weekly patterns. The calendar itself is view-only.
- Assignment overlap protection remains enforced in the database; guides cannot mark an assigned period unavailable. Live listeners remain active for assignments, notes, and alerts.
- The Guide App has its own manifest, standalone display settings, icons, service-worker registration, and an Install Guide App control with iPhone instructions.
- At 393px and 1280px, the signed-in Guide calendar, Availability page, Admin calendar, public Guide sign-in, and About page showed no horizontal overflow or browser console errors.

### Public About page
- The founder-led story is present in the requested order: childhood travel and living abroad; grandparents and storytelling; Portuguese history, culture, food, and traditions; showing friends “my Portugal”; entering tourism through a tour-operator friend; starting alone as a single mother with one car and a couple of tours weekly; rejecting standard tours; Studio; Travel Designer; YES today; closing philosophy.
- Nídia’s existing project image is visible, responsive, captioned, and not replaced by stock imagery.
- The primary actions resolve correctly: **Design your day → `/studio`** and **Design my journey → `/contact?type=multi_day`**.
- The final trust area reads registration, tax number, address, email, phone/WhatsApp, cancellation wording, and the verified rating label from shared site settings.
- There is one page H1. Story chapters and trust heading use H2; trust subsections use H3.
- Canonical, language alternatives, social metadata, breadcrumb data, and founder data remain present.
- The corrected teal closing chapter has readable light text. No overflow or persistent clipping appeared at either width. The initially truncated screenshot was a mid-animation capture; an isolated reduced-motion check showed every paragraph at full width and opacity.

## B. Not exactly as planned
- On desktop, the Guide App deliberately remains a narrow phone-style app with the fixed bottom navigation. It is usable and unclipped, but it does not become a desktop-specific back-office layout.
- The Admin calendar’s **Open Operations** action opens the Operations area generally; it does not carry the selected date or booking into a pre-filtered Operations view.
- The current available guide account had no tour on the selected day, so the actual calendar-to-tour tap could not be exercised with live data. The rendered link path and all three source entry points are correct.
- Founder structured data spells the name **“Nidia Almeida”** without the accent used visibly as **“Nídia Almeida.”** This is a small metadata inconsistency.

## C. Bugs and tests
- No runtime or console errors were observed in these checks.
- The focused About structure check passed: **5/5**.
- No failing or clearly outdated test was found.
- There is no dedicated automated test covering the shared month calendar, the Guide More menu, selected-day actions, or Admin booking-status rows. Those flows currently rely on browser/manual verification.

## D. Readiness
- **Guide/Admin: ready to publish**, with two non-blocking qualifications: desktop remains intentionally phone-like, and the Operations link is not pre-filtered. A real guide account with an assigned tour is still needed for a final live cross-account/realtime phone test.
- **About: ready to publish.** The visible page, story order, image, actions, trust content, metadata, semantics, contrast, and responsive layout pass the current audit. The missing accent in founder metadata is non-blocking but worth correcting in a later authorized edit.

No files were changed and nothing was published.
