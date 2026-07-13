## Simplify the travel-file section on /multi-day

The Travel Designer page (`/multi-day`, section `#sample-file`) currently shows a large cover image + a "What's inside" card grid + a 22-page thumbnail wall. On mobile this is a very heavy scroll and duplicates content the homepage already handles more elegantly.

The homepage (`RecentJourney`) shows the same anonymised travel file as a single, compact flippable "bespoke book" with keyboard/swipe navigation and a lightbox — that's the model to reuse.

### Change

In `src/routes/multi-day.tsx`, replace the entire `#sample-file` section body (the cover-image + What's-inside grid + 22-page thumbnail wall, lines ~312–389) with the homepage's `<RecentJourney />` component, keeping only the eyebrow / title / gold rule / lede intro above it so the section still reads as an editorial moment on this page.

Result:
- Same visual model as the homepage (one flippable file, no thumbnail wall).
- Section becomes ~1 viewport instead of many.
- The 22-image grid stops loading on this route (perf win on mobile).
- `FILE_GROUPS` becomes unused → remove the constant and its `FileText`-adjacent imports if no longer referenced. `SAMPLE_PAGES` / `TOTAL_SAMPLE_PAGES` also become unused → remove.

No other sections on `/multi-day` change. No homepage changes. No new components.