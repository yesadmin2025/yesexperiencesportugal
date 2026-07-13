## Slice D closure — Tailored + Studio V3 browser interaction pass

Scope: extend the existing versioned test `e2e/sliceD-browser-interactions.py` so it drives the real Tailored and Studio V3 UI end-to-end at both viewports. **No production code changes** (no edits to `src/`, `supabase/`, styles, routes, or pricing). Evidence lands in `/tmp/browser/sliceD-interactions/`.

### 1. Fixture hardening (shared)

- Extend `install_routes` to also match the `create-builder-checkout` and `create-tailored-checkout` (whichever the Tailored + Studio paths hit — will be confirmed at run time via the catch-all `unexpected` logger, then wired) with the same shape as `create-signature-checkout`.
- Rewrite `build_checkout_response()` so `url` points to a **same-origin controlled endpoint** the browser can navigate to without Stripe: `${BASE}/?checkout=stub&session=cs_test_slicedtest`. Drop `clientSecret`/`publishableKey` fields entirely so the embedded Stripe drawer never mounts (prevents the "Invalid Checkout session" runtime error the last pass produced). Set `uiMode: "hosted"` when the flow supports it; otherwise stub a `window.__lovableCheckoutStub` sentinel via `page.add_init_script` and detect navigation to the stub URL instead of asserting Stripe state.
- Keep the catch-all Supabase handler that fails scenarios on unexpected function calls.

### 2. Tailored flow (desktop + 393)

Replace the shallow `run_tailored`:

1. Navigate `/tours/sintra-cascais/tailor`.
2. Fill date + `compose_2_15_8_0` (adults=2, minorAges=[15,8,0]).
3. Wait for booking-quote to fire.
4. Drive the blueprint stop selection UI until at least one stop is selected (`summaryStops.length > 0`). Read the tailor page's stop-toggle controls (`getByRole("button" | "checkbox", name=/…/)` — resolved by inspecting `tours.$tourId.tailor.tsx` blueprint section) and click the first non-mandatory stop; retry once if pricing hasn't recomputed.
5. Screenshot `tailored-picker-<vp>.png`.
6. Click the visible Reserve/Continue CTA, open `FinalDetailsDialog`, fill name/email/phone/pickup, submit; screenshot `tailored-final-details-<vp>.png`.
7. Wait up to 8s for checkout call. Screenshot `tailored-checkout-<vp>.png` **after** navigation to the same-origin stub URL.
8. Assert and record:
   - `checkoutCalls === 1`
   - `checkout.body.quoteToken === QUOTE_TOKEN`
   - `quote.body.travellerComposition === {adults:2, minorAges:[15,8,0]}`
   - `resolvedGuestMix.totalParticipants === 5`
   - server labels `Youth 14-17` / `Child 6-13` / `Infant 0-5` visible in DOM

### 3. Studio V3 flow (desktop + 393)

Replace static-file assertion with a real drive:

1. Navigate `/studio-v3`.
2. Walk the phases via accessible controls: travellers picker → preferences (select first offered option in each required group) → generate → Storyboard.
3. On **Storyboard**, evaluate a DOM snapshot from the rendered itinerary panel:
   ```
   { commercialProductKey, travellerComposition, orderedStops: [{id,label,sequence}] }
   ```
   using `data-*` attributes already present, or (fallback) reading `window.__studioV3State` if exposed; otherwise parse the visible stop list DOM in order. Screenshot `studio-storyboard-<vp>.png`.
4. Advance to **Final Itinerary**; capture the same snapshot from that view. Screenshot `studio-final-<vp>.png`.
5. Advance to **Checkout Summary**; capture the same snapshot. Click the checkout CTA, wait for `create-*-checkout` call, allow navigation to the same-origin stub. Screenshot `studio-checkout-<vp>.png`.
6. Assert:
   - three snapshots deep-equal
   - `commercialProductKey === "studio-v3-private-full-day"`
   - `checkoutCalls === 1`

If the actual Studio phase names/selectors differ from the initial guess, the script will attempt discovery via `page.get_by_role("heading")` and log the encountered phase sequence to `report.json` before failing loudly (so we can adjust selectors in-place; no production edits).

### 4. Keep the passing Signature + unsupported-age + mobile-bounds scenarios exactly as they are.

### 5. `report.json` (only fields the user asked for)

```json
{
  "tailored":   { "desktop": {...}, "393": {...} },
  "studio":     {
     "phaseSequence": ["travellers","preferences","itinerary","storyboard","final","checkout"],
     "desktop": { "snapshots": {"storyboard":..,"final":..,"checkout":..},
                  "equal": true, "commercialProductKey": "...", "checkoutCalls": 1 },
     "393":     { ... }
  },
  "checkoutCallCounts": { ... },
  "outgoingCompositions": { ... },
  "screenshots": [ ... paths ... ],
  "pageErrors": [], "consoleErrors": [...], "failedRequests": [...],
  "remainingLaunchBlocker": "real Stripe sandbox + Bókun test-channel smoke not executed"
}
```

`pageErrors` must be `[]`. Console-error allowlist: only the pre-baselined hydration warnings (regex kept next to the filter, one line). Runtime checkout errors from the fixture itself are NOT filtered — they fail the run.

### 6. Execution

Run: `python e2e/sliceD-browser-interactions.py`. Iterate selector-only fixes (no production code) until Tailored + Studio scenarios pass at both viewports; then return the completion report.

### Out of scope

No changes to `src/**`, `supabase/**`, other `e2e/**` specs, styles, routes, pricing, Bókun, Stripe, or Studio generation. Real Bókun/Stripe smoke remains the sole remaining launch blocker.
