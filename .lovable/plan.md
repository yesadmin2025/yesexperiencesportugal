# Final QA Audit

Scope: routes under `src/routes/`, `Navbar`, `Footer`, floating actions, checkout drawer, tour pages, Studio flow, head metadata, and copy consistency. Audit is static (source + Playwright screenshots from prior turns) — I have not re-run every checkout end-to-end, but every link target, CTA route, and metadata block was inspected.

---

## 1. Bugs found

| # | Bug | Where | Severity |
|---|---|---|---|
| B1 | Hydration mismatch warning on every route (data-tsd-source column drift between server and client). Cosmetic but pollutes the console and can mask real hydration errors. | React devtools source-mapping plugin, visible on `/` | **P2 (Low)** |
| B2 | Dev/QA routes are publicly reachable in production: `/hero-verify`, `/preview-check`, `/qa/hero`, `/qa/mobile`, `/brand-qa`, `/typography-audit`, `/e2e/postmessage-probe`, `/studio-drift`, `/studio-v2`, `/admin.builder-images-qa`. Indexable, no `noindex`, some render blank/dev UI. | `src/routes/*` | **P1 (High)** |
| B3 | Legacy Studio surface still shipped: `/studio-v2` and `/studio-v2/i/$token` exist alongside canonical `/studio-v3`. Nothing links to them, but they're crawlable. | `src/routes/studio-v2*.tsx` | **P1 (High)** |
| B4 | `admin.error-logs.tsx`, `admin.tour-link-audit.tsx`, `proposals.tsx`, `studio-v2.tsx` have **no `head()`** — inherit root defaults, so they appear as "YES experiences Portugal" with root description. `/proposals` is user-facing. | listed routes | **P2 (Medium)** for `/proposals`, low for admin |
| B5 | WhatsApp FAB rendered site-wide via `__root.tsx` (`WhatsAppSupportButton`); confirm it is hidden on `/admin/*`, `/checkout/*`, and `/booking-confirmed` to avoid overlap with primary checkout actions. Needs runtime confirmation. | `src/routes/__root.tsx:243` | **P2 (Medium)** |

## 2. Broken / risky links

| # | Link | Issue | Severity |
|---|---|---|---|
| L1 | Footer "Occasions → Private Groups" points to `/contact` — same target as "Company → Contact". Not broken but duplicate destination under a distinct label sets a false expectation. | `Footer.tsx` Occasions col | **P2 (Low)** |
| L2 | Nav "Moments" points to `/proposal-in-portugal` (route exists, no `head()` mismatch — but label ↔ URL drift; SEO title must match the "Moments" positioning). | `Navbar.tsx` desktopLinks | **P2 (Low)** |
| L3 | Footer `Signature Experiences` lists 12 tour slugs going to `/tours/$tourId`. Slugs must all resolve in the tour data source. Slugs to verify: `arrabida-wine-allinclusive`, `wild-beaches-picnic`, `arrabida-boat`, `tiles-workshop`, `azeitao-cheese`, `sintra-cascais`, `troia-comporta`, `evora-alentejo`, `tomar-coimbra`, `fatima-nazare-obidos`, `roman-heritage-alentejo`, `southwest-vicentine-coast`. Any 404 = broken footer entry on every page. | `Footer.tsx` | **P0 (Critical)** to verify |
| L4 | Facebook link `facebook.com/yesexperiencesportugal` — confirm the page exists and is public (Instagram and Tripadvisor look valid). | `Footer.tsx` Connect col | **P1 (High)** to verify |
| L5 | WhatsApp deep links use `https://wa.me/351911889992` (no leading `+`) consistently — OK. Emails use both `info@` and `hello@yesexperiencesportugal.com` (see C1). | multiple | **P2 (Low)** |
| L6 | No obvious placeholder URLs (`example.com`, `TODO`) in user-facing routes — the one hit (`sofia@example.com`) is in an internal email template preview. | `src/lib/email-templates/internal-lead.tsx:114` | **P3** |

## 3. Copy inconsistencies

| # | Inconsistency | Severity |
|---|---|---|
| C1 | **Email address drift.** Legal pages use `info@yesexperiencesportugal.com` (`privacy.tsx`, `terms.tsx`, `about.tsx`, `unsubscribe.tsx`) while `/cookies` uses `hello@yesexperiencesportugal.com`. Press page uses a separate `NAP.press`. Pick one canonical support email and one press email. | **P1 (High)** |
| C2 | **RNAAT formatting drift.** Footer: `RNAAT nº 31/2023`. Press + CredentialStrip + JSON-LD: `RNAAT 31/2023` (no `nº`). Footer brand tagline: `Licensed tour operator (RNAAT)` with no number. Standardize on `RNAAT nº 31/2023`. | **P1 (High)** |
| C3 | **No user-facing cancellation policy referenced anywhere** (no "free cancellation up to X hours", no policy link in checkout drawer, tour pages, terms, or footer). For a booking site this is both a trust and legal gap. Either add a single canonical policy line + `/terms` anchor, or state "See booking terms" everywhere consistently. | **P0 (Critical)** |
| C4 | Homepage step label `"Local on WhatsApp"` vs About `"WhatsApp and email replies usually within the hour"` vs footer `"WhatsApp Support"` vs CredentialStrip `"local support 7 days a week"`. All true, but pick one hero phrase and echo it. | **P2 (Low)** |
| C5 | Sesimbra vs "operates nationwide across Portugal" — resolved in Press but Footer tagline still reads *"Based in Sesimbra, designing private journeys across Portugal"* which is on-brand; keep this exact phrasing everywhere else the base location is mentioned. | **P3** |
| C6 | Spelling: no misspellings surfaced in routes I read. Not exhaustively spellchecked — recommend running one pass with a shared brand glossary (Arrábida, Évora, Tróia, Óbidos, Azeitão, Fátima, Nazaré, Nídia). | **P2 (Low)** verification task |

