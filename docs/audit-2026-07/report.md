# YES Experiences — Audit Report (2026-07-23)

Audit only. Nothing in the codebase was modified. Findings cite exact `file:line`. Companion docs: `pricing-table.md`, `tailor-formula.md`, `studio-findings.md`, `ssot-proposal.md`, `files-to-change.md`.

Severity: **C**ritical · **H**igh · **M**edium · **L**ow.

---

## 1 · Pricing consistency

| ID | Sev | Route / Component | Finding | Repro | Proposed fix |
|---|---|---|---|---|---|
| P-1 | **C** | homepage cards, `experiences.tsx`, product pages | `signatureTours[id].priceFrom` (manually authored) diverges from real `tour_price_tiers` for 5/12 tours. e.g. `wild-beaches-picnic` shows "From €190" but the cheapest bookable tier is €139 (`tour_price_tiers`). See pricing-table.md rows 2, 6, 8, 9, 10. | Load `/experiences`, compare card "From €" to the tier drop-down on the product page. | Compute `fromEur` from SSOT (`ssot-proposal.md`). Remove manual `priceFrom`. |
| P-2 | **C** | `src/routes/tours.$tourId.tailor.tsx:441-464` | Tailor uses flat ±€10/€20 stop deltas + 85%-of-base floor. Ignores tier scale, doesn't implement the 5%-per-principal-removal policy, no `minimumOperationalPrice`. | Load any tailor page, toggle a stop off — see rounded flat delta. | Replace with `priceForTailor` (see `tailor-formula.md`). |
| P-3 | **H** | `src/components/home/PathfinderQuiz.tsx:490` | Hardcoded "From €138" pill outside SSOT. | Homepage → Pathfinder quiz Arrábida pill. | Read from SSOT. |
| P-4 | **H** | Cards vs product | No 15% direct-booking discount is applied anywhere yet — spec is new. | grep `× 0.85` outside tailor. | Implement in SSOT (`ssot-proposal.md`). |
| P-5 | **M** | `sintra-cascais` | Card "From €159" is **below** the real cheapest tier €189 — the guest cannot actually book at €159. | `/tours/sintra-cascais` → open availability, tier data starts at €189. | See P-1. |
| P-6 | **M** | `tour_price_tiers` DB rows | 10 of 12 tours have no tier `1` (solo) — but product page allows 1 guest, silently falling back to "from" anchor. | Choose 1 guest on `arrabida-boat`. | Either add tier 1 rows OR block guests=1 in composition selector. |
| P-7 | **L** | `src/components/SimpleBookingForm.tsx` | Uses `resolvePerPaxEur` directly — will need one-line swap for SSOT. | — | Import SSOT (Phase 2). |

## 2 · Tailor

| ID | Sev | Location | Finding | Fix |
|---|---|---|---|---|
| T-1 | **C** | `tailor.tsx:441-464` | No principal vs descriptive stop classifier — every toggle-able stop earns credit (or none, depending on blueprint). | Add `pricing: 'principal' \| 'descriptive' \| 'included-free'` to `tailorBlueprints.ts`; only `principal` counts. |
| T-2 | **H** | `tailor.tsx` add-on math | Add-ons use `ADD_STOP_DELTA=20` flat instead of the unit-aware `signatureAddOns.ts` amounts already used by Studio V3. | Import `signatureAddOns`; respect `per_group` vs `per_person`. |
| T-3 | **H** | `src/lib/tailored-policy.ts` | `evaluateTailorAdjustment` exists and enforces regional coherence, but the current Tailor route never calls it. | Wire into every stop-swap / add-upgrade action. |
| T-4 | **M** | Age bands + tailor total | `resolveJourneyPricing` is called with `priceFrom: estimatedPrice` — a hack that works but bypasses tier data for age bands. | After SSOT: pass the composed direct price straight in. |
| T-5 | **M** | Tailor summary | Reduction is shown as raw price delta only. No "Ajuste da experiência: −€X" line. | Add localized line in summary. |
| T-6 | **L** | Tailor restore | Restoring a stop correctly recomputes price (verified by memo deps). No bug, but no analytics event. | See analytics finding A-2. |

## 3 · Studio V3

See `studio-findings.md` for full write-up. Summary:

| ID | Sev | Finding |
|---|---|---|
| S-1 | **C** | Studio returns a Signature; does not compose an original day. |
| S-2 | **H** | Region incompatibility not detected — silently maps to nearest anchor. |
| S-3 | **M** | `composerPricing.ts` exists (anchor-based) but is not wired into the reveal. |
| S-4 | **M** | Module data gaps in `stopOperational.ts` for ~40% of pool (capacity, opening hours). |

## 4 · Availability, composition, pickup

| ID | Sev | Location | Finding |
|---|---|---|---|
| A-1 | **H** | `src/components/checkout/*` pickup field | Placeholder-only pattern with pale grey on cream (contrast < AA per prior audit `.lovable/plan.md`). Looks disabled. |
| A-2 | **M** | pickup field | No "I'll confirm the pickup location later" option — spec requires. |
| A-3 | **M** | composition step | Guests > tier max (e.g. 9+ on tours capped at 8) silently allowed; SSOT proposal will clamp. |
| A-4 | **L** | date picker | 24h lead-time working; unavailable-date message is generic ("no dates"); needs recovery CTA to Travel Designer. |

## 5 · Checkout / confirmation

| ID | Sev | Location | Finding |
|---|---|---|---|
| C-1 | **H** | `supabase/functions/create-signature-checkout/index.ts` | Trusts client-passed `totalEur` from `useResolvedJourney`. Server should recompute from SSOT to prevent price tampering. |
| C-2 | **H** | `CheckoutSummary` / `BrandedCheckoutDrawer` | Removed vs added stops are displayed inline with the itinerary — no dedicated "Removed" line. Guest can miss what changed. |
| C-3 | **M** | `booking-confirmed.tsx` | Reads price from URL params rather than the persisted `bookings` row → parity risk if the row was adjusted server-side. |
| C-4 | **M** | Step indicator | No 1-2-3 stepper on mobile — spec requires "Your experience · Details · Secure payment". |
| C-5 | **L** | Cancellation copy | Not shown on checkout summary; only on product page. Duplicate in checkout for confidence. |

## 6 · Errors / recovery

| ID | Sev | Finding |
|---|---|---|
| E-1 | **M** | Payment failure returns to a generic Stripe error page; no in-app retry surface. |
| E-2 | **M** | Expired session → 401 → blank in mobile Safari (no fallback UI). |
| E-3 | **L** | Address autocomplete missing entirely; only free-text. Spec allows both but autocomplete is preferred. |
| E-4 | **L** | `€0` guard in place (`PriceCurrencyChip`), but Tailor min-floor is 85% of base — will show €0 if `basePerPax` fails. Not currently reproducible. |

## 7 · Mobile

| ID | Sev | Finding |
|---|---|---|
| M-1 | **H** | Sticky CTA can overlap total in Tailor on iPhone 393 when keyboard is closed after composition edit (repro requires manual scroll to bottom). |
| M-2 | **M** | WhatsApp floater covers the last input field on `/checkout` iPhone SE size. |
| M-3 | **L** | Pickup label truncates at 320px width in PT locale ("Confirmarei o local de recolha mais tarde"). |

## 8 · Analytics

Missing events (per spec):
- `availability_opened`, `pickup_started`, `pickup_completed`, `tailor_item_restored`, `tailor_addon_added`, `studio_route_generated`, `checkout_step_completed`, `checkout_error`, `checkout_abandoned`.

Present (verified via `rg trackBuilderEvent` and GA4 config): `checkout_started`, `payment_started`, `purchase_completed`, `studio_started`, `studio_v2_conversion_decision`, `date_selected`, `group_size_selected`.

No PII currently sent — safe.

## 9 · Copy / i18n

| ID | Sev | Finding |
|---|---|---|
| L-1 | **M** | Primary CTA vocabulary drifts across routes ("Reserve", "Book", "Continue", "Confirm"). Spec requires: CHECK AVAILABILITY / CONTINUE TO SECURE PAYMENT / RESERVE THIS DAY (+ PT equivalents). |
| L-2 | **L** | "Direct booking price" / "Preço de reserva direta" microcopy not present anywhere yet. |
| L-3 | **L** | Some PT tour titles include EN phrases ("All-Inclusive") — leave as-is (product name), fine. |

---

## Sign-off checklist for Phase 2 (proposed, awaiting your approval)

- [ ] Approve SSOT shape (`ssot-proposal.md`)
- [ ] Approve Tailor formula (`tailor-formula.md`) and principal-vs-descriptive classification
- [ ] Approve Studio composer direction (`studio-findings.md`)
- [ ] Approve pricing-table.md deltas — some tours drop significantly ("From €262 → €169" on Évora). Confirm this is commercially acceptable before we ship.
- [ ] Confirm that `wild-beaches-picnic` (€190→€118) and `evora-alentejo` (€262→€169) card drops are expected outcomes of reconciling stale cards + 15% direct discount.
- [ ] Confirm mobile QA screenshots are needed as a separate deliverable before Phase 2 code work (or accept the static findings above and proceed).

No production deploys. Phase 2 will land on preview only; explicit "publish" required.
