## Scope

Ten items across copy, NAP, media, and SEO. Grouped into three passes.

---

### Pass A — Copy & NAP

**1. WhatsApp prefill PT → EN (legacy pages)**
The exact PT string "Olá! Estou a montar a minha experiência e gostaria de uma sugestão." does not exist in the repo (grep for `Estou a montar` = 0 hits). The only Portuguese prefill on an English-language surface is in `src/routes/pt.contact.tsx:66`: `"Olá! Gostaria de saber mais sobre uma experiência YES."` — but that's a `/pt/*` route (correct locale). All English-language WhatsApp CTAs already route through `whatsappUrl()` with English messages (verified in `index.tsx`, `TrustStrip.tsx`, `WhatsAppSupportButton.tsx`, `SimpleTailorForm.tsx`, `builder/types.ts`, `multi-day.tsx`, `about.tsx`, `tailor.tsx`).

Action: run one more targeted sweep of `/contact`, `/proposals`, `/local-stories` route files + `WhatsAppFab.tsx` / `whatsapp-messages.ts` builders to confirm every English-surface prefill uses the exact target string `"Hi YES — I'd like a hand planning my day in Portugal."` and normalize any drift (e.g. `index.tsx` currently says "planning my Portugal experience"). Leave `/pt/*` routes in Portuguese.

**2. Single NAP (address + phone)**
`src/config/business-nap.ts` is already the single source: Sesimbra + `+351 911 889 992`. Guardrail test `nap-consistency.test.ts` enforces it. Action: run the test; if it passes, no change. If any component hard-codes a second address/phone, replace with imports from `business-nap.ts`.

---

### Pass B — Media

**3. Southwest Coast Signature — missing cover photo**
`southwest-vicentine-coast` gallery in `signatureToursViator.ts` still points at `media.tacdn.com` hotlinks. The tour resolver falls back to a generic when the hotlink 404s/blocks, which is why no cover appears. Action: generate one cinematic Southwest/Vicentine coast cover image via `imagegen` (fast tier, 1600×1000, jpg), place under `src/assets/tours/southwest-vicentine-coast-cover.jpg`, upload via `lovable-assets`, and wire it into the tour's local override (same mechanism the other tours already use — the "when defined AND non-empty, this REPLACES the external Viator" comment at `signatureToursViator.ts:69`).

**4. Reviews on each Signature card**
Signature tour pages currently don't render inline reviews on stop/day cards. Action: on each `tours.$tourId.tsx` page section (and the Signature index cards), render 1–2 top reviews per card using `topReviews` from `signatureToursViator.ts`, styled as a compact ivory quote block (Fraunces italic pull, gold hairline, reviewer name in Inter caption). Fallback to `aggregateRating` chip when a tour has no `topReviews`.

**5. Hotlinked `media.tacdn.com` → own assets**
~40+ hotlinks across all 8 Signature tours in `signatureToursViator.ts`. Full replacement is a large content op (needs one cover + 4-5 gallery images per tour = ~40 generated images). Given scope, do it in **two sub-batches**:

- B5a (this pass): southwest-vicentine-coast cover + gallery (5 images) — unblocks the visible bug.
- B5b (follow-up pass, will confirm before starting): remaining 7 tours' galleries.

**6. og:image → `yesexperiencesportugal.com/assets/**`
Current og:image URLs use Lovable's asset CDN (`/__l5e/assets-v1/...`) prefixed with the canonical domain. Action: move the images that back og:image tags into a stable `/assets/` path served from the site's public folder or via a redirect at `public/_headers`, and update the head() blocks in `about.tsx`, `contact.tsx`, `corporate.tsx`, `terms.tsx`, `studio-v3.tsx`, `pt.*` routes accordingly. Keeps the crawler-visible URL on our domain.

---

### Pass C — SEO

**7. Index reviews in Google**
`/reviews` and `/pt/reviews` already emit `AggregateRating` JSON-LD. To get review-rich results:

- Add `Product` or `Service` JSON-LD with `aggregateRating` + top `review` array on each Signature tour route (`tours.$tourId.tsx`) — this is what Google actually indexes and shows as star ratings.
- Ensure `/reviews` is in `sitemap.xml` and linked from the footer.
- Add `Organization` `aggregateRating` on `__root.tsx` so brand SERP shows stars.

---

## Order of execution

1. **A1 + A2** (copy sweep + NAP guardrail test) — fastest, zero risk.
2. **B3 + B5a** (Southwest cover + gallery) — user-visible bug.
3. **B6** (og:image URL migration).
4. **B4** (reviews on Signature cards).
5. **C7** (review JSON-LD on Signature routes + Organization aggregate).
6. **B5b** (remaining 7 tour galleries) — confirm before starting.

## Files touched (estimate)

- `src/routes/contact.tsx`, `proposals.tsx`, `local-stories.tsx`, `index.tsx` (prefill normalization)
- `src/routes/about.tsx`, `contact.tsx`, `terms.tsx`, `corporate.tsx`, `studio-v3.tsx`, `pt.*.tsx` (og:image)
- `src/routes/tours.$tourId.tsx` (reviews section + Product JSON-LD)
- `src/routes/__root.tsx` (Organization aggregateRating)
- `src/data/signatureToursViator.ts` (southwest gallery override)
- `src/assets/tours/southwest-vicentine-coast-*.jpg` (new)
- Guardrail: run `nap-consistency.test.ts`, add a test asserting no `media.tacdn.com` URLs remain for `southwest-vicentine-coast`.

## Open question

Item 5 (all tacdn hotlinks) is the largest chunk — 7 tours × ~5 images = ~35 generated images. Confirm you want AI-generated cinematic imagery for those, or if you'd prefer to upload your own operational photos (recommended per brand guardrails: "real operation/Viator only, never stock"). Default per plan: only do Southwest now, park the other 7 pending your photos.

&nbsp;

Animations on alll the pages !!!!