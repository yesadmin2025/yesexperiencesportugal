# Phase 1 · Launch-Critical Audit (findings only — no code changes yet)

Five audits, ordered safest-first for implementation. Nothing is edited yet. Each section lists what was found, exact fix, files touched, and risk.

---

## 1) Legal / licence / location consistency

**Canonical wording (per your brief):**
`Licensed Portuguese tour operator · RNAAT nº 31/2023 · Based in Sesimbra, Portugal`

Single source of truth already exists: `src/config/business-nap.ts`. A guardrail test `src/__tests__/nap-consistency.test.ts` blocks `RNAVT`, "based in Lisbon", "team from Lisbon", "Lisbon-based team". Zero RNAVT hits anywhere. So this pass is about tightening RNAAT phrasing and adding a canonical trust-line constant.

**Inconsistencies found**

| # | File · line | Current text | Recommended | Risk |
|---|---|---|---|---|
| 1a | `src/routes/wine-tours-lisbon.tsx:192` | `licensed Portuguese team (RNAAT 31/2023)` | `licensed Portuguese tour operator (RNAAT nº 31/2023)` | low |
| 1b | `src/routes/arrabida-wine-tour.tsx:172` | `licensed Portuguese team (RNAAT 31/2023)` | same as 1a | low |
| 1c | `src/routes/luxury-tours-portugal.tsx:116` | `licensed Portuguese operator (RNAAT)` | append `nº 31/2023` | low |
| 1d | `src/routes/portugal-tours.tsx:145` | `licensed tour operator (RNAAT) based in Sesimbra` | append `nº 31/2023` | low |
| 1e | `src/routes/private-tours-portugal.tsx:122` | `licensed Portuguese operator (RNAAT) based …` | append `nº 31/2023` | low |
| 1f | `src/routes/portugal-travel-designer.tsx:119` | `licensed Portuguese operator (RNAAT) based …` | append `nº 31/2023` | low |
| 1g | `src/routes/terms.tsx:12,18` | meta desc ends `…tour operator (RNAAT).` | `…tour operator (RNAAT nº 31/2023).` | low |
| 1h | `public/llms.txt:3` | `Licensed tour operator (RNAAT), 700+…` | `Licensed tour operator (RNAAT nº 31/2023), based in Sesimbra…` | low |
| 1i | `src/lib/jsonld.ts:54` (Organization description) | `Licensed Portuguese tour operator (RNAAT) …` | `Licensed Portuguese tour operator (RNAAT nº 31/2023), based in Sesimbra, Portugal …` | low — but re-verify JSON-LD renders after edit |

**Structural fix (single source of trust wording)**

Add one new constant to `src/config/business-nap.ts`:

```
TRUST_LINE = "Licensed Portuguese tour operator · RNAAT nº 31/2023 · Based in Sesimbra, Portugal"
```

Update Footer.tsx + CredentialStrip.tsx to render `TRUST_LINE` instead of composing their own strings. All prose pages above then import `LICENSE_LABEL` / `BASED_IN` / `TRUST_LINE` instead of hand-typing.

**Guardrail extension**

Extend `nap-consistency.test.ts` with two rules:
- `(RNAAT)` without `nº 31/2023` following within ~40 chars in any `.tsx`/`.ts`/`.txt` under `src/` and `public/` (excluding config + tests).
- Bare `RNAAT 31/2023` (missing `nº`).

**Safest order:** add TRUST_LINE constant → refactor Footer/CredentialStrip → fix table rows 1a–1i → extend guardrail test → run vitest.

---

## 2) Cancellation policy consistency

**Canonical wording (per your brief):**
- Signature: `Signature days usually include free cancellation up to 24h before the experience.`
- Studio / custom: `Studio and custom-built experiences show final cancellation terms before checkout.`
- Short generic: `Cancellation terms are shown before checkout and may vary by experience type.`

**References found (public-facing only; ignoring internal `cancelled` variables)**

