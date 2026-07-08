# Press & Brand Kit — Audit + Improvement Plan

Review of `src/routes/press.tsx` against the partnerships / backlinks / media-citations checklist. **No code changes yet.**

---

## 1. Checklist coverage — what's there vs. missing


| Item                                   | Status              | Notes                                                                                                                                                                 |
| -------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Official company description           | ⚠️ Partial          | Only in `<meta description>`. Not on-page as a labelled "About the company" block partners can copy.                                                                  |
| Short copy-ready paragraph             | ⚠️ Only for founder | `FOUNDER_BIO_SHORT` exists. **No short company boilerplate.**                                                                                                         |
| Long copy-ready paragraph              | ⚠️ Only for founder | `FOUNDER_BIO_LONG` exists. **No long company boilerplate.**                                                                                                           |
| Founder bio                            | ✅ Present           | Short + long. Good.                                                                                                                                                   |
| Licence information                    | ✅ Present           | RNAAT 31/2023 in NAP + citation block.                                                                                                                                |
| Service areas                          | ✅ Present           | Lisbon · Sintra · Arrábida · Sesimbra · Alentejo · Évora.                                                                                                             |
| Contact details                        | ✅ Present           | Phone, email, hours, languages.                                                                                                                                       |
| Official website                       | ✅ Present           | In NAP + citation block.                                                                                                                                              |
| Logo usage note                        | ❌ Missing           | Assets are linked but no do/don't rules, clear space, min size, colour, background guidance. `public/brand/README.md` has this — page doesn't surface it.             |
| Links to Tripadvisor / social profiles | ❌ Missing           | Footer has Instagram, Facebook, Tripadvisor — press page links none of them. Critical for journalist verification.                                                    |
| Suggested citation text for partners   | ⚠️ Partial          | NAP citation block exists (directory-style). **No prose-style "when mentioning us, please write…" one-liner** for editorial partners.                                 |
| Awards / recognition / press mentions  | ❌ Missing           | No "As featured in" or review-count/rating trust line (700+ 5★ per `llms.txt`).                                                                                       |
| Fact sheet / key numbers               | ❌ Missing           | Year founded is there; no guests-served, tours-run, review count, languages count as scannable stats.                                                                 |
| High-res press images                  | ❌ Missing           | No downloadable founder headshot or hero imagery pack — journalists will ask.                                                                                         |
| Brand board PDF                        | ❌ Missing           | `public/brand/yes-brand-board.pdf` exists but isn't linked.                                                                                                           |
| Full logo kit                          | ⚠️ Weak             | Only links `logo-script.svg/png` + favicon. The 6 lockups in `public/brand/svg/` + `manifest.json` aren't exposed.                                                    |
| JSON-LD `Organization`                 | ❌ Missing           | Only `Person` (founder) + Breadcrumb. An `Organization` schema with `sameAs` (socials, Tripadvisor) is the single highest-leverage add for citations/knowledge-panel. |
| `sameAs` social profiles in schema     | ❌ Missing           | Same as above — needed for Google entity graph.                                                                                                                       |


---

## 2. What to improve

1. **Add an on-page "About YES Experiences Portugal" section** with short + long boilerplate paragraphs (mirrors the founder-bio pattern). This is the #1 gap — partners currently have no company copy to lift.
2. **Add "Suggested wording for partners"** — one prose sentence + one 2-line version they can paste into articles/roundups.
3. **Add "Logo usage" section** — clear space, minimum size, background rules, do/don't. Pull from `public/brand/README.md` and link the brand board PDF + `manifest.json`.
4. **Expand brand assets** to expose all 6 lockups (centered/horizontal × full/mono-dark/mono-light) as SVG + PNG downloads. Link the brand board PDF.
5. **Add "Find us online"** — Tripadvisor, Instagram, Facebook, Viator (verify URL) as verification links for journalists. Use footer URLs as source of truth.
6. **Add `Organization` JSON-LD** with `name`, `url`, `logo`, `sameAs: [instagram, facebook, tripadvisor, viator]`, `address`, `telephone`, `email`, `founder` → link to existing `personFounderLd`. Biggest SEO/citation lever on the page.
7. **Add a trust/fact strip** — founded 2022 · RNAAT 31/2023 · 700+ 5★ reviews · 3 languages · service across Portugal Scannable, journalist-friendly.
8. **Add press contact hours + response SLA** ("Responses within 24h on weekdays") — reduces friction for time-boxed journalists.
9. **Founder headshot download** — even one square 1200×1200 JPG. Placeholder link if asset not yet available, with note to email for high-res.
10. **Meta upgrades** — add `og:image` pointing to the brand board PNG (absolute HTTPS), add `twitter:card` — currently missing.

