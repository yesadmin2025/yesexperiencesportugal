# Integration audit + Studio Pass 2C plan

Read-only. No code, DB or deployment changes were made in this turn.

## Part A — Integration audit (latest main, `a03d29b2d`)

Verified by static reads plus targeted test runs:

- `src/lib/checkout/__tests__/*`, `tour-operating-rules-gate`, `availability-date-parity`, `instant-booking-copy-truth`, `public-itinerary-winery-pool` — **82/82 passed**
- full Studio V3 component suite — **838/838 passed (96 files)**

Contract-by-contract:

| # | Contract | Status |
|---|---|---|
| 1 | `RHYTHM_STOP_COUNT` slow 3 / balanced 4 / full 5 / immersive 6 (`curation.ts:348`) | Intact, expressive |
| 2 | Living Day reorder/swap/remove/undo is route authority into reveal → checkout → snapshot (`resolveAuthoritativeRouteStops` in `StudioV3.tsx`, guarded by `studio-checkout-route-truth.test.ts`) | Intact |
| 3 | Instant bookability; no post-payment manual-confirmation copy (`INSTANT_CONFIRMATION` reused in the composing overlay) | Intact |
| 4 | Unresolved public winery pools generic via `publicItineraryProjection.ts`; fixed/core names preserved | Intact |
| 5 | Checkout enforces operating rows when present, fails closed on lookup/malformed, no row = no restriction, Studio keeps its independent 3-day gate | Intact |
| 6 | Client `computeMinDateISO` and `_shared/tour-operating-rules.ts` both use elapsed hours resolved to a Europe/Lisbon calendar date | Intact, parity test present |
| 7 | Server owns add-on price/label/duration; structurally invalid known add-on rejected 409 before Stripe; dynamic feasibility stays UI-side | Intact |
| 8 | No `payment_method_types`, no `wallet_options`, no CardElement | Intact |
| 9 | Tailor commercial rules untouched | Intact |
| 10 | No supplier-name leaks in Studio/checkout/snapshot/email/public pools | Intact |

**No contradictions or regressions found.** No severity-ranked issues to report.

## Part B — Pass 2C: let the Living Day carry the feedback

### What exists today

Every meaningful choice routes through `playReaction()` in `StudioV3.tsx`, which sets `exiting`, waits 220 ms, swaps phase underneath, then holds a full-screen cinematic overlay:

| Beat | Handler | Requested hold | Effective cap |
|---|---|---|---|
| Feeling | `onFeeling` | 4400 | 1400 |
| Direction | `onDestination` | 4700 | 1400 |
| Company | `onCompanions` | 5100 | 1400 |
| Occasion | `onOccasion` | 5100 | 1400 |
| When | `playDateReaction` | 4700 | 1400 |
| Moments (map beat) | `continueFromInterests` | 6200 | 2600 |
| Moments (image fallback) | `continueFromInterests` | 4600 | 2200 |
| Care | `continueFromConsiderations` | 4200 | 1400 |
| Rhythm / Investment | `pickAndAdvance` beats | — | 2200 / 1400 |

Findings:

- Seven to nine blocking overlays per session, each ~0.4 s pre-delay + 0.22 s exit + hold. That is roughly 12–16 s of interstitial across one Studio run — the main source of "questionnaire with cutscenes" feel.
- Low-value repetition: **Occasion**, **Care** and **When** beats say nothing the Living Day panel and summary do not already show. The Care beat in particular renders a fixed aphorism plus "Nothing to adjust." for the most common (empty) answer.
- Genuinely valuable beats: **Feeling** (first emotional commitment), **Moments map beat** (first time the route appears), and the **Director's Read** at Logistics (already acknowledge-once, already gated by signature).
- Acknowledgement is already deduplicated by `studioAcknowledgement.ts`, so no double-echo bug — but the refinement/logistics summary line restates chips the Living Day already displays.
- `LivingJourneyPanel` re-derives from state each render, so it already reflects a choice instantly; the overlay simply hides it while it changes.
- Reduced motion already short-circuits `playReaction` entirely and advances immediately — that path must stay the reference behaviour.
- At 393 px the overlay is the only feedback surface while it is up; removing a beat is safe only if the Living Day panel is visible on the destination phase (it is, except where `livingDayHidden`).

### Proposed Pass 2C (narrow)

1. **Introduce a beat tier in `StudioV3.tsx`.** Add a small local classifier (`beatTier(kind) => "cinematic" | "whisper"`).
   - `cinematic` (unchanged, keeps overlay): `feeling`, `map-beat`.
   - `whisper` (no overlay): `destination`, `who`, `occasion`, date, `considerations`, and the interests image fallback.
2. **Whisper path.** `playReaction` for a whisper beat skips the overlay, advances immediately (same code path reduced-motion already uses), and instead sets a short-lived transient line consumed by `LivingJourneyPanel` as an inline caption/highlight — reusing the existing derived-feedback slot added in Pass 2A rather than a new component.
3. **Living Day as the feedback surface.** On a whisper choice, the panel briefly highlights the element the choice changed (direction pill, party scope, rhythm/timeline density) with the existing 12–16 px fade/translate motion tokens. No new animation vocabulary, no parallax, no spring.
4. **Trim the residual acknowledgement line.** On the `logistics` surface only, suppress `renderAcknowledgement` when the Living Day panel is visible and already displays those same signals; keep it when the panel is hidden and keep the `refinement` surface untouched. `studioAcknowledgement.ts` itself is not modified.
5. **Cinematic holds unchanged.** Feeling 1400 ms, map beat 2600 ms — the reveal stays text-first.

Explicitly out of scope: curation, route authority, `RHYTHM_STOP_COUNT`, pricing, checkout, persistence, analytics event/keys, Tailor, Signature pages, new screens or questions.

### Files to edit

- `src/components/studio-v3/StudioV3.tsx` — beat tier, whisper branch inside `playReaction`, transient signal plumbing, logistics acknowledgement gate.
- `src/components/studio-v3/LivingJourneyPanel.tsx` — render the transient caption/highlight (presentation only).

### Tests

- New `studio-p2c-beat-tiers.test.tsx`: whisper choices advance phase with no overlay and no added timer; cinematic beats still render; reduced motion still skips everything; analytics `trackStep` still fires the same `continue` payload for every choice.
- Extend the P2A Living Day test: after a whisper choice the panel shows the updated state and the transient highlight clears.
- Update any existing assertion that expects an overlay on Occasion/Care/When.
- Re-run Studio suite, `studio-checkout-route-truth`, TypeScript, and a 393 px smoke.

### Risks

- Existing e2e specs may wait on overlay timings for the demoted phases (`studio-v3-pacing`, `studio-v3-intro-to-investment`) — these need auditing and possibly relaxing, not rewriting.
- Whisper transitions feel abrupt if the destination phase hides the Living Day; mitigation is to keep the overlay whenever `livingDayHidden` is true for the next phase.
