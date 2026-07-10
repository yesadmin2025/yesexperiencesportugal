## Verify: full studio-v3 test suite

Run the same command used in Step 13's QA sweep to confirm no regressions after the `signature-section-contract` fix.

### Command

```
bunx vitest run \
  src/__tests__/signature-section-contract.test.ts \
  src/components/studio-v3/__tests__/ \
  src/lib/studio-v3/__tests__/
```

### Expected result

- `signature-section-contract.test.ts` — 4/4 pass (previously 3/4).
- All 40 studio-v3 test files green.
- Total: **356/356 tests passing**, zero failures.

### If any test fails

&nbsp;

Fix it 

&nbsp;

