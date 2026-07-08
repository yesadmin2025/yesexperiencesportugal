
# Meta Title & Description Audit

Read-only report. No files changed. Public, indexable routes only (admin/auth/checkout/token/QA/preview/e2e omitted — noindex or private).

## Format
Current → Proposed. Priority: **P1** dupe/inconsistent/soft-issue on high-traffic page · **P2** polish · **P3** fine as-is. File to edit is always the route file under `src/routes/`. Landing pages using `const TITLE`/`const DESCRIPTION` — edit those two constants; `head()` picks them up.

Length targets: title ≤ 60 chars, description 140–160.

---

## 1. Home — `/` — P2
- **Current title:** "Private Portugal Tours & Real-Time Builder | YES" (48)
- **Current desc:** "Design and instantly reserve a private Portugal day in the YES Studio, book a Signature tour, or plan a full journey with a local designer." (140)
- **Proposed title:** "Private Portugal Tours, Designed With a Local | YES"
- **Proposed desc:** "Private day tours, live-designed experiences and full Portugal journeys — shaped by a licensed local team from Lisbon. Instantly confirmed."
- **Why:** "Real-Time Builder" is internal jargon; softens toward brand voice.
- **File:** `src/routes/index.tsx`

## 2. About — `/about` — P3
- Current title: "About YES Experiences Portugal | Founder-Built Travel" ✓
- Current desc: "YES Experiences Portugal is a licensed private travel platform, founder-built from guest behaviour, live-designed experiences and local expertise across Portugal." ✓
- Optional polish desc: "Founder-built, licensed Portuguese travel platform — private days, live-designed experiences and full journeys, shaped from the road, not a template."
- **File:** `src/routes/about.tsx`

## 3. Signature Experiences — `/experiences` — P1
- **Current title:** "Signature Tours — YES experiences Portugal"
- **Current og:title:** "Signature Experiences — YES experiences Portugal" ← **mismatch with title**
- Current desc: "Choose one of our private experiences and enjoy it as designed, or tailor a few details." (thin, generic)
- **Proposed title:** "Signature Private Experiences in Portugal | YES"
- **Proposed desc:** "A curated collection of private Portugal days — Sintra, Arrábida, Évora and beyond. Book as designed, or quietly tailor a few details."
- Align og:title + twitter:title with the new title.
- **File:** `src/routes/experiences.tsx`

## 4. Studio — `/studio-v3` — P2
- Current title: "Studio — Design your Portugal day | YES experiences"
- Current desc: "Compose a private Portugal journey one quiet decision at a time — feeling, company, rhythm. The map awakens as you choose."
- **Proposed title:** "Design Your Private Portugal Day — YES Studio"
- **Proposed desc:** "Compose a private Portugal day one quiet decision at a time — feeling, company, rhythm. Live pricing and instant confirmation, with a local team behind it."
- **File:** `src/routes/studio-v3.tsx`

## 5. Travel Designer / Multi-day — `/multi-day` — P2
- Current title: "Travel Designer Portugal | Private Journeys by YES" ✓
- Current desc: "Full Portugal journeys, designed for you. From a few days to a full journey across Portugal, shaped around your time, rhythm and interests — delivered as a travel file." — "journey" repeats.
- **Proposed desc:** "Full private Portugal journeys, designed with a human travel designer — shaped around your time, rhythm and interests, delivered as a complete travel file."
- **File:** `src/routes/multi-day.tsx`

## 6. Day Tours — `/day-tours` — P3
- Current title: "Day Tours — YES experiences Portugal"
- Current desc: "Private day experiences across Portugal — Arrábida, Setúbal, Sintra, Évora, Douro and more. Reserve instantly, with real-time confirmation." ✓
- **Optional title:** "Private Day Tours in Portugal — Lisbon, Sintra, Arrábida"
- **File:** `src/routes/day-tours.tsx`

## 7. Corporate — `/corporate` — P3
- Current title: "Corporate & Private Groups in Portugal — YES experiences" ✓
- Current desc: ✓
- **File:** `src/routes/corporate.tsx`

## 8. Proposals — `/proposals` — P3
- Current title: "Proposals & Celebrations in Portugal — YES experiences" ✓
- Current desc: ✓
- **File:** `src/routes/proposals.tsx`

## 9. Local Stories index — `/local-stories` — P3
- Current title/desc ✓, unique, on-tone.
- **File:** `src/routes/local-stories.tsx`

## 10. Local Story article — `/local-stories/$slug` — P3
- Uses per-article `title` + `metaDescription` from content source. Assumed unique per article.
- **File:** `src/routes/local-stories.$slug.tsx` + article content source.

