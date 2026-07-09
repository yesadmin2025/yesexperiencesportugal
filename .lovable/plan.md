## Goal
Enrich founder presence on /about with distinct, editorial photography + a signed first-person note, and give /multi-day, /proposal-in-portugal, /corporate a compact founder byline near the primary CTA.

## 1. New assets (generated via AI image gen, editorial photography style)
All saved to `src/assets/founder/` then externalized via `lovable-assets`:
- `nidia-hosting.jpg` — hosting guests at a wine table, Arrábida (reuses existing photo — keep as one of the three, rename asset var)
- `nidia-on-the-road.jpg` — new: golden hour, walking a coastal viewpoint / by the vehicle, candid
- `nidia-portrait.jpg` — new: soft editorial portrait, warm neutral tones
- `nidia-portrait-small.jpg` — tight crop (square) for byline blocks (can reuse portrait, different crop)
- `nidia-signature.svg` — new inline SVG, handwritten-style script "Nídia Almeida", stroke = `var(--charcoal)` (single hex would break tokens — SVG uses `currentColor` and inherits `text-[color:var(--charcoal)]`)

All new imagery follows brand image rules (editorial, warm, slightly desaturated, no HDR, no stock). Prompts follow the brand skill template.

## 2. /about changes
- Remove duplicated `founderAsset` figure (currently shown once mobile + once desktop sticky = same image twice).
- Replace with a **triptych gallery** inside the "Founder-built" section:
  - Desktop: 3-up grid (hosting / on-the-road / portrait), 4:5 each, subtle stagger.
  - Mobile: horizontal snap scroll, one caption per image.
- Add a **signed first-person note** block below triptych, on ivory card:
  - Eyebrow: "A note from the founder"
  - 3–4 short first-person sentences (drafted in YES voice, no banned words, no invented facts — speaks to why YES exists and the promise of personal design).
  - Signature SVG (~140px wide, charcoal), followed by "Nídia Almeida · Founder, YES Experiences Portugal" in small caps.

## 3. New reusable primitive
`src/components/ui/FounderByline.tsx` — compact block:
```
[round 56px portrait]  "One-line quote in Georgia italic, teal."
                       — Nídia Almeida, Founder
```
- Uses tokens only (`--teal`, `--charcoal-soft`, `--sand` border).
- Props: `quote`, optional `className`. Portrait + name hardcoded (single founder).
- Sits inline, max-width ~520px, works stacked on mobile.

## 4. Insert FounderByline near primary CTA on
- `/multi-day` — above the main "Plan a Multi-day Journey" CTA. Quote: *"Multi-day Portugal is where the country really opens up — we design it around your rhythm, not a fixed route."*
- `/proposal-in-portugal` — above the hero CTA pair OR in the closing CTA. Quote: *"The moment matters more than the location. We help you shape both, quietly."*
- `/corporate` — near the closing "Request a Proposal" CTA. Quote: *"Every corporate day is scoped around your team's goals — never a copy-paste template."*

## 5. Brand & guardrails
- Palette untouched: only `--teal`, `--gold`, `--ivory`, `--sand`, `--charcoal`, `--charcoal-soft`. No new hex values.
- Signature SVG uses `currentColor`; charcoal inherited.
- No parallax / no autoplay carousel on triptych (motion: fade-in only, ≤220ms per brand guardrails; /about is not `.home-energy`).
- Alt text descriptive on every image.
- Typography: eyebrow via `<Eyebrow>`, headings via `<SectionTitle>`, byline quote in Georgia italic teal (matches editorial pattern already used on /corporate + /proposal).

## Files touched
- `src/routes/about.tsx` — remove duplicate figure, add triptych + signed note.
- `src/components/ui/FounderByline.tsx` — new.
- `src/routes/multi-day.tsx`, `src/routes/proposal-in-portugal.tsx`, `src/routes/corporate.tsx` — import + insert byline.
- `src/assets/founder/` — 3 new photo assets + `nidia-signature.svg` (inline component or file).

## Out of scope
- No copy changes to CTAs themselves.
- No changes to homepage or other routes.
- No new colors, motion classes, or DB schema.