| # | File · line | Current text | Recommended | Risk |
|---|---|---|---|---|
| 2a | `src/content/seo-faq.ts:103` | `Signature day tours usually include free cancellation up to 24 hours before the experience start time for a full refund. Cancellations made within 24 hours are non-refundable. Studio and custom-built experiences show their specific cancellation terms before checkout.` | Replace with the Signature line + Studio line verbatim from the canonical wording. | low |
| 2b | `src/routes/tours.$tourId.tsx:328` (spec pill) | `Free cancellation up to 24h` | Keep as-is (matches Signature policy, compact). | none |
| 2c | `src/routes/tours.$tourId.tsx:915` (reassurance strip) | `Instant confirmation · Free cancellation up to 24h · A local on WhatsApp if you need help` | Keep as-is (Signature context). | none |
| 2d | `src/routes/terms.tsx` (`Cancellations` paragraph, already in file) | Long paragraph mentioning 24h + Studio/custom terms at checkout | Rewrite the paragraph body to the two canonical lines verbatim, keep the "reschedule when possible" tail. | low |
| 2e | Studio/checkout surfaces (`src/components/studio-v2/**`, `SimpleBookingForm.tsx`, `EmbeddedConfirmationSheet.tsx`) | No cancellation copy currently displayed to the guest before checkout. | Add the generic short line as a small legal note under the total in `EmbeddedConfirmationSheet` + `SimpleBookingForm`. | low |

