## Audit of the current /corporate page

Read: `src/routes/corporate.tsx`, `src/content/seo-faq.ts` (CORPORATE_FAQ), `src/content/editorial-service-images.ts`, `src/lib/jsonld.ts`, `src/lib/analytics-events.ts`.

### 1. Structural issues found

- **Scale is invisible.** Nothing above the FAQ states group capability. "100+" appears only inside one FAQ answer.
- **Geographically restrictive.** The hero lists "Lisbon and Sintra to the Arrábida coast, the Alentejo, the Douro"; FAQ answers list Sesimbra/Comporta/Sintra. This reads as a regional operator.
- **Only three service blocks** (Executive & Incentive · Off-sites & Retreats · Client hosting & VIP). Team building, incentive programmes and large corporate groups are not distinct formats, despite team building being the SEO title's lead term.
- **"Small groups" wording** appears in two places (see §2) and frames VIP hosting as the small-group service.
- **FAQ is a plain `<dl>`, not an accordion**; no open interaction, no analytics, and only 3 questions.
- **No Service JSON-LD.** Only BreadcrumbList + FAQPage today.
- **No corporate-specific analytics.** `corporate_lead` exists in the catalogue; none of the nine requested events exist or fire.
- **CTA inconsistency:** hero says "Plan a Group Experience", closing says "Request a Proposal"; both go to `/contact`, which is fine and stays.
- **Contrast/spacing:** body copy uses `--charcoal-soft` throughout including small 14px operational lines (`text-sm`) — the weakest text on the page; FAQ `<dd>` sits at 15px soft. Hero paragraph is a single long block with no measure cap on mobile.
- **No internal links** anywhere on the page except `/contact`.

### 2. Every "small group"-style occurrence

| File | Line | Current text |
|---|---|---|
| `src/routes/corporate.tsx` | 79 | "Small groups · private settings · careful pacing · NDAs welcome." |
| `src/content/seo-faq.ts` | 22 | "From small executive off-sites of 6 to 12 people up to full-company retreats of 100+…" |
| `src/routes/corporate.tsx` | 58 | "Private groups of any size" — vague, replaced by explicit scale language |

### 3. Copy: current vs proposed

| Slot | Current | Proposed |
|---|---|---|
| Hero eyebrow | Corporate Retreats | CORPORATE, INCENTIVES & GROUPS |
| H1 | Team building in Portugal, *designed by locals.* | Corporate experiences in Portugal, *designed by locals.* |
| Hero body | "…from Lisbon and Sintra to the Arrábida coast, the Alentejo, the Douro and beyond…effortless, not arranged." | Supplied paragraph (team building, incentives, retreats, off-sites, client hosting, celebrations; "across Portugal"; "leadership teams to groups of 100+"), no region list |
| Hero CTAs | Plan a Group Experience / Talk to a Local | PLAN A CORPORATE EXPERIENCE / TALK TO A LOCAL |
| Block 1 | "Executive & Incentive — A day that feels effortless, not arranged." | New positioning section: DESIGNED FOR THE PURPOSE / "Built around the team. Scaled around the group." + supplied editorial line, body and operational proof line |
| Block 2 | "Off-sites & Retreats" | Folded into the new Formats grid |
| Block 3 | "Client Hosting & VIP — Small groups · …" | Formats card, detail line without "small groups" |
| New | — | PORTUGAL, BEYOND THE MEETING ROOM / "Local knowledge, across the country." + supplied body and supporting line |
| New | — | WHAT WE DESIGN / "Different briefs. One local team." — six formats: Team building · Incentive programmes · Corporate retreats · Executive off-sites · Client hosting & VIP · Large corporate groups (all supplied copy verbatim) |
| New | — | Scale line above FAQ: "From small leadership teams to corporate groups of 100+." |
| FAQ | 3 questions, region-listing answers | 5 supplied questions/answers, accordion |
| Closing | "Tell us about your group." + "Real driving times, real venues, real partners…" | START WITH THE BRIEF / same headline / supplied supporting + proof line; "real driving times…" demoted to a small reassurance line |
| Closing CTAs | Request a Proposal / Talk to a Local | REQUEST A CORPORATE PROPOSAL / TALK TO A LOCAL |

