# Editorial serif + strict two-family system + runtime fallback detector

Two families only: **Fraunces** (all headings + italic emphasis) and **Inter** (body/UI). Montserrat + Georgia retired. Brand palette untouched.

## 1. Load Fraunces, drop Montserrat
`src/routes/__root.tsx` `head().links`:
- keep `preconnect` to fonts.googleapis.com / fonts.gstatic.com
- add `https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500..700;1,9..144,500..700&display=swap`
- remove the Montserrat `<link>`

## 2. Design tokens (`src/styles.css` `@theme`)
- `--font-editorial: "Fraunces", serif;`
- Repoint `--font-display: var(--font-editorial);` and `--font-serif: var(--font-editorial);`
- `--font-sans: "Inter", sans-serif;` unchanged

## 3. Retire third families
- Remove hard-coded `Georgia` / `Times` / `Montserrat` from components (e.g. `src/components/builder/v3/ChapterLine.tsx`) and any inline `style={{ fontFamily: … }}`.
- Remove any literal third-family strings in `src/styles.css` outside the token fallback chain.
- Remove Montserrat `<link>` from root head.

## 4. Long-form reading measure
`src/styles.css`:
```css
@utility prose-longform { max-width: 68ch; line-height: 1.6; font-family: var(--font-sans); }
```
Apply to paragraph columns in `src/routes/about.tsx` and Local Stories article template(s).

## 5. Runtime fallback detector (new)

New client-only module `src/lib/font-fallback-detector.ts` and mount it once from `src/routes/__root.tsx` inside a `useEffect` (client-only, gated on `typeof window !== "undefined"`).

Behavior:
1. On `document.fonts.ready`, verify each required family loaded:
   ```ts
   const REQUIRED = ["Fraunces", "Inter"];
   const loaded = new Set(
     Array.from(document.fonts).filter(f => f.status === "loaded").map(f => f.family.replace(/["']/g, ""))
   );
   ```
   Log an error for any missing family, plus any *extra* loaded family (catches accidental re-introduction).
2. Walk the DOM once after fonts.ready and observe subsequent mutations:
   - For each element with visible text, read `getComputedStyle(el).fontFamily`, split the stack, and check the *first* family with `document.fonts.check("12px \"" + family + "\"")`.
   - If the first family in the stack fails the check → the browser fell back. Log:
     ```
     [font-fallback] <selector> requested "<family>" → rendered fallback "<next-in-stack>"; text="<first 40 chars>"
     ```
   - De-dupe by `selector + requestedFamily` so the console shows each offender once.
3. `MutationObserver` on `document.body` (subtree, childList + attribute filter for `class`/`style`) re-runs the check on added/changed nodes only. Debounced 250ms. Disconnect on `beforeunload`.
4. Also patch nothing — purely observational. Zero runtime cost after initial scan aside from the mutation observer.
5. Guards:
   - Development-priority: always active in dev (`import.meta.env.DEV`).
   - In production, activate only when `?fontDebug=1` is present or `localStorage.getItem("YES_FONT_DEBUG") === "1"`, to avoid console noise for guests.
   - Emit warnings via `console.warn` with a stable prefix `[font-fallback]` so filtering + grep in logs is trivial.
6. Optional beacon: when `?fontDebug=1`, POST a compact JSON `{ route, offenders: [...] }` to `/api/public/font-fallback-report` (new tiny server route that just logs to worker logs — retrievable via `stack_modern--server-function-logs` search `font-fallback`). Signature-free because payload contains no PII and is rate-limited to one POST per route per session.

Deliverables for the detector:
- `src/lib/font-fallback-detector.ts` (client-only logic)
- `src/routes/api/public/font-fallback-report.ts` (POST-only, logs and returns 204)
- Mount in `src/routes/__root.tsx` via `useEffect`

## 6. Tests / baselines refreshed same turn
- Regenerate `typography-regression.test.ts.snap`
- Swap `Montserrat`/`Georgia` → `Fraunces` in `homepage-typography-scale.test.ts`, `mixed-emphasis-heading-lock.test.ts`, `faq-typography-lock.test.ts`
- Regenerate `e2e/__baselines__/hero-typography-*.json` after visual review

## 7. Memory updates
- Core rule: **Two families only — Fraunces (headings + italic emphasis) + Inter (body/UI). Montserrat + Georgia retired.**
- Update `mem://design/typography-v3.md`; add `mem://design/longform-reading.md`; add `mem://features/font-fallback-detector.md` documenting the flag + log prefix.

## Verification pass (this turn)
- Static grep: `rg -ni "montserrat|georgia|times|helvetica|arial|playfair|cormorant" src/ public/` → zero hits (except token fallback chain).
- Playwright smoke on `/`, `/about`, `/experiences`, `/private-wine-tour-lisbon`, `/studio-v3`, `/multi-day`, `/proposal-in-portugal`, one Local Stories article:
  - `document.fonts` contains exactly Fraunces + Inter, both `loaded`
  - Detector emits no `[font-fallback]` warnings in the console
- Screenshot hero + long-form paragraph on `/` and `/about` for visual sanity.

## Preserved
Brand color tokens, spacing, buttons, motion, image rules, homepage energy overrides, hero copy, CTA vocabulary, homepage H2 `font-medium` exception, product/business logic — unchanged.

## Risk
Visual regression suites will fail on first run; baseline refresh is part of this turn.
