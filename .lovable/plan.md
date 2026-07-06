## Goal

Clear the site-wide Prettier lint debt, then run an end-to-end Studio → checkout walkthrough in a headless browser to confirm the flow works with no runtime errors and matches your recent direction (region-first + intent-tagged stops driving the Signature match).

## Part 1 — Auto-fix formatting

1. Run `bunx prettier --write` across `src/`, `supabase/functions/`, `e2e/`, and `vite.config.ts` (the exact set flagged by lint). This is a formatting-only pass — no logic changes.
2. Re-run `bun run lint` and confirm 0 errors. If a residual non-Prettier rule (e.g. `@typescript-eslint/no-explicit-any` in `stripe-session-status`) is left, fix it inline with a narrow type.
3. Re-run `tsgo --noEmit` to confirm the reformatting didn't break types.
4. Re-run `bun run build` to confirm the Worker bundle still compiles.

## Part 2 — Studio end-to-end walkthrough

Drive Playwright against `http://localhost:8080` at mobile viewport 393×852 (your device):

1. Open `/studio` (or the current Studio V3 entry), capture console + network listeners for the whole session.
2. Progress through every beat: intro → feeling → companions → interests → pickup → rhythm/destination → reveal.
3. At the reveal, capture:
  - The resolved Signature tour title.
  - The `?debug=studio` Intent Coverage panel: dominant intents, per-interest evidence, top candidates, filtered-out reasons.
  - Screenshot the FitReport.
4. Verify the region-first + intent logic against your rule:
  - For a "wine" interest run, the picker should score Évora wine tour AND Azeitão tiles workshop (wine-tagged) as wine-satisfying candidates via `stopIntents`, not just tours with "wine" in the title.
  - Repeat with a second interest mix (e.g. coast + gastronomy) to confirm region filtering behaves.
5. Continue into the add-ons / composer beat, adjust party size, and click through to the checkout drawer.
6. On the checkout screen, verify: price matches the tier-aware anchor, no console errors, no failed network calls (ignore expected Bokun/Stripe test-mode 4xx if any — will call those out).
7. Take screenshots at each major beat and save under `/tmp/browser/studio-e2e/screenshots/`.

## Part 3 — Report

A short summary with:

- Prettier: files changed count, final lint status.
- Typecheck + build: pass/fail.
- Studio walkthrough: per-beat status, resolved tour + dominant intents, any console/network errors, screenshots referenced.
- Any deviation from your "every signature stop has an intent, matched by region + intent" rule, with the exact tour/stop that failed.
- Maps and preview page is clear and real prices abd stops updates automatically 
- On the checkout page before client inputs name etc there should be a Summary of what's chosen, real, and send by email once we have that data 

## Out of scope

- No design or copy changes.
- No changes to curation logic unless the walkthrough surfaces a rule violation — in which case I'll stop and propose a follow-up plan rather than silently patch.