---

## 3. Suggested copy blocks

**Company boilerplate — short (≤ 60 words)**

> YES Experiences Portugal is a licensed Portuguese tour operator founded in 2022 (RNAAT 31/2023) designing private, emotionally intelligent day tours and multi-day journeys across Portugal. Founded by Nídia Almeida, the studio works with a curated network of family wineries, chefs and local hosts to deliver experiences you cannot book off a shelf.

**Company boilerplate — long**

> YES Experiences Portugal is an independent Portuguese travel studio and licensed tour operator (RNAAT 31/2023), founded in 2022 in Sesimbra by Nídia Almeida. The company designs private day tours, bespoke multi-day journeys and private occasions — proposals, anniversaries, corporate retreats — across  Portugal. Every itinerary is built around the guests rather than a fixed catalogue, drawing on long-standing relationships with family wineries, chefs, artisans and cultural hosts. YES has earned 700+ five-star reviews across multiple platforms such as Google, Tripadvisor and Viator, and operates in English, Portuguese and Spanish.

**Suggested one-line partner citation**

> Private tours and multi-day journeys by **YES Experiences Portugal** — a licensed Portuguese travel studio (RNAAT 31/2023) based in Sesimbra: [yesexperiencesportugal.com](https://yesexperiencesportugal.com).

**Logo usage note (short)**

> Please use the official lockups from this page without modification. Maintain clear space equal to the height of the "Y" on all sides. Minimum width: 120px (digital) / 30mm (print). Use the mono-light variant on dark backgrounds and the mono-dark variant on light backgrounds. Do not recolour, stretch, rotate, add effects, or place the logo on low-contrast imagery. Full palette on the brand board.

**Fact strip**

> Founded 2022 · RNAAT 31/2023 · 700+ five-star reviews · 3 languages · across Portugal 

---

## 4. Should the footer include "Press & Brand Kit"?

**Yes — but subtly.** Place under the existing footer's utility/legal column (near Terms / Privacy), labelled **"Press & brand"**. Rationale:

- Journalists, directory editors and partnership scouts look in the footer first — this is the #1 request from anyone building citations.
- It signals institutional legitimacy (only real operators publish a press page).
- It's a passive backlink magnet: linked from every page = crawlers surface it fast.
- Keep it out of the primary nav to avoid diluting the customer-facing paths (Signature / Studio / Multi-day / Moments).

Also add `/press` to `public/llms.txt` under Pages and to `src/routes/sitemap[.]xml.ts` (priority 0.4) if not already there.

---

## 5. Files / components affected

- `src/routes/press.tsx` — main rewrite target (add sections 1–9 above, add `Organization` JSON-LD, add `og:image` + `twitter:card`).
- `src/lib/jsonld.ts` — add `organizationLd()` helper with `sameAs` array (mirrors `personFounderLd` pattern).
- `src/components/Footer.tsx` — add "Press & brand" link in the legal/utility column.
- `public/llms.txt` — add `/press` entry.
- `src/routes/sitemap[.]xml.ts` — add `/press` (priority 0.4, monthly).
- `public/brand/` — no code change; may need one square founder headshot JPG added later (owner-supplied).

No new components required; reuse `SiteLayout`, `Eyebrow`, `SectionTitle`, existing `<Row>` helper.

---

## 6. Risk level

**Low.**

- All changes are additive on a low-traffic route.
- No slug rename, no redirect, no schema migration.
- Footer link addition is a single `<Link>` — no layout risk.
- `Organization` JSON-LD is well-understood; validate with Rich Results test before ship.
- Only content risk: the "700+ five-star reviews" figure and Viator URL must be verified with the owner before publishing (present in `llms.txt` and skill notes but worth confirming current).

---

## Suggested build order (when approved)

1. Add `organizationLd()` helper + confirm social URLs with owner.
2. Rewrite `press.tsx` with new sections + `Organization` JSON-LD + `og:image` + `twitter:card`.
3. Footer link + `llms.txt` + sitemap.
4. Validate JSON-LD in Google Rich Results test, then publish.

Estimated effort: **~1.5–2h**.