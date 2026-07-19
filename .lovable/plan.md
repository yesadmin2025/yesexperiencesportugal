## Scope

Two parallel tracks:

**Track A — Finish the booking-flow work already in flight** (the "go ahead" items still open from the last batch)

**Track B — Run the ULTRA LOW-CREDIT VISUAL UX AUDIT** (audit only, no code changes, no deploy)

---

## Track A — Close out booking-flow leftovers

From the last turn, two items were explicitly not shipped:

1. **Analytics wiring for the Tailor flow + sticky bar**
   - Add the 8 GA4 funnel events (already defined in `src/lib/analytics-ga4.ts`) to `src/routes/tours.$tourId.tailor.tsx` and its sticky "Reserve" bar:
     - `tailor_cta_click`, `tailor_date_selected`, `tailor_composition_changed`, `tailor_addon_toggled`, `tailor_validation_blocked`, `tailor_drawer_opened`, `tailor_drawer_submitted`, `tailor_sticky_reserve_click`.
   - No visual change. No pricing change.

2. **Per-tour operating-days table (availability truth)**
   - New Supabase table `public.tour_operating_rules` with columns: `tour_id text pk`, `weekdays int[]` (0–6), `blackout_dates date[]`, `min_lead_hours int default 24`, `cutoff_local_time time`, `updated_at timestamptz`.
   - GRANTs: `select` to `anon, authenticated`; `all` to `service_role`. RLS on. Public read policy (rules are non-sensitive).
   - Read helper in `src/lib/availability.functions.ts` (`getOperatingRules(tourId)`), consumed by `SimpleBookingForm.tsx` and the Tailor date picker to:
     - disable non-operating weekdays,
     - disable blackout dates,
     - enforce `min_lead_hours` (currently hard-coded 24h),
     - respect same-day cutoff.
   - Seed rows for the 6 Signature tours from the current Viator operating schedules (source-of-truth rule).
   - Fallback: if no row exists for a tour, keep today's 24h lead-time behavior (no regression).

Nothing else in Track A. No copy, palette, or Studio changes.

---

## Track B — Visual UX & Design Consistency Audit (READ-ONLY)

Inspect https://yesexperiencesportugal.com per the brief. No file edits. No deploy.

### Method (credit-minimal)
- Drive Playwright via shell against the live production URL at 5 viewports (390 / 430 / 768 / 1024 / 1440).
- Capture element-scoped screenshots (never full-page) only where a finding needs visual evidence.
- Reuse one screenshot per shared component across the routes that use it — do not re-shoot the same header/footer/card per page.
- Read shared component source (`Navbar`, `SiteLayout`, `EditorialCard`, `SectionTitle`, `CtaButton`, `Eyebrow`, `GuestMomentsStrip`, `SignatureRouteMap`, `TourReviews`, `SimpleBookingForm`, tour + tailor routes) to attribute each finding to shared vs page-specific.
- Programmatic contrast check via Playwright: sample computed `color` + effective background for text nodes on each route and flag pairs < 4.5:1 (or < 3:1 for large text).
- `prefers-reduced-motion` pass: re-load 2 representative routes with the emulated preference and confirm motion is suppressed.

### Routes inspected
`/`, `/about`, `/experiences`, `/day-tours`, `/studio-v3`, `/multi-day`, `/corporate`, `/proposal-in-portugal`, `/local-stories`, one Local Story leaf, `/tours/arrabida-wine-allinclusive`, one additional Signature leaf, `/contact`, `/faq`.

### Deliverable
A single audit report saved to `docs/visual-ux-audit-2026-07.md` (no source files touched) containing:

1. Findings table with columns: severity · route · viewport · component · issue · evidence (screenshot path) · likely source · recommended correction · scope (Tiny/Small/Medium/Structural).
2. Groupings: Contrast · Typography · CTAs · Spacing & layout · Component consistency · Animations & interactions · Accessibility · Mobile-specific · Desktop-specific.
3. Top 10 highest-impact corrections.
4. Quick wins on shared components.
5. Page-specific issues.
6. Items requiring owner/design decision.
7. Components that should become a single source of truth.
8. Confirmation: no files changed, nothing deployed.
9. Final status: `VISUAL SYSTEM CONSISTENT` | `VISUAL POLISH REQUIRED` | `SIGNIFICANT UX INCONSISTENCIES FOUND`.

### What's missing / risks to flag now
- **Report file location.** The brief says "no files". I'll write only the report markdown under `docs/` (no source, no config). Say the word if you'd rather I return it inline in chat with zero disk writes.
- **Live production vs preview.** Auditing production means findings may already be one deploy behind the codebase. I'll note per-finding whether the current repo already fixes it.
- **Language coverage.** The brief mentions EN/PT/ES/FR wrapping. The live site currently ships EN + PT surfaces; ES/FR will be marked "not present on live — skipped".
- **Cookie banner / sticky overlap check** requires an interaction pass; included in method above.

---

## Order of execution
1. Track A #1 (analytics wiring — no schema, ~15 min).
2. Track A #2 (operating-days table + seed + wiring).
3. Track B audit report.

Nothing in Track A alters visuals, so it won't invalidate the Track B findings.