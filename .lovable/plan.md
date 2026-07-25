## Goal

Guarantee that every Signature tour's rendered content (inclusions, not-included, itinerary chapters) exactly matches its Source-of-Truth payload — and that any drift fails CI, whether it comes from a legacy fallback leaking in, a UI helper mutating the data, or an unreviewed edit to the SoT file itself.

## Approach

One new Vitest suite, run by the existing `bun test` / `vitest run` CI step (already invoked from `prebuild`-adjacent scripts and `test`). Two complementary checks per tour, plus a committed snapshot so unreviewed SoT edits are visible in diff review.  live fetch of viator.com to validate source of truth 

### New file: `src/__tests__/sot-viator-parity.test.ts`

For each `tourId` in `SIGNATURE_SOURCE_OF_TRUTH`:

1. **Parity check (hard equality)** — call `getTourContent(tourId)` and assert:
  - `source === "sot"` (proves the helper is not silently falling back to legacy).
  - `included`, `notIncluded`, `highlights` deep-equal the SoT arrays (same order, same strings, no trims/casing drift).
  - `overview === sot.overview`.
  - `itinerary` length equals `sot.itinerary.length`, and every chapter matches field-by-field: `order`, `label`, `description`, `durationMinutes`, `travelToNextMinutes`, `optional`. `null` stays `null` — no coerced `0`.
2. **Locked snapshot** — `expect(normalized).toMatchSnapshot()` on a stable projection `{ tourId, source, overview, highlights, included, notIncluded, itinerary }`. Snapshot committed under `src/__tests__/__snapshots__/sot-viator-parity.test.ts.snap`. Any SoT edit surfaces as a snapshot diff that a reviewer must approve with `-u`.
3. **Coverage guard** — assert `Object.keys(SIGNATURE_SOURCE_OF_TRUTH).length === expectedCount` (12 today, read from the file) so a tour silently dropped from SoT fails CI instead of quietly reverting to legacy content.

### CI wiring

- Suite is picked up automatically by `bun run test` (`vitest run`), which is the existing CI signal — no new workflow file required.
- Add `"test:sot-parity": "vitest run src/__tests__/sot-viator-parity.test.ts"` to `package.json` scripts for local + targeted CI use, and reference it alongside the existing `tour-content-*` guardrail tests in `docs/sot-viator-reconciliation-2026-07.md`.

## Failure semantics (what a red build tells you)

- "source is legacy for `<tourId>`" → SoT entry deleted or `getTourContent` regression.
- "included[3] differs" → UI helper mutated the array, or SoT was edited without updating the snapshot.
- "snapshot mismatch" → SoT payload changed; reviewer runs `vitest -u` after confirming Viator page still matches.
- "expected 12 SoT tours, got 11" → a tour was removed from SoT.

fix all the failing tests 