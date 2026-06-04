## Homepage Evolution Plan — Four Ways In (preserve identity, raise the bar)

**Non-negotiable:** YES has **four paths**, not three. Signature · Studio · Travel Designer · Moments (Proposals/Celebrations/Corporate). The reference site's 3+1 split is rejected — we keep our four-door architecture and lift execution instead.

This plan only borrows what reinforces YES's editorial/cinematic tone. It rejects everything that turns YES into a SaaS configurator (Quality Score, TM badges, "Add in 1‑Click", Step X of 11, stock imagery, "Premium Class" labels).

---

### P1 — Hero refinement (low effort, high impact)

Keep current `CinematicHero` and approved copy. Refine atmosphere only:

- Deepen overlay slightly (more cinematic silence around the headline).
- Tighten microcopy under the CTAs to one editorial line: *"choose another that brings more clarity* 
- Confirm reduced-motion and visual-regression baselines still pass.

No structural change. No new section.

---

### P2 — Studio Preview block (the real differentiator)

A live, *editorial* glimpse of the Studio on the homepage — **not** a configurator mock with scores and TM badges.

Placement: replaces the current static "Experience Studio (promoted)" section (block 4 in `approved-homepage-structure.ts`), same `aria-labelledby="studio-title"`, same spacing tier. No new block, no order change, structure lock stays green.

What it shows (mobile-first, ~520–620px tall):

- Left rail: 3 quiet "moves" the traveller can make (mood · pace · table). Tap to swap.
- Right rail: a soft-fading editorial line + a real route line drawn on a muted map crop + a discreet "from €…" line (no "Quality Score", no percent bar, no "1‑Click").
- Single CTA: **Open the Studio →** (canonical `CtaButton`, gold sheen on hover, scoped to `.home-energy`).

Voice: `YES — your day is taking shape.` Never "Smart Recommendation".

Reuses existing tokens, `PremiumMap`/`BuilderMap` crop, no new dependencies, no invented data.

---

### P3 — Keep ThreePathsSection as **four cards**, sharpen the rhythm

Do **not** collapse to 3+1. Instead, give the four cards a clearer visual cadence so the eye reads them as: *Curated · Live · Bespoke · Occasion*.

- Keep 4-card grid (`sm:grid-cols-2 lg:grid-cols-4`) — already correct.
- Add a one-word *role tag* above each label so the four doors are instantly legible:
  - 01 Signature → **Curated**
  - 02 Studio → **Live**
  - 03 Travel Designer → **Bespoke**
  - 04 Moments → **Occasion**
- Tighten the body copy on Travel Designer + Moments so all four cards land at similar length (current Travel Designer card is heavier than the others).
- No layout, no color, no font change.

---

### P4 — FAQ block before final CTA

Add **one** new section between `groups` and the final CTA: `aria-labelledby="faq-title"`, 5–7 questions, Radix `Accordion` (already in repo), editorial styling, no icons-as-decoration.

Questions cover the real friction points (the four doors, instant reservation truth-mode, designer involvement, payments, languages, group size, response time). All answers truthful — TEST MODE rules respected (Studio = instant; Travel Designer / Moments = human, fast response).

Update `approved-homepage-structure.ts` (block 7 = FAQ, block 8 = Final CTA — the spec already lists FAQ but it's a duplicated entry; clean that up) and the matching structure test + Playwright spec in the same change.

---

### P5 — Final CTA: dual surface

Keep the current final CTA section. Add a second, quieter line beneath the primary CTA:

- Primary: **Design your Portugal** → `/studio-v2`
- Quiet line: *"Prefer a human? A local is one message away."* → opens WhatsApp (already an allowed *optional* support channel; never primary).

No new section, no order change.

---

### What we are NOT doing (explicit)

- No "Experience Quality Score", no "92%", no percent bars, no TM, no "1‑Click", no "60 Sec" badges.
- No collapsing of the four paths into 3+1.
- No new hero, no new visual identity, no parallax outside `.home-energy`.
- No invented tours, stops, partners, prices, or itinerary content.
- No competitor comparisons or invented superlatives.

---

### Order of execution

1. P1 Hero refinement (smallest, lowest risk).
2. P3 Four-card rhythm sharpen.
3. P4 FAQ section + structure lock update.
4. P5 Final CTA dual surface.
5. P2 Studio Preview block (biggest, ship last so structure tests stay green throughout).

Each step ships independently, with the relevant test suite (`homepage-structure`, `homepage-typography-scale`, `hero-*`, `no-horizontal-overflow`) green before moving on.

---

### Technical notes

- Files touched: `src/components/home/ThreePathsSection.tsx`, `src/routes/index.tsx`, new `src/components/home/StudioPreview.tsx`, new `src/components/home/HomeFAQ.tsx`, `src/content/approved-homepage-structure.ts`, matching tests under `src/routes/__tests__/` and `e2e/`.
- All copy passes through the brand guardrails (no banned words, sentence case, Montserrat + Georgia italic + Inter).
- All motion stays inside `.home-energy` and respects `prefers-reduced-motion`.
- No DB changes. No new env vars. No new dependencies.

Confirm and I'll start with P1 + P3 in the same pass.