### 4. SEO metadata: current vs proposed

| Tag | Current | Proposed |
|---|---|---|
| title | Corporate Events & Team Building in Portugal \| YES | unchanged (already matches the brief) |
| description | "Private corporate experiences, team-building activities and group events in Lisbon, Sesimbra, Arrábida and across Portugal." | "Private corporate events, team building, incentive travel, executive retreats and group experiences across Portugal, designed and coordinated locally." |
| og:title | (inherits page title) | "Corporate Experiences Across Portugal \| YES" |
| og:description | same as meta description | "Team building, incentives, retreats, executive off-sites and private corporate groups across Portugal, coordinated from brief to delivery." |
| canonical / og:url | `https://yesexperiencesportugal.com/corporate` | unchanged (self-referencing) |
| hreflang | **missing on EN** (the pt route declares both) | add `en`/`en-US`, `pt-PT`, `x-default` via the existing i18n head helper |
| JSON-LD | Breadcrumb + FAQPage | + Service (name, description, provider → YES organisation, areaServed Portugal, serviceType list, url); FAQPage regenerated from the visible 5 Q&As |

### 5. Imagery

Current blocks already use group photos, not couples: `azeitao-group-tasting`, `arrabida-team-viewpoint`, `alentejo-group-ruins`. **However**, the page runs `useEditorialOverrides("corporate_services", …)`, so a database override can be swapping the first image for a couple shot — that is my working hypothesis for the leisure-couple impression and the first thing I will verify by querying the overrides table.

- If an override is responsible → remove/repoint that override row; no code image change.
- Additional real group images available in the approved library for the new formats grid: `winery-group-orange-tree`, `sintra-group-selfie`, `arrabida-viewpoint-group`, `azulejo-private-workshop`, `wine-cheers-arch`.
- No stock, no AI corporate imagery. I will show the exact proposed image per slot before swapping anything.

### 6. Files to be changed

- `src/routes/corporate.tsx` — full restructure (hero, positioning, nationwide reach, formats grid, scale line, accordion FAQ, closing), metadata, hreflang, Service JSON-LD, internal links, event wiring.
- `src/content/seo-faq.ts` — replace `CORPORATE_FAQ` with the five supplied Q&As (EN only).
- `src/lib/jsonld.ts` — add a `corporateServiceLd()` helper alongside the existing service builders.
- `src/lib/analytics-events.ts` — add the nine `corporate_*` events to the catalogue.
- `src/content/editorial-service-images.ts` — only if the formats grid needs image slots beyond the current three.
- `e2e/corporate-structure.spec.ts` — new: asserts H1, "across Portugal", "100+" above the fold, large-group card outside FAQ, no "small groups", no horizontal overflow at 375/393/768/1280/1920.

## Technical notes

- Formats grid uses the existing `EditorialCard`/`Eyebrow`/`SectionTitle`/`CtaButton` primitives; no new visual language.
- FAQ moves to the Radix `Accordion` already used on `/trade`, with `FAQPage` JSON-LD generated from the same array so schema and visible copy cannot drift; answers render in the initial HTML (Radix keeps content mounted for SSR with `forceMount` where needed).
- Motion reuses `useMarketingMotion` + `reveal`/`reveal-stagger` and `ParallaxLayer` exactly as today; reduced-motion already honoured.
- `corporate_format_view` fires once per card via IntersectionObserver; form events carry no PII (the existing `stripPii` guard covers it).
- Internal links: "team building in Portugal" → relevant Signature, "Travel Designer" → `/portugal-travel-designer`, "Moments" → `/moments`, proposal CTAs → `/contact`.
- The pt-PT `/pt/corporate` page is left untouched except for the reciprocal hreflang already present.
- Nothing is published; changes land on preview only and wait for your approval.
