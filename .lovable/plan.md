# Booking Page — Bókun Rollout Status Indicator

Add a small, presentational status chip near the top of the booking form that tells you, at a glance, whether the currently viewed tour is running on the new Bókun banded pricing path or still on the legacy per-pax path — and whether an admin needs to act.

## Where it appears

- `src/components/SimpleBookingForm.tsx` — the entry point that already consumes `useTourBokunReadinessFor(tour.id)` and decides which form to render. Render the badge above whichever form is shown so the state is visible in both the legacy and banded flows.
- `src/components/booking/BandedSignatureBookingForm.tsx` — also surface it inside the banded form header (below the "Reserve this day" eyebrow) so it stays visible when only that form is embedded elsewhere.

## States (derived from `TourBokunReadiness`)

Derivation is pure — no new queries, no new endpoints.

```text
enabled       banded_pricing_enabled = true
              AND ≥1 bokun category with confirmed = true
              AND pricing_mode ∈ { flat, date, slot }

review        banded_pricing_enabled = true
              AND (no confirmed categories OR pricing_mode = null)
              → admin needs to confirm category mapping

syncing       banded_pricing_enabled = false
              AND bokun_categories.length > 0
              → synced from Bókun but rollout flag is off (staging)

legacy        banded_pricing_enabled = false
              AND bokun_categories.length = 0
              → running on manual per-pax tiers

unknown       readiness row missing / query error
              → falls back to legacy behaviour, badge shows muted note
```

## Visual (matches existing `ApprovalBadge` chrome)

New file `src/components/booking/BokunRolloutBadge.tsx` — presentational only, mirrors the token usage in `src/components/studio-v3/ApprovalBadge.tsx` (teal outline pill + gold accent for the positive state, muted italic for legacy/unknown). No new colors, no new fonts.

```text
enabled  → teal pill · gold check  · "Live Bókun pricing"        (+ pricing mode as sub-eyebrow: flat / date / slot)
review   → amber pill · alert icon · "Awaiting admin mapping"    (links admins to /admin/pricing#<tourId>)
syncing  → teal pill · dot         · "Bókun synced · rollout off"
legacy   → muted italic            · "Manual pricing"
unknown  → muted italic            · "Pricing status unavailable"
```

The admin deep-link is only rendered when the current user has an admin role (reuse the existing role check already used by `admin.pricing.tsx`); for regular visitors the review state stays informational only ("Live pricing being finalised").

## Files

- New: `src/components/booking/BokunRolloutBadge.tsx`
- Edit: `src/components/SimpleBookingForm.tsx` — render `<BokunRolloutBadge readiness={readiness} />` above the returned form.
- Edit: `src/components/booking/BandedSignatureBookingForm.tsx` — render the same badge inside the header block.

No schema, edge function, hook, or checkout logic changes. Purely a UI/read surface over the existing `useTourBokunReadinessFor` data.
