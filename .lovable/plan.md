# Studio draft hydration reset

## What is failing now

- `useStudioV3AutoPersist` marks hydration only with a component `useRef` (`useStudioV3AutoPersist.ts:133–165`). That protects rerenders, but not route remounts, HMR, or a fresh React tree.
- The toast has a second component-local ref (`StudioV3.tsx:807–817`), so every remount can announce **Draft restored** again.
- Local draft hydration, saved-link hydration, and debounced persistence are separate effects (`StudioV3.tsx:787–817`, `1216–1258`; `useStudioV3AutoPersist.ts:167–183`) rather than one ordered lifecycle.
- Saved-link detection reads `window.location` during render (`StudioV3.tsx:724–727`, `789–792`), creating an SSR/client timing split.
- Restored add-ons are applied immediately even though the comments promise a tour match (`useStudioV3AutoPersist.ts:152–161`); persisted computed items and totals can also be stale.
- Existing hydration tests cover only merging a saved-link payload. They do not render the hook, exercise local storage, verify effect counts, or inspect toast replay.

## Implementation

### 1. Define one hydration contract

Replace `useStudioV3AutoPersist` with a single `useStudioDraft` controller whose lifecycle is explicit:

```text
checking source
  ├─ saved token → loading saved signature → commit once
  ├─ local draft → validate → commit once
  └─ no valid draft → ready empty

ready → debounced persistence may begin
cleared/finalized → cancel pending write and invalidate current draft
```

The controller will enforce these invariants:

- A mounted Studio runtime can commit hydration only once.
- A saved-link payload always wins; local storage is never applied while it is loading.
- Persistence cannot write until hydration reaches `ready`, preventing an empty/default render from overwriting a real draft.
- Async saved-link responses use a run/request guard, so stale or cancelled responses cannot commit.
- State and add-on IDs are committed as one hydration transaction.

A full page reload necessarily reconstructs React state from storage; “once per session” will therefore mean **one hydration commit per mounted runtime**, while the acknowledgement toast is **once per browser-tab session per draft**.

### 2. Make the persisted draft stable and derivable

Create a small pure storage module with a versioned envelope:

- Stable `draftId` generated once and retained through edits.
- `savedAt`, normalized `StudioV3State`, persisted `tourId`, and selected add-on IDs only.
- Do not persist computed add-on labels, prices, or totals; derive them again from the current catalog and pricing source after restore.
- Validate version, structure, meaningful progress, and known IDs before use. Corrupt/unsupported payloads are removed safely instead of partially applied.
- Migrate the current v1 payload once so existing traveller drafts are not silently lost.

### 3. Make add-on restoration deterministic

- Hold restored add-on IDs as pending until the hydrated `state.tourId` is committed.
- Apply only IDs belonging to that same tour’s current eligible catalog; discard orphaned or unavailable IDs.
- Let `SignaturePriceCard` rebuild the summary and totals from current data, then publish the canonical summary to the parent.
- Ensure the existing “tour changed” cleanup cannot erase selections during the hydration transaction.

### 4. Make toast acknowledgement session-scoped

- Add a session-storage acknowledgement keyed by stable `draftId`.
- Claim the acknowledgement atomically before calling Sonner.
- Give Sonner a fixed toast ID as a second deduplication layer.
- Local restoration may show **Draft restored** once in a browser tab; rerenders, Strict Mode effect replay, route away/back, HMR remounts, and refreshes in that tab cannot replay it.
- A genuinely new browser session may show it once again.
- Saved-link hydration will not show the local-draft toast because its loading UI already explains what is happening.

### 5. Remove competing ownership from `StudioV3`

- Parse `saved` through the `/studio-v3` route search contract and pass it into `StudioV3`; remove render-time `window.location` checks.
- Move both local and saved-link hydration under `useStudioDraft`.
- Render the existing restrained hydration surface while the controller is checking/loading, preventing an interactive intro flash before restore.
- Route all clear/finalize actions through the controller so pending timers are cancelled and a cleared draft cannot be recreated by a late write.
- Keep silent auto-persist as the only persistence model; do not restore the removed Save/Clear header controls.

## Verification

### Hook/unit tests

Add focused tests proving:

1. Local payload commits state exactly once under React Strict Mode.
2. Rerendering cannot rehydrate or call add-on restoration again.
3. No local-storage write occurs before hydration is ready.
4. Saved token ignores local draft and commits only the latest valid response.
5. Matching add-ons restore; mismatched, stale, and unknown IDs do not.
6. v1 migration preserves valid state but drops stale computed totals.
7. Clear cancels a pending debounce and storage remains empty.
8. Toast claim succeeds once across unmount/remount in the same session and resets only with a new session.

### Mobile-first Playwright contract

Add one deterministic Studio hydration spec that seeds a real local draft and verifies at the 393px viewport:

- The restored phase, answers, tour, and valid add-on selection appear after opening Studio.
- The toast appears once on the first restore.
- Rerender/navigation away and back do not replay it.
- Reload restores the visible draft without replaying the toast in the same tab session.
- A new browser context restores the draft and may acknowledge it once.
- No console errors, duplicate hydration calls, or default-state overwrite occur.

## Files

- Replace `src/components/studio-v3/useStudioV3AutoPersist.ts` with `useStudioDraft.ts`.
- Add a pure Studio draft storage/normalization module beside the hook.
- Edit `src/components/studio-v3/StudioV3.tsx` to use the unified controller.
- Edit `src/routes/studio-v3.tsx` to provide typed saved-token search state.
- Add hook/storage tests under `src/components/studio-v3/__tests__/`.
- Add a dedicated hydration/toast Playwright spec under `e2e/`.

## Done when

Draft state never receives two hydration commits in one mounted Studio runtime; saved links have strict precedence; add-ons and totals restore from current truth; and **Draft restored** cannot replay unexpectedly within the same browser-tab session.