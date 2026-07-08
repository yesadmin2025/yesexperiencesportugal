# Local Stories → contextual CTA plan

Goal: turn each article into an SEO + conversion page without a salesy tone. Today every article has a single end-of-page CTA to one Signature. That's a conversion floor left on the table — long-form readers scroll past 4 sections and only get one exit path. Fix the pathing, not the volume.

Guardrails (from `yes-experiences-brand` skill): no banned adjectives, sentence-case body, editorial voice, one *primary* action per moment. The end-of-article CTA stays primary and unchanged. New in-body CTAs are **whispers**, not banners.

---

## 1. Where CTAs appear in the article layout

Three placements per article, mapped to reader intent as they scroll:

```text
┌───────────────────────────────────────┐
│ eyebrow · H1 · standfirst · hero      │
├───────────────────────────────────────┤
│ Section 1                             │
│ Section 2                             │
│                                       │
│   ── MID-ARTICLE WHISPER  (after §2)  │  ← contextual, single line
│                                       │
│ Section 3                             │
│ Section 4                             │
├───────────────────────────────────────┤
│ END-OF-ARTICLE PRIMARY CTA  (kept)    │  ← unchanged: Signature deep-link
│   + relatedSignatures row (kept)      │
├───────────────────────────────────────┤
│ FAQ (if any)                          │
├───────────────────────────────────────┤
│ FOOTER-ADJACENT SECONDARY RAIL        │  ← 2 muted links, editorial voice
│   "Prefer a ready-made route?" · …    │
└───────────────────────────────────────┘
```

- **A. Mid-article whisper** — inserted after `sections[Math.floor(len/2)]`. One sentence, gold hairline above, no button chrome. Feels like the writer aside, not an ad. Only present when the article's `topic` maps to a Studio path.
- **B. End-of-article primary** — the existing `ctaLead` + `ctaLabel` + Signature link. No change. This remains the article's one loud moment.
- **C. Footer-adjacent secondary rail** — two ghost links (Studio + "write to a local"). Sits just below related-signatures, above the site footer. Same on every article; differs only by the pre-filled Studio intent it deep-links to.

Total conversion surfaces per article: **3**, only one loud. Non-editorial mid-article banners (image blocks, coloured cards) are explicitly rejected.

---

## 2. Reusable component recommendation

One primitive, three placement wrappers. Fits the existing `@/components/ui` primitive pattern (`Eyebrow`, `SectionTitle`, `CtaButton`, `EditorialCard`).

```text
src/components/local-stories/
  ArticleCTA.tsx           // <ArticleCTA variant="whisper"|"rail"|"primary" intent={…} />
  articleCtaResolver.ts    // (article) => { topic, ctas: {whisper, rail} }
```

- **`<ArticleCTA variant="whisper">`** — gold hairline + italic Georgia sentence with an underlined gold link. No button. `prefers-reduced-motion` safe. Renders inside `.prose-yes` between sections.
- **`<ArticleCTA variant="rail">`** — two-column row of ghost links, Inter uppercase eyebrow voice + gold arrow. Ships below `relatedSignatures`.
- **`<ArticleCTA variant="primary">`** — thin wrapper around existing `<CtaButton>` so the current end-of-article block adopts the same event schema. Visually identical to today.

`articleCtaResolver` maps `article.topic` → CTA config. Topic is derived from a new optional `topic` field on `LocalStoryArticle` (`"wine" | "sintra" | "arrabida" | "multi-day" | "corporate" | "moments" | "region-pick"`), with a fallback that infers from `eyebrow`/`slug` so we don't need to backfill all 8 articles on day one.

Deep-links are typed against `signatureTours` so a bad slug breaks the build, not the page.

---

## 3. Example copy variations (editorial, on-voice)

All lines are sentence case, no banned adjectives, em dash allowed. Mid-article whispers stay under ~14 words.

**Topic: wine (e.g. Setúbal, Palmela, "Best wine regions near Lisbon")**
- Whisper: *Want this as a private day? — design it in the Studio.*
- Whisper alt: *Prefer we handle the pairings? — see the Arrábida Signature.*
- Rail L: *Not sure which region fits you?* → **Write to a local**
- Rail R: *Rather start from a ready-made route?* → **Explore Signature Experiences**

**Topic: sintra**
- Whisper: *Want Sintra without the queues? — start it in the Studio.*
- Whisper alt: *Or take the paced version we designed —* **Sintra & Cascais Signature**.
- Rail: same as above, Studio intent pre-filled with `region=sintra`.

**Topic: arrabida**
- Whisper: *Want this as a private day with lunch by the water? — open the Studio.*
- Whisper alt: *Or book the day we take our own friends on —* **Arrábida Wine Signature**.