## 11. Contact — `/contact` — P2
- Current title: "Contact — YES experiences Portugal"
- Current desc: "Speak directly with our YES Portugal experience designers." — thin.
- **Proposed desc:** "Reach the YES team directly — quiet, human replies from local experience designers in Lisbon. WhatsApp, email or a short call."
- **File:** `src/routes/contact.tsx`

## 12. Reviews — `/reviews` — P2
- Current title: "Real guest reviews · YES Experiences Portugal" — uses `·`, rest of site uses `—`. Not premium.
- **Proposed title:** "Guest Reviews — Private Portugal Tours by YES"
- Current desc ✓.
- **File:** `src/routes/reviews.tsx`

## 13. Press — `/press` — P3
- Current title/desc ✓.
- **File:** `src/routes/press.tsx`

---

## SEO landing pages (near-duplicates — real risk)

Four "Portugal tours" pages and three "wine tour from Lisbon" pages share intent. The prior audit flagged this for a 4-week Search Console review before merging. Meta copy alone should differentiate intent clearly.

### 14. `/portugal-tours` — P1
- Title: "Portugal Tours — Private, Luxury & Small-Group by a Local" — "small-group" contradicts brand (private only). Also collides with `/private-tours-portugal` and `/luxury-tours-portugal`.
- **Proposed title:** "Portugal Tours — Private Days & Multi-Day Journeys | YES"
- Desc: "Private Portugal tours designed by a local operator — Lisbon, Sintra, Arrábida, Alentejo, Douro. Signature day tours and multi-day journeys, instantly confirmed." ✓
- **File:** `src/routes/portugal-tours.tsx`

### 15. `/private-tours-portugal` — P1
- Title: "Private Tours Portugal — Designed by a Local Operator" ✓
- Desc: "Private Portugal tours from Lisbon — Sintra, Arrábida, Alentejo, Comporta. One family, one guide, one car. Instantly confirmed, all-inclusive pricing." ✓
- **Proposed sharper title:** "Private Portugal Tours from Lisbon — One Family, One Guide"
- **File:** `src/routes/private-tours-portugal.tsx`

### 16. `/luxury-tours-portugal` — P1
- Title: "Luxury Portugal Tours — Private, All-Inclusive, By a Local" ✓
- Desc: "Luxury private tours of Portugal — Lisbon, Sintra, Arrábida, Alentejo and Comporta. Designed by a local operator, all-inclusive, instantly confirmed."
- **Proposed sharper desc:** "Understated luxury across Portugal — private car, hand-picked estates, unhurried tables. Designed and hosted by a licensed local team."
- **File:** `src/routes/luxury-tours-portugal.tsx`

### 17. `/portugal-wine-tours` — P1
- Title: "Portugal Wine Tours — Private, By a Local Operator" — overlaps `/wine-tours-lisbon` and `/private-wine-tour-lisbon`.
- **Proposed title:** "Portugal Wine Tours — Arrábida, Setúbal & Alentejo | YES"
- Desc ✓
- **File:** `src/routes/portugal-wine-tours.tsx`

### 18. `/wine-tours-lisbon` — P1
- Title: "Best Wine Tours from Lisbon — Arrábida, Comporta & Alentejo" ✓
- Desc long (~230). Trim.
- **Proposed desc:** "The best private wine tours from Lisbon — Arrábida, Azeitão, Comporta and Alentejo. Family cellars, real winemakers, door-to-door driving."
- **File:** `src/routes/wine-tours-lisbon.tsx`

