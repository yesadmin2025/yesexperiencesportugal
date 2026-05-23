## What you're asking for

Drift shouldn't just match a traveller to a full pre-built Signature tour. Within a region, stops should be **swappable between tours** and assembled into a unique, feasible day — respecting opening hours, weekday closures, category caps (e.g. max 3 wineries/day in Arrábida, 2 in Alentejo), and driving-time reality. The Drift profile (energy, style, social, companions) should *predictively* weight which stops surface.

So the architecture shifts from:
> "pick the best Signature tour for this profile"

to:
> "pick the best **region**, then compose the day from a shared pool of real stops, filtered by operational rules and ranked by emotional fit."

---

## Plan

### 1. Stops catalog (single source of truth per region)
New file `src/data/regionStops.ts` — a flat list of real, named stops we operate, each with:

- `id`, `region` (`arrabida` | `alentejo` | `lisbon-centro` | …)
- `name`, `kind` (`winery` | `market` | `viewpoint` | `beach` | `table` | `village` | `heritage` | `cellar`)
- `coords` (lat/lng) — for real drive-time estimation
- `dwellMin` (typical time on-site)
- `hours`: `{ open: "09:00", close: "13:00" }` or `null` (always open)
- `closedDays`: `[1]` for Mondays, etc.
- `affinity`: which Drift dimensions this stop pulls toward (e.g. winery → `style: "wine"`, `energy: "slow"`)
- `seasonal?`: optional months window
- `compatibleWith?` / `incompatibleWith?`: e.g. "long lunch" excludes a second long lunch
- `priority`: editorial weight inside its kind

Stops are tagged to a region, **not to a tour**. Tours become *suggested compositions* of stops, not fixed bundles.

### 2. Rules engine (`src/lib/drift/composer.ts`)
A pure-TS function `composeDay(profile, region, dateContext) → ComposedDay`.

Rules enforced:

- **Regional category caps** (configurable):
  - Arrábida: max 3 wineries, max 1 market, max 1 long lunch
  - Alentejo/Évora: max 2 wineries, max 1 cellar visit
  - Centro: max 1 market, max 1 viewpoint cluster
- **Opening hours / closed days** — drop any stop closed on the visit weekday or whose window doesn't fit the day budget
- **Drive-time budget** — total drive ≤ ~3h, single hop ≤ ~50 min (haversine × 1.35 detour factor as estimate; matches what the existing builder uses)
- **Dwell budget** — pickup + stops + drives ≤ chosen day length (`radius: near` = 6h, `far` = 9h)
- **Compatibility** — no double-long-lunch, no two markets, etc.

Composition algorithm:
1. Filter stops by region + open today + seasonal
2. Score each stop = `affinityFit(profile) + priority + freshness`
3. Greedy assemble respecting caps, drive budget, dwell budget, and a natural rhythm (morning market → coastal viewpoint → lunch → afternoon winery → sunset stop)
4. If infeasible, drop lowest-score stops until feasible
5. Return ordered itinerary + warnings

### 3. Wire into Drift convergence
Replace the current `matchTours` in `StudioDrift.tsx`:

- Convergence still picks the **region** from the profile (Lisbon/Centro/Alentejo via `pickup` + style + motif gravity)
- Then calls `composeDay(profile, region)` to build the actual day
- Reveal screen shows: hero stop + 3–4 composed stops with real opening windows, total drive time, and a link to "Continue with a local" (WhatsApp / contact) — **not** a static Signature card

We keep `signatureTours` as **editorial reference** (titles, blurbs, hero imagery) but stop treating them as the unit of recommendation.

### 4. Admin-editable later (not in this pass)
The catalog + caps live as typed TS so we can iterate fast and keep it Git-tracked. When the catalog stabilises we move it to Supabase (`region_stops`, `region_rules`) and reuse the existing admin shell — no schema changes this turn.

---

## What I will NOT do in this turn

- No new DB tables (catalog stays in TS until shape is proven)
- No real Mapbox Matrix API calls (haversine estimate now, swap to real matrix later — same interface)
- No changes to the original `/builder` flow — Drift only
- No invented stops: catalog seeded only with real YES Experiences stops you already operate (I'll start with Arrábida + Alentejo from existing data, mark `TODO_VERIFY` on anything I'm unsure about so you can correct)

---

## Files I will touch

- **new** `src/data/regionStops.ts` — stops catalog
- **new** `src/data/regionRules.ts` — caps + drive/dwell budgets per region
- **new** `src/lib/drift/composer.ts` — pure composition engine + tests
- **edit** `src/components/builder/v3/StudioDrift.tsx` — convergence calls composer instead of `matchTours`

---

## One question before I build

Do you want me to seed the catalog **only with stops I can verify from your existing Signature tours data** (safer, smaller pool to start — maybe 12–18 stops across Arrábida + Alentejo + Centro), or do you want to **send me the canonical stop list** (names, hours, closed days, category) so the first version is operationally accurate from day one?

If you say "seed from existing", I'll mark every operational field (`hours`, `closedDays`) as `TODO_VERIFY` and you can correct in one pass.