## 4. Technical SEO issues

| # | Issue | Severity |
|---|---|---|
| S1 | Dev/QA routes (B2) are not `noindex` — they'll appear in the sitemap generator if included. Verify `src/routes/sitemap[.]xml.ts` excludes them AND add `robots: noindex` meta so if crawlers find them another way, they drop. | **P1 (High)** |
| S2 | `/proposals`, `/studio-v2`, `admin.*` missing `head()` → duplicate titles, no unique meta descriptions. | **P1 (High)** |
| S3 | Potential duplicate/near-duplicate content across long-tail SEO pages: `/portugal-tours`, `/luxury-tours-portugal`, `/private-tours-portugal`, `/portugal-wine-tours`, `/day-tours`, `/day-trips-from-lisbon`, `/wine-tours-lisbon`, `/private-wine-tour-lisbon`. Need to confirm each has a unique H1, meta title, meta description and clear internal linking target — otherwise Google will pick one and demote the others. | **P1 (High)** verification |
| S4 | Canonical + `og:url` sanity check on every leaf — the head-meta guidance requires each leaf to self-reference. Needs a spot audit on all tour landing pages and the SEO long-tail pages above. | **P2 (Medium)** |
| S5 | `og:image` presence per leaf: tour pages should point to the tour hero image; long-tail SEO pages need a real cover. Any missing → social shares fall back to root/generic. | **P2 (Medium)** |
| S6 | `robots.txt` should disallow the dev/QA + admin surfaces (`/admin`, `/hero-verify`, `/preview-check`, `/qa/`, `/brand-qa`, `/typography-audit`, `/e2e/`, `/studio-drift`, `/studio-v2`). | **P1 (High)** |

## 5. Layout — mobile & desktop

Prior mobile polish audit already addressed FAB overlap, CTA wrapping and eyebrow clipping. Remaining items:

| # | Issue | Severity |
|---|---|---|
| M1 | `/moments` and `/faq` still 404 (from prior audit) — nothing in current nav links to them, but any inbound link, sitemap entry, or press mention will 404. Product decision needed: build the pages or ensure no external references. | **P1 (High)** |
| M2 | Desktop layout: not re-audited this turn. Should sweep `/experiences`, `/studio-v3`, `/multi-day`, `/corporate`, `/press` at 1440 to confirm 4-col footer, credential strip, and nav feel balanced. | **P2 (Medium)** verification |

## 6. Recommended fix order

**P0 — Ship-blockers (do first):**
1. **C3** — add a canonical cancellation policy line (one sentence, echoed on tour pages + checkout drawer + terms).
2. **L3** — verify all 12 footer tour slugs resolve; remove or fix any 404.

**P1 — High (same PR window):**
3. **B2 + S1 + S6** — add `robots: noindex` head to all dev/QA routes and disallow them in `robots.txt`; confirm sitemap excludes them.
4. **B3** — remove or `noindex`+`disallow` `/studio-v2*`.
5. **C1** — pick one canonical support email; global replace.
6. **C2** — standardize `RNAAT nº 31/2023` everywhere (Footer tagline, CredentialStrip, Press, JSON-LD).
7. **B4 / S2** — add `head()` with unique title + description + og to `/proposals` (and `/studio-v2` if kept).
8. **S3** — spot-check the 8 long-tail SEO pages for unique titles / descriptions / H1.
9. **M1** — decide fate of `/moments` and `/faq` (build or scrub references).
10. **L4** — verify Facebook page URL resolves.

**P2 — Medium (next pass):**
11. **B5** — confirm WhatsApp FAB is suppressed on `/checkout/*`, `/booking-confirmed`, `/admin/*`.
12. **S4 + S5** — canonical / og:url / og:image spot audit on tour + SEO landing pages.
13. **L1 / L2** — rewire footer "Private Groups" and confirm "Moments" title matches nav label.
14. **C4** — align WhatsApp / support micro-copy.
15. **M2** — desktop sweep 1440.

**P3 — Nice-to-have:**
16. **B1** — investigate `data-tsd-source` hydration warning (source-map plugin, likely non-blocking).
17. **C5 / C6** — brand glossary + shared spellcheck pass.

---

Say the word and I'll execute in the P0 → P3 order above (or a subset). I'd suggest starting with the P0 pair + C1/C2/B2 grouped as one focused pass, since those are the ones a visitor or crawler would actually notice.
