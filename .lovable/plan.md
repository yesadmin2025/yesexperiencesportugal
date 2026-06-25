## Reference site — what to extract

I compared `yesexperiences.customwebsitedesigns.org` (the reference dev) against our current preview and live `yesexperiencesportugal.com`. The reference is a static design comp — its **structure and content choices are gold**, but its execution (Unsplash imagery, generic copy, "Configurator™" voice) is **not brand-aligned** and must not be copied verbatim.

### What's worth extracting (and how it lands in our dev)


| #   | Reference idea                                                                                                                         | Our action                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | Hero with cinematic overlay, eyebrow + serif headline + supporting line + dual CTA                                                     | **Already on live.** No change to our locked hero copy.                                                                 |
| 2   | "Three Ways In" minimal numbered stepper (Signature / Tailored / Studio)                                                               | Keep our merged **Signature & Tailored** card from today. **Add a 4th card = Moments** (already done).                  |
| 3   | **"Why YES" 4-pillar editorial block** (You decide / Local from the start / Any occasion / Three ways to shape it)                     | **New on homepage.** Reuse `<EditorialCard>` primitive. Real YES voice, not "shape the story" template prose.           |
| 4   | Signature cards with **3 highlight bullets** + Book/Tailor dual CTA                                                                    | Add 3 truthful bullets per Signature on the homepage carousel — sourced from `signatureToursViator.ts`, never invented. |
| 5   | **"For moments bigger than a tour" — 4-card block** (Proposals / Celebrations / Corporate / Multi-day) with "What we handle" checklist | **New on homepage** as the Occasions deep-dive under FourWaysIn → expands the Moments card we just merged.              |
| 6   | YES Experience Studio™ interactive preview (story/timeline/map tabs)                                                                   | **Defer.** Our live Studio teaser is already real and routed; the reference is decorative.                              |
| 7   | Footer/final CTA + "A local on WhatsApp" reassurance                                                                                   | Already present on live — keep.                                                                                         |


### What we explicitly REJECT from the reference

- All Unsplash imagery — we use only real operation / Viator imagery (brand guardrail).
- "YES Experience Studio™" trademark voice, "Configurator", "Quality Assessment System: 92%", "Premium Class Private Route" — generic AI travel copy, violates YES canonical rules.
- "Build my experience fast / 60 Sec" — speed-as-feature framing.
- Nav bloat (Local Stories, Corporate, Proposals as separate nav items). Keep our clean nav: Experiences · Studio · Moments · Travel Designer · About · Contact.
- Generic "★ Smart Recommendation / Quality Score" decoration.

### Concrete homepage changes

1. **FourWaysIn** — already updated today (Signature & Tailored merged · Studio · Moments · Travel Designer). Update headline copy to *"Four ways in. One conversation."* (live wording).
2. **NEW: `<OccasionsSection />**` — three editorial cards on the homepage under FourWaysIn:
  - Proposals → `/proposals`
  - Celebrations → `/proposals`
  - Corporate → `/corporate`
   Each card uses an existing real asset (`viewpoint`, `lunch`, `cabo-da-roca` — already on live) and a short "What we shape" 3-line list. No invented features.
3. **NEW: `<WhyYesPillars />**` — 4 numbered editorial cards above the Signature carousel:
  - 01 You decide the rhythm
  - 02 Local from the start
  - 03 Any occasion
  - 04 Four ways to shape it
   Real YES voice; reuses the same card primitive as FourWaysIn for consistency.
4. **Signature carousel** — append 3 truthful highlight bullets per card, sourced from existing `signatureToursViator.ts` data. No new fields, no DB.
5. **Navbar Moments link** — point to `/#occasions` on home, `/proposals` elsewhere.

### What stays untouched

- Hero copy (locked).
- Studio teaser.
- Travel Designer book section.
- FAQ.
- Final CTA & footer.
- All routes, all data, all edge functions, no DB writes.

### Out of scope (later sprint)

- Porting the reference's interactive Studio configurator preview.
- "Local Stories" surfacing in nav.
- Animation rework.

If approved, I'll implement in this order: FourWaysIn headline → OccasionsSection → WhyYesPillars → Signature bullets → Navbar Moments anchor. No publish until you confirm in preview.

&nbsp;

On nav bar add corporate separate from proposals abd celebrations. Local stories as a blog for seo 