### 19. `/private-wine-tour-lisbon` — P2
- Title: "Private Wine Tour from Lisbon — Arrábida, Azeitão & Setúbal" ✓
- Desc ✓ (differentiate from #18 by keeping it Arrábida/Azeitão-only, since #18 is the multi-region roundup).
- **File:** `src/routes/private-wine-tour-lisbon.tsx`

### 20. `/arrabida-wine-tour` — P2
- Title: "Arrábida Wine Tour — Private Lisbon to Azeitão & Setúbal" ✓ but 90% overlaps `/private-wine-tour-lisbon`.
- **Proposed title (differentiate):** "Arrábida Wine Tour from Lisbon — Three Family Cellars"
- Desc ✓.
- **File:** `src/routes/arrabida-wine-tour.tsx`

### 21. `/arrabida-day-trip-from-lisbon` — P3
- Title/desc ✓ — clearly differentiated (day trip framing vs wine framing).
- **File:** `src/routes/arrabida-day-trip-from-lisbon.tsx`

### 22. `/day-trips-from-lisbon` — P3
- Title: "Best Day Trips from Lisbon — Wine, Coast & Arrábida" ✓
- Desc ✓
- **File:** `src/routes/day-trips-from-lisbon.tsx`

### 23. `/sintra-day-tour-from-lisbon` — P3
- Title/desc ✓
- **File:** `src/routes/sintra-day-tour-from-lisbon.tsx`

### 24. `/alentejo-wine-tour-from-lisbon` — P2
- Title: "Alentejo Wine Tour from Lisbon | Private Évora & Cork" ✓
- Overlaps `/evora-alentejo-wine-tour` and `/evora-private-tour-from-lisbon`. Sharpen the split:
  - This page = wine-first framing (Alentejo wine).
  - `/evora-alentejo-wine-tour` = Évora + wine roundup.
  - `/evora-private-tour-from-lisbon` = Évora-city framing (heritage first).
- Desc ✓.
- **File:** `src/routes/alentejo-wine-tour-from-lisbon.tsx`

### 25. `/evora-alentejo-wine-tour` — P2
- Title: "Évora & Alentejo Wine Tour | Private Full-Day from Lisbon" ✓
- Desc slightly generic ("explore… combining…"). **Proposed desc:** "A private full day from Lisbon combining Évora's UNESCO old town, two family Alentejo wineries and a cork tradition stop — unhurried, door-to-door."
- **File:** `src/routes/evora-alentejo-wine-tour.tsx`

### 26. `/evora-private-tour-from-lisbon` — P2
- Title: "Private Évora Tour from Lisbon | Wine, Cork & Heritage" — tilt away from wine to differentiate from #24/#25.
- **Proposed title:** "Private Évora Day Tour from Lisbon — UNESCO & Alentejo"
- Desc ✓.
- **File:** `src/routes/evora-private-tour-from-lisbon.tsx`

### 27. `/itineraries/10-day-private-portugal-tour` — P3
- Title/desc ✓
- **File:** `src/routes/itineraries.10-day-private-portugal-tour.tsx`

### 28. Signature tour detail — `/tours/$tourId` (valid slugs) — P3
- Route currently has no per-tour `head()` (only invalid-slug branch, now noindex). Signature tours render via detail component which sets its own head elsewhere. Recommend confirming per-tour title/desc uniqueness in a follow-up scan (not audited here).
- **File:** `src/routes/tours.$tourId.tsx` + tour content source.

---

## Legal (all P3, uniqueness OK)

| Page | Title | File |
|---|---|---|
| `/privacy` | "Privacy Policy — YES experiences Portugal" | `src/routes/privacy.tsx` |
| `/terms` | "Terms & Conditions — YES experiences Portugal" | `src/routes/terms.tsx` |
| `/cookies` | "Cookie Policy — YES experiences Portugal" | `src/routes/cookies.tsx` |

---

## Cross-page findings

1. **Separator inconsistency** — everything uses `—`, except `/reviews` uses `·`. Standardize on `—` (P2).
2. **Brand casing drift** — mix of "YES experiences Portugal", "YES Experiences Portugal", "YES". Not strictly SEO, but worth a one-pass alignment (P2, out of scope for this audit).
3. **`og:title` ≠ `<title>`** on `/experiences` and `/studio-v3` (studio's og:title is shorter than title — acceptable, but flag). Verify per-page.
4. **Twitter tags** missing on most routes (only `/`, `/corporate`, `/proposals` set them). Not required, but adds consistency (P3).
5. **Keyword-density risk** on the four Portugal-tours + three wine-tour landing pages is a topical/cannibalization issue, not a meta-copy issue. Meta rewrites above intent-split them; the underlying content decision is still owed a Search Console review (per prior audit).
6. **No placeholder/dev titles found** on any public route. No "Lovable App" strings. No accidental duplicates beyond the intent-overlap flagged above.

---

## Priority summary

- **P1 (5):** `/`, `/experiences`, `/portugal-tours`, `/private-tours-portugal`, `/luxury-tours-portugal`, `/portugal-wine-tours`, `/wine-tours-lisbon`
- **P2 (9):** `/studio-v3`, `/multi-day`, `/contact`, `/reviews`, `/private-wine-tour-lisbon`, `/arrabida-wine-tour`, `/alentejo-wine-tour-from-lisbon`, `/evora-alentejo-wine-tour`, `/evora-private-tour-from-lisbon`
- **P3:** all others

**Risk level of proposed changes:** low. Meta-only. No routing, no schema, no content changes. Rankings may shift as intent sharpens on the cannibalization cluster.

**Next step (awaiting approval):** apply P1 + P2 rewrites, standardize `—` separator, align `og:title`/`twitter:title` with `<title>` on the edited pages.