**Structural fix:** add three constants to `src/config/business-nap.ts` (or a sibling `src/config/policies.ts` if you'd rather keep NAP focused):
`CANCELLATION_SIGNATURE`, `CANCELLATION_STUDIO`, `CANCELLATION_SHORT`. All surfaces import from there. Extend the guardrail test to block bare `48h` / `48 hours` / `48-hour` cancellation strings.

**Safest order:** add constants → swap terms.tsx + seo-faq.ts → add short line to booking sheets → extend guardrail.

---

## 3) Invalid Local Stories dynamic route (`/local-stories/%24slug`)

**Current state — good news:**

- `src/routes/local-stories.$slug.tsx:281–293` already has a `beforeLoad` that redirects placeholder slugs (`$`, `%24slug`, `slug`, `undefined`, `null`, `example`, empty) to `/local-stories` — no loop risk (target route has no wildcard match).
- Sitemap (`src/routes/sitemap[.]xml.ts`) only emits real slugs from `LOCAL_STORIES_ARTICLES` + published DB posts; no `$slug` template entry.
- Internal `<Link>` uses `to="/local-stories/$slug"` + `params={{ slug }}` — TanStack template syntax, not a real URL.

**What's still broken / worth doing**

| # | Issue | Fix | Risk |
|---|---|---|---|
| 3a | Google/Bing may still hold the indexed `/local-stories/%24slug` URL. Current behaviour is a 302 to `/local-stories` — search consoles prefer 301 for permanent removal. | Change the `throw redirect(...)` calls in `beforeLoad` to include `statusCode: 301` (TanStack supports `code`/`statusCode` on `redirect()`). | low |
| 3b | No explicit `robots noindex` on the redirect target chain, so if Google re-crawls the placeholder before the redirect propagates it may still render. | Not needed once 3a lands, since 301 removes the URL. Skip. | none |
| 3c | Guardrail: nothing prevents someone re-introducing `<Link to="/local-stories/$slug">` without `params`. | Add a small vitest that fails if any `<Link to="/local-stories/$slug"` occurrence in `src/` lacks a `params={` on the same or next line. | low |
| 3d | Confirm `NotFoundView` in `local-stories.$slug.tsx` sets `robots: noindex` head — needed for genuinely-missing published slugs. | Verify (already in file); if missing, add `{ name: "robots", content: "noindex" }` to the `notFoundComponent` head via the route's `head({ loaderData })` fallback branch. | low |

**Safest order:** 3a first (one-line change) → 3d verify → 3c guardrail.

---

## 4) Concatenated / unpolished rendered text

Sweep of homepage, Studio, Signature, Local Stories, Travel Designer, Corporate, Moments, footer, CTA groups, sr-only spans.

**Findings**

| # | File · line | Rendered as | Verdict | Action |
|---|---|---|---|---|
| 4a | `src/components/home/StudioLivePreview.tsx:315–330` | The "Private cellar available / Add a family-run cellar tasting to your day. / Add" text your QA quoted. | NOT a concatenation bug — these are three distinct block-level `<span>`s (eyebrow, description, chip). But when a screen reader or the Google text snippet flattens them the result reads as one run-on: `Private cellar available Add a family-run cellar tasting to your day.Add`. | Add `aria-label="Add private cellar tasting to this day"` to the button and wrap the visible chip label in `aria-hidden="true"`. Also add a space (or ` · `) between the description and the chip visually by using `gap` (already present) — but the SEO/AI-text output still concatenates unless we insert an `aria-hidden` separator. Low risk. |
| 4b | `Reserve this dayTailor this Signature`, `Open the StudioWrite to a Local`, `Start the conversationTalk to a designer` (QA quote) | Rendered by `CtaButton` pairs — each button is its own `<a>`, but the HTML has no whitespace between them, so text-scrapers/AI snippets concatenate. | Wrap paired CTAs in a parent with an aria-hidden `·` separator OR set `aria-label` on the enclosing group. Cleanest: give each `CtaButton` wrapper a trailing `\u00A0` inside an `aria-hidden` span, or add a visually-hidden `, ` between them for scrapers. Low risk. | Add a small `<CtaPair>` component in `src/components/ui/` used by RecentJourney, FourWaysIn, ThreePathsSection, tours pages, and the homepage closing band. |
| 4c | `src/routes/index.tsx:538` | Developer comment `("Open the Studio"). The "Ask a local" duplicate…` — this is inside `{/* … */}` in JSX so it's not rendered. | Non-issue. | Skip. |
| 4d | `src/components/home/RecentJourney.tsx:490–496` | `Start the conversation` + `Talk to a designer` back-to-back. | Same as 4b. | Fix via `<CtaPair>`. |
| 4e | Global scan for other side-by-side CTAs: `src/routes/tours.$tourId.tsx:306+313`, `:907+910`; `src/routes/index.tsx:761+769`, `:960+963`; `src/routes/private-wine-tour-lisbon.tsx:258+280`; `src/routes/sintra-day-tour-from-lisbon.tsx:260+303`; `src/routes/experiences.tsx:180`; `src/routes/arrabida-day-trip-from-lisbon.tsx:233+255`; `src/routes/alentejo-wine-tour-from-lisbon.tsx:243`; `SimpleBookingForm.tsx:258+278`. | Same concatenation pattern. | Same fix — replace inline CTA pairs with `<CtaPair>`. |
| 4f | Placeholder / dev copy leaks into SEO text | None found. `data-lovable-blank-page-placeholder` not present. `TODO`, `FIXME`, `lorem` produced no visible-copy hits. | Non-issue. | Skip. |
| 4g | Screen-reader-only spans | Existing `sr-only` usage in Footer/Navbar is correct. No stray dev strings. | Non-issue. | Skip. |

**Structural fix:** one new `src/components/ui/CtaPair.tsx` (thin flex wrapper with `aria-hidden` `·` between children). Sweep the 12+ call sites to use it. Add a test asserting that between two adjacent `<CtaButton>`s the outerHTML contains whitespace or a separator.

**Safest order:** create `CtaPair` → migrate homepage first (RecentJourney, index.tsx CTA bands, FourWaysIn) → migrate tour templates → StudioLivePreview aria fix → add regression test.

---

## 5) Launch-readiness QA — links & CTAs

**Method planned:** static grep of every `<CtaButton to=`, `<Link to=`, `href=`, and Playwright headless crawl of `/`, `/experiences`, `/portugal-tours`, `/tours/arrabida-wine-allinclusive`, `/local-stories`, `/contact`, `/about`, `/press`, `/corporate`, `/proposal-in-portugal`, `/studio-v3` (main journey surfaces) asserting every visible CTA leads to a 200 route and matches its label's intent.

**Findings so far (from static scan; full Playwright pass runs in build mode)**

| # | Issue | Location | Fix | Risk / blocker |
|---|---|---|---|---|
| 5a | WhatsApp: everywhere uses `whatsappUrl()` from `business-nap.ts` — consistent. | site-wide | none | not blocking |
| 5b | Email links: `Contact.tsx`, `Terms.tsx`, `Privacy.tsx`, `Cookies.tsx`, `Unsubscribe.tsx` all use `EMAIL_HREF`. Consistent. | site-wide | none | not blocking |
| 5c | TripAdvisor / social: needs verification that outbound URLs still resolve (Trustpilot logo present but no href yet in some cards). | `src/assets/platform-trustpilot.svg`, `Footer.tsx` | Confirm Footer social row has valid `href` + `rel="noopener"` + `target="_blank"`. Add if missing. | low |
| 5d | Closing homepage CTA band `Open the Studio` + `Talk to a Local` duplicates the hero secondary CTA (`cta-band-guardrail.test.ts` already tracks this). | `src/routes/index.tsx:960` | Replace closing-band secondary with WhatsApp `Talk on WhatsApp` per the tracked TODO. | low, but visible on homepage — needs your yes/no |
| 5e | `Tailor this Signature` on tour pages routes to `/tours/$tourId/tailor` — verify each Signature tour has a `.tailor.tsx` view. `tours.$tourId.tailor.tsx` exists as one shared route → OK. | `src/routes/tours.$tourId.tailor.tsx` | none | not blocking |
| 5f | Checkout entry: `Reserve this day` in Signature cards routes through `SimpleBookingForm` → Stripe. Need Playwright to confirm the Stripe session opens on staging. | `SimpleBookingForm.tsx`, edge fn `create-signature-checkout` | Playwright smoke test in build mode. | potential launch blocker if Stripe env missing |
| 5g | Studio "Open the Studio" CTA — several routes point to `/studio-v3`, others to `/experiences`. Verify one canonical target. | homepage, `arrabida-day-trip-from-lisbon.tsx`, `sintra-day-tour-from-lisbon.tsx`, `private-wine-tour-lisbon.tsx`, `experiences.tsx` | Standardise to `/studio-v3`. | low |
| 5h | Local Stories cards: `to="/local-stories/$slug"` + `params={{ slug }}` — correct pattern; sitemap-only slugs are real. | `local-stories.tsx:120,147` | none | not blocking |
| 5i | Footer legal links: `/terms`, `/privacy`, `/cookies`, `/unsubscribe` all present under `src/routes/`. | Footer.tsx | none | not blocking |
| 5j | Press page outbound `mailto:` / links — verify they use `EMAIL_HREF`. | `src/routes/press.tsx` | If any hard-coded `mailto:yesexperiences@gmail.com` remains, swap to `EMAIL_HREF`. | low |

**Launch-blocking:** 5f (checkout smoke test) is the only one I'd gate launch on. Everything else is polish.
**Non-blocking:** 5c, 5d, 5g, 5j.

---

## Implementation order across all 5 audits (safest → riskiest)

1. **§3a** — Local Stories 301 (one-line, immediate SEO win).
2. **§1** — RNAAT phrasing sweep + TRUST_LINE constant + guardrail extension.
3. **§2** — Cancellation constants + terms.tsx + seo-faq.ts + booking-sheet short line + guardrail.
4. **§4** — `CtaPair` primitive + migrate homepage + tours + StudioLivePreview aria fix + regression test.
5. **§5f** — Playwright checkout smoke against `/tours/arrabida-wine-allinclusive` (staging). Then 5d, 5g, 5j, 5c.

No redesigns. No unrelated copy changes. Brand tokens untouched. Approved hero copy untouched.

## Open questions before I implement

- **Q1 (§5d):** OK to replace the homepage closing-band secondary CTA (`Talk to a Local`) with a `Talk on WhatsApp` CTA?
- **Q2 (§5g):** Confirm canonical Studio entry point — is it `/studio-v3` (per the current homepage) or should some pages still send to `/experiences`?
- **Q3 (§2e):** OK to add a small legal micro-line (`Cancellation terms are shown before checkout and may vary by experience type.`) under the total in the booking sheet, or should that stay Terms-page-only?

Ready to execute in the listed order once you approve — or say "skip Q1/Q2/Q3 defaults" and I'll use: Q1 = yes, Q2 = `/studio-v3`, Q3 = yes.