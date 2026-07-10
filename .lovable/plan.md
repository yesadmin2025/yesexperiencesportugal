## Fix `signature-section-contract` — "card title never sits absolutely-positioned over the hero image"

### Root cause

The assertion greps the source of `src/routes/day-tours.tsx` for the literal string `<img` to locate the hero image tag. The route was refactored to render the hero through the shared `<TourImage {...resolveImg(t, "lg")} />` primitive, so no raw `<img` string exists in the file anymore. `indexOf("<img")` returns `-1` and the very first `expect(imgIdx).toBeGreaterThan(-1)` fails — even though the actual card structure is correct (the image `Link` at line 91 closes before the visible title `Link` at line 96, exactly what the test is meant to guarantee).

Nothing about the runtime UI is broken; only the test's grep target is stale.

### Fix (test-only, one file)

Update `src/__tests__/signature-section-contract.test.ts` — the `"card title never sits absolutely-positioned over the hero image"` case — so it finds the hero regardless of whether the card uses a raw `<img` or the `<TourImage>` primitive:

```ts
// Locate the hero image node — the card currently uses <TourImage>, but
// we also accept a raw <img so the check keeps working through future
// refactors of the image primitive.
const imgIdx = (() => {
  const a = DAY_TOURS_SRC.indexOf("<TourImage");
  if (a > -1) return a;
  return DAY_TOURS_SRC.indexOf("<img");
})();
expect(imgIdx, "hero image node missing on Signature card").toBeGreaterThan(-1);
```

The rest of the assertion (image `Link` closes before the visible title, no `absolute` wrapper around the title) stays byte-for-byte the same — it already correctly verifies the "no title overlay on hero" invariant against the current DOM order.

### Verification

Run the failing spec plus the full studio-v3 gated set to confirm zero regressions:

```
bunx vitest run src/__tests__/signature-section-contract.test.ts \
                src/components/studio-v3/__tests__/ \
                src/lib/studio-v3/__tests__/
```

Expected: previously-failing case passes, all 4 cases in the file green, entire studio-v3 suite fully green.

### Non-goals

- No change to `day-tours.tsx`, `tours.$tourId.tsx`, `TourImage`, or any runtime code.
- No new dependencies, no test-infra changes, no snapshot updates.
