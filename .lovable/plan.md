# Verify pricing fix + polish the reveal CTA

## Part 1 — Verification (read-only)

1. `bunx tsgo --noEmit` — confirm the `tourPriceTiers` scoping change compiles cleanly and no other typing regressed.
2. `bun run lint` — confirm no new lint errors from the added `useTourPriceTiers` import.
3. `bun run build` — confirm the Nitro/Cloudflare bundle still succeeds.
4. Report exact pass/fail per step.

## Part 2 — Reveal + CTA alignment review

Audit the Signature reveal block (`StoryboardHandoff` in `StudioV3.tsx`, ~lines 2520–3200) against the "simple and effective" bar:

- **Price eyebrow** (line 3079) — gold uppercase eyebrow currently shows `€X per person · N guests`. Confirm it reads the same tier price the drawer/Stripe now use (pass `tourPriceTiers` down as a prop so this eyebrow and the drawer speak with one voice — today it still uses VIATOR_META only, which is the exact drift we just fixed downstream).
- **Hero → price → trust mark → CTA rhythm** — verify vertical spacing hierarchy: title (mt-4) → sub (mt-4) → price eyebrow (mt-5) → gold rule (mt-6) → YES Approved chip (mt-5) → primary CTA. Flag any double eyebrows, redundant "from" labels, or competing gold accents that dilute the "Say YES" moment.
- **CTA clarity** — "Say YES" primary + secondary link should be unambiguous (one clear action, one quiet escape). Check for duplicate CTAs, competing tier chips, or price restatements within a screen height of the button.
- **Drawer summary parity** — with the pricing fix landed, walk the mobile viewport (393×852) via Playwright from reveal → Say YES → details → drawer and screenshot the price line on both surfaces to prove they now match (e.g. €279 = €279, not €262 vs €279).

## Part 3 — Small, surgical adjustments only

If Part 2 surfaces friction, propose a minimal follow-up (e.g. thread `tourPriceTiers` into `StoryboardHandoff` via props; remove any duplicated price line; tighten one spacing token). No redesign, no copy rewrites, no new components — the reveal stays as approved.

## Out of scope

- No curation logic changes.
- No new visual elements or motion.
- No copy edits beyond removing a duplicated price line if one is found.

## Deliverable

- Typecheck / lint / build status.
- Reveal-vs-drawer screenshot pair confirming price parity.
- A short list of any friction points found, each with a one-line proposed fix, for approval before implementing.