**Topic: multi-day (e.g. "3 days south of Lisbon")**
- Whisper: *Turning this into a two- or three-day journey? — a local designer can shape it with you.*
- Rail L: **Talk to a Travel Designer** · Rail R: **See multi-day journeys**

**Topic: corporate / occasion / celebration**
- Whisper: *Planning this for a team or a milestone? — we build these privately.*
- Rail L: **Corporate & retreats** · Rail R: **Celebrations & Moments**

**Topic: region-pick (comparison articles: "Arrábida vs Sintra")**
- Whisper: *Still torn? — tell a local what your day should feel like.*
- Rail L: **Write to a local** · Rail R: **Design it in the Studio**

Copy lives in `articleCtaResolver.ts` so a non-dev can edit voice without touching JSX.

---

## 4. Files & components affected

**New (3 files):**
- `src/components/local-stories/ArticleCTA.tsx` — the primitive.
- `src/components/local-stories/articleCtaResolver.ts` — topic → copy + deep-links + tracking metadata.
- `src/components/local-stories/__tests__/articleCtaResolver.test.ts` — asserts every existing article resolves to a valid Signature slug + a valid topic.

**Edited (3 files, small):**
- `src/routes/local-stories.$slug.tsx` — 3 insertions: `<ArticleCTA variant="whisper">` inside the `sections.map` at the midpoint, and `<ArticleCTA variant="rail">` after the `relatedSignatures` block. Duplicate the same 2 insertions in the DB-post branch (line ~503) so DB-authored articles get the same treatment. The existing end-of-article block is wrapped in `<ArticleCTA variant="primary">` for tracking parity — no visual change.
- `src/content/local-stories-articles.ts` — add optional `topic?: LocalStoryTopic` field to the type; backfill on the 8 existing entries in the same edit (one line each). Fallback resolver means unshipped/DB articles still work without it.
- `src/index.css` / `styles.css` — one `.article-cta-whisper` utility (gold hairline top + `font-serif italic text-[color:var(--charcoal-soft)]`). No new tokens.

**No changes to:** `journal_posts` schema, JSON-LD, hero, section rendering, FAQ block, `relatedSignatures`, sitemap. Tracking hooks slot straight into the `track()` wrapper from the previous plan — `local_story_cta_click` gains `{ variant, topic, target }` params.

**Not touched (deliberate):** the article body itself. Zero prose changes; the whisper is inserted between existing sections and reads as a caption, not an interruption.

---

## 5. Risk level

**Low.**

- Purely additive UI; end-of-article CTA and Signature deep-links are unchanged, so existing conversion path is preserved even if `<ArticleCTA>` renders nothing.
- Type-safe Signature deep-links (build fails on bad slug).
- Resolver has a safe fallback → an article with no `topic` field falls back to the current single primary CTA. No article can silently break.
- Motion respects `prefers-reduced-motion` (whisper has no motion; rail uses the existing `-2px` hover).
- SEO neutral to positive: two extra internal links per article to Studio/Signature/Contact strengthens topical linking without keyword stuffing or duplicate content.
- Voice risk mitigated by centralising all copy in one file for review before ship.

The only real risk is copy tone drift over time — mitigated by keeping every line in `articleCtaResolver.ts` behind a code review, not editable per-article.

---

## 6. Can this be implemented article-by-article?

**Yes — cleanly.** The rollout is:

1. **Turn 1 — infra only (no user-visible change).** Ship `<ArticleCTA>`, resolver, styles. Resolver returns `null` for every article. Zero risk.
2. **Turn 2 — first 3 articles.** Add `topic` to `arrabida-wine-day`, `best-wine-regions-near-lisbon`, `sintra-day-tour-from-lisbon`. Ship. Watch `local_story_cta_click` for 48h.
3. **Turn 3+ — remaining articles + multi-day + corporate.** Same pattern, one topic at a time.
4. **DB articles** — inherit automatically once their `region` column maps to a topic (add a `regionToTopic()` helper). No per-article code change required.

Because activation is per-article (via the presence of `topic`), we can also A/B a whisper variant on a single article without a schema migration — just swap the resolver's output for that slug.

---

## Open confirmations before coding

1. **Contact surface for "write to a local".** Is that `/contact`, a WhatsApp deep-link, or a Studio pre-step? (Skill §9 doesn't define this CTA — need the canonical route.)
2. **Multi-day topic destination.** Is "Travel Designer" a route (`/travel-designer`?), a `/contact?intent=multi-day` link, or the Studio in multi-day mode?
3. **Whisper cadence on short articles.** Some articles only have 3 sections. Show the whisper only when `sections.length >= 4`, or always after section 2? Recommendation: gate at `>= 4` so 3-section articles keep a single strong exit.
