
## Goal

Extend `/admin/pricing` with a "Sync from Bókun" workflow that first runs `sync-bokun-pricing` in `dryRun: true` mode, renders a per-tour before/after diff (tiers + `bokun_categories`), and only writes when the admin explicitly confirms with a second call (`dryRun: false`).

## Scope

- UI only, on `src/routes/admin.pricing.tsx`. No changes to the edge function contract or DB schema.
- Uses existing admin gate already on the page.
- Diff covers: banded tiers (adult/youth/child + infant) per guest bucket 1..8, plus `bokun_categories` mapping (band → Bókun id/title/minAge/maxAge).

## UX

Header gets a new **Sync from Bókun** section above the tour list:

```text
[ Sync all from Bókun ]   [ Sync this tour ▾ (select) ]
status: idle | fetching preview… | preview ready (N tours, M changed) | applying… | done
```

Flow:
1. Admin clicks **Preview sync** → calls edge fn with `{ dryRun: true, tourId? }`.
2. Renders a **Diff panel** listing every returned tour, grouped as *Changed* / *Unchanged* / *Failed (reason)*.
3. Each changed tour shows a compact table:
   - Row per band (adult/youth/child) with 8 bucket cells: `before → after` (green = new, amber = changed, dash = unchanged, red = removed).
   - Infant scalar line.
   - `bokun_categories` chip row: `Adult · id 42 · 18+`, etc., with before/after when different.
   - `synced_from_bokun_at` before timestamp (if any).
4. Sticky footer: **Apply N changes** (disabled when 0 changed) + **Discard preview**. Apply re-calls the fn with `{ dryRun: false, tourId? }`, then invalidates the tiers query and re-fetches.
5. Toasts for success / partial failure; failed tours listed with their `reason`.

Per-tour row in the existing list gets a small **Sync from Bókun** link that opens the same drawer scoped to that `tourId`.

## Technical details

- New component `SyncFromBokunPanel` in `src/routes/admin.pricing.tsx` (kept co-located; extracted only if it grows).
- Call path: `supabase.functions.invoke("sync-bokun-pricing", { body: { dryRun, tourId?, aliases? } })`. Session bearer is attached automatically by the browser client.
- Response typing: mirror the edge fn's `SyncOne` shape locally
  ```ts
  type SyncOne = {
    tourId: string;
    ok: boolean;
    reason?: string;
    before?: { tiers: unknown; bokun_categories: unknown; synced_from_bokun_at: string | null };
    after?:  { tiers: BandedTiers; bokun_categories: Record<AgeBand, {...}> };
  };
  ```
  Reuse `BandedTiers` / `AgeBand` from `@/lib/pricing/ageBandPricing`.
- Diffing done client-side via a small `diffBanded(before, after)` helper returning per-band per-bucket status (`added|changed|removed|same`) and per-band category delta.
- No writes bypass the edge fn — Apply is just a second invoke with `dryRun: false`. This preserves the fn as the single source of truth for classification.
- State: local `useState` (`preview`, `isFetching`, `isApplying`, `scope: 'all' | tourId`). No new query keys needed; after Apply we invalidate `TOUR_PRICE_TIERS_QUERY_KEY` and `TOUR_BANDED_TIERS_QUERY_KEY`.
- Guardrails: Apply button requires the currently displayed preview to still match `scope`; if admin changes scope, preview resets. Confirm dialog before Apply summarising "X tours will be overwritten with Bókun values".
- A11y: diff table uses semantic `<table>` with row/col headers; status colours paired with text ("changed", "new"), not colour-only.

## Non-goals

- No editing of aliases from the UI (still accepts default `bokun_category_aliases`); a follow-up can expose an alias editor.
- No history/audit view of past syncs.
- No changes to manual tier editor behaviour — Bókun sync and manual edits coexist; last write wins, as today.

## Files

- `src/routes/admin.pricing.tsx` — add `SyncFromBokunPanel`, per-row "Sync from Bókun" link, small `diffBanded` helper.

## Verification

- Manual: click Preview with no mappings → empty result, friendly message. With mappings → diff renders, Apply writes, `useTourPriceTiers` refetches and grid reflects new values.
- Type: `tsgo` clean.
- No new e2e in this slice; Playwright golden walkthrough remains scheduled for the checkout slice.
