## Audit report — Signature + Tailor release readiness

This is an **audit only**. No files were modified. Blockers are listed at the end; fixes are not proposed here.

### Scope

12 Signature tours found in `src/data/signatureTours.ts`:
`arrabida-wine-allinclusive`, `wild-beaches-picnic`, `arrabida-boat`, `tiles-workshop`, `azeitao-cheese`, `sintra-cascais`, `troia-comporta`, `evora-alentejo`, `tomar-coimbra`, `fatima-nazare-obidos`, `roman-heritage-alentejo`, `southwest-vicentine-coast`.

### Cross-cutting checks (apply to every tour)

| Check | Status | Evidence |
|---|---|---|
| Adults + exact minor ages persist listing → detail → tailor → checkout | PASS | Shared `Composition` in `src/lib/checkout/composition.ts`; `SimpleBookingForm.tsx` L88–89, `tours.$tourId.tailor.tsx` L494–495 / L1483–1484, drawer at `BrandedCheckoutDrawer.tsx` L33/126. |
| No minor silently adult-priced | PASS | `supabase/functions/create-signature-checkout/index.ts` L192–198 rejects non-integer / out-of-range ages; L215–219 refuses checkout with `owner_data_missing` when no tier row exists AND minors present. |
| Age bands applied server-side (adult 100 / youth 75 / child 50 / infant 0) | PASS | Same file L72–82, L231–239. |
| Checkout uses server-authoritative quote | PASS | `tourSubtotalCents` computed on the edge function L241; client `totalEur` is UI-only display. |
| Locked stops all have justified reason codes | PASS | Only 3 locks in `tailorBlueprints.ts` (L367, L458, L476), all `product_defining` with `customerFacingReason` strings. |
| Optional/Choice stops are removable | PASS | Tailor UI gates only on `s.lock` (per prior turn); Choice/Optional groups honour `pickMin`/`pickMax`. |
| Tailor updates route, duration, story, price | PASS | `useResolvedJourney` + `tailor-chapters.ts`; price recomputed per composition. |
| Wine Tailor allows up to 4 wineries when feasible | PARTIAL — see blocker #2 |
| Removed stops never reappear | PASS | Tailor state is a controlled `Set`; no re-injection path found. |
| Add-ons remain compatible | PASS | Add-ons attach to composition, not to per-stop identity. |
| Per-person and total prices consistent | PASS | Both derive from `eurPerPax = tiers[headcount] ?? priceFromEur`. |
| "Make it yours" gone from Signature contexts | PASS | `rg "Make it yours\|Make this yours"` returns 0 hits. |
| All Signature Tailor buttons say "Tailor this day" | PASS (EN) / PT uses "Adaptar este dia" | Verified across `index.tsx` L771, `tours.$tourId.tsx` L331/L928, `experiences.tsx` L197, `SimpleBookingForm.tsx` L331, `PathfinderQuiz.tsx` L499. |
| Mobile and desktop behave identically | PASS (code path) | Same components, no viewport-gated branches in booking/tailor flow. |
| No Bókun runtime request | PASS | Only reference is migration `20260714201407_*.sql` **dropping** all Bókun columns and mapping table. No `fetch`/client code references `bokun`. |

### Per-tour pass/fail

Legend: R = Reserve as designed · T = Tailor flow · $ = server pricing (incl. minors) · L = lock audit · W = wine-count rule (only where applicable).

| Tour | R | T | $ | L | W | Notes |
|---|---|---|---|---|---|---|
| arrabida-wine-allinclusive | ✅ | ✅ | ✅ (tiers 1–8) | ✅ | ⚠️ pickMax 4, but 3rd/4th winery routes through "Request confirmation" |
| wild-beaches-picnic | ✅ | ✅ | ✅ (tiers 2–8) | ✅ | n/a |
| arrabida-boat | ✅ | ✅ | ✅ (2–8) | ✅ | n/a |
| tiles-workshop | ✅ | ✅ | ✅ (1–8) | ✅ (1 lock `product_defining`) | ✅ pickMax 2 |
| azeitao-cheese | ✅ | ✅ | ✅ (2–8) | ✅ (2 locks `product_defining`) | n/a |
| sintra-cascais | ✅ | ✅ | ✅ (2–8) | ✅ | n/a |
| troia-comporta | ✅ | ✅ | ✅ (2–8) | ✅ | n/a |
| evora-alentejo | ✅ | ✅ | ✅ (2–8) | ✅ | ⚠️ pickMax 4, same manual-confirmation path |
| tomar-coimbra | ✅ | ✅ | ✅ (2–8) | ✅ | n/a |
| fatima-nazare-obidos | ✅ | ✅ | ✅ (1–8) | ✅ | n/a |
| roman-heritage-alentejo | ✅ | ✅ | ✅ (2–8) | ✅ | n/a |
| **southwest-vicentine-coast** | ✅ | ❌ | ✅ (2–8) | n/a | **No Tailor blueprint — see blocker #1** |

### Launch blockers

1. **`southwest-vicentine-coast` has no entry in `src/data/tailorBlueprints.ts`.**
   `getTailorBlueprint("southwest-vicentine-coast")` returns `null`, so hitting `/tours/southwest-vicentine-coast/tailor` fails the guard in `src/routes/tours.$tourId.tailor.tsx` (blueprint check near the top of the component). Any surface exposing "Tailor this day" for this tour reaches a dead path.
   Files responsible: `src/data/tailorBlueprints.ts`, `src/routes/tours.$tourId.tailor.tsx`.

2. **4-winery day is never actually reservable instantly.**
   `arrabida-wine-allinclusive` and `evora-alentejo` set `pickMax: 4`, but any selection above `pickMin` is flagged `confirmationStatus !== "instant"` (no per-supplier data yet), which forces the "Request confirmation" branch and disables Stripe checkout. The promise "up to four wineries when operationally feasible → instant reserve" is currently gated on missing operational data, not on feasibility.
   Files responsible: `src/data/tailorBlueprints.ts` (missing `confirmationStatus: "instant"` + `openingWindow`/`visitMinutes`/`pricePerPaxEUR` on each winery stop), `src/routes/tours.$tourId.tailor.tsx` (manual-confirmation gate), `docs/tailor-winery-operational-data.md` (Phase 2 handoff still open).

3. **Manual E2E per-tour reserve-and-tailor click-through has not been executed against a live Stripe sandbox in this audit.** All checks above are code-path verification. Before launch, each of the 12 tours needs one Reserve-as-designed and one Tailor checkout to a `checkout.session.completed` webhook.
   Owner: QA — no code file responsible.

### Non-blockers noted but out of scope

- FAQ copy `"Can I customise a Signature day?"` in `src/content/faq-data.ts` / `seo-faq.ts` — is a question header, not a CTA; leave.
- `CTA_PERSONALISE` constant in `src/content/signature-day-copy.ts` is only used by Studio (`MapAwakens.tsx`); out of scope per Signature-only rule.
- PT route uses `Adaptar este dia`; if you want strict single-label parity across languages, tell me and I'll unify.

### Deliverables in this report
1. Cross-cutting pass/fail table with file evidence.
2. Per-tour pass/fail matrix for all 12 Signatures.
3. Three ranked launch blockers with exact responsible files.
4. Explicit non-blockers noted for transparency.

No files were changed. Awaiting your instruction on which blockers to fix and in what order.
