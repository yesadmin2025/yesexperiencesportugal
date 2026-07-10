## A. Current architecture (what's actually in the repo)

**i18n scaffolding — partial**
- `src/i18n/config.ts` declares `LOCALES = ["en","es","pt"]`, default `en`, prefix rule `/es`, `/pt`, cookie `yes_locale`. **`es` is wired as a full site language today** — must be removed per your brief.
- `src/i18n/dictionaries.ts` + `src/content/i18n/{en,es,pt}/common.json` — only ~10 nav/footer keys translated. PT and ES files still contain English strings for most values (e.g. `"footer.tagline"`, `"common.book_now"`).
- `src/components/LanguageSwitcher.tsx` renders EN · ES · PT (must become EN · PT).
- **No `/pt/*` routes exist.** All 89 route files under `src/routes/` are English-only at root URLs. `parseLocaleFromPath` exists but no router branch consumes it — the switcher currently generates dead links.
- `src/routes/sitemap[.]xml.ts` emits only EN URLs. No `hreflang` `<link>` tags anywhere in `__root.tsx` or leaf routes (`rg hreflang` = 0 hits in route files).

**Tour language options — French present in 8 surfaces**
- `src/components/SimpleBookingForm.tsx` L39, L224 — state + selector `["en","pt","es","fr"]`
- `src/components/SimpleTailorForm.tsx` L33, L197 — same
- `src/components/checkout/FinalDetailsDialog.tsx` L38, L347 — `GuestDetails.language` type + selector
- `src/components/studio-v3/types.ts` L85 — `type Language = "en" | "pt" | "es" | "fr" | "other"`
- `src/hooks/useStudioLocale.ts` L10-L13, L625 — `StudioLocale` union + `SUPPORTED` array + `fr: "FR"` label
- `src/components/builder/v3/LocaleSwitcher.tsx` L18 — `["pt","en","es","fr"]`
- `src/lib/studioNarrative.functions.ts`, `src/lib/builderChapter.functions.ts`, `src/lib/driftEngine.{server,functions}.ts`, `src/lib/drift/i18n.ts` — narrative/drift copy branches keyed on `fr`
- `src/lib/jsonld.ts`, `src/lib/i18n-fallback.ts` — `fr` in language arrays / fallback maps
- `supabase/functions/create-signature-checkout` receives `guestDetails.language` verbatim — no server-side allow-list, so `"fr"` can still be submitted even after UI removal unless we validate.

**Currency — EUR only, no USD anywhere**
- All prices are stored & displayed in EUR (`tour_price_tiers`, `signatureTourPricing.ts`, `resolvePerPaxEur`).
- Stripe checkout (`create-signature-checkout`, `create-builder-checkout`) creates EUR sessions. No currency selector, no FX cache, no `Intl.NumberFormat` USD path.
- JSON-LD `priceCurrency: "EUR"` in `src/lib/jsonld.ts`.
- No exchange-rate API or Supabase table for FX exists today.

**SEO**
- Canonicals + og:url are hardcoded to `https://yesexperiencesportugal.com` (see `src/i18n/config.ts` `buildLocaleUrl`). No `hreflang` emitted.
- `<html lang>` is not driven by route locale.

---

## B. Recommended final language model

| Surface | EN | PT | ES | FR |
|---|---|---|---|---|
| Website (URL + UI) | ✅ default, root `/` | ✅ `/pt/*` | ❌ remove from LOCALES | ❌ never |
| Tour guide language selector | ✅ | ✅ | ⚠️ "On request" note only, not a selectable button | ❌ purge |
| JSON-LD `availableLanguage` | ✅ | ✅ | omit (not guaranteed) | ❌ |
| Sitemap + hreflang | ✅ `en` + `x-default` | ✅ `pt-PT` | — | — |

---

## C. Missing Portuguese content (must be authored, not machine-translated)

Currently untranslated (English hard-coded in JSX or English strings mirrored into `pt/common.json`):

1. **Global chrome** — Nav labels (`nav.experiences`, `nav.studio`, `nav.travel_designer`, `nav.corporate`, `nav.moments` are still English in `pt/common.json`), footer tagline, footer rights, cookie banner, CTA vocabulary (`common.book_now`, `common.learn_more`, `common.read_more`).
2. **Homepage** — `src/routes/index.tsx` + all home sections (`src/components/home/*`), hero copy (`src/content/hero-copy.ts` — locked EN, need PT twin), Occasions cards, trust strip.
3. **Experiences hub** — `experiences.tsx`, day-tours listings, all `arrabida-*`, `evora-*`, `alentejo-*`, `luxury-tours-portugal`, `day-trips-from-lisbon`, `itineraries.10-day-*` route files.
4. **Signature tour pages** — `tours.$tourId.tsx` reads `signatureTours` data (`src/data/signatureTours.ts`, `signatureToursViator.ts`) — titles, subtitles, highlights, stops, chapters, inclusions all EN-only.
5. **Reserve card + Tailor** — `SimpleBookingForm`, `SimpleTailorForm`, `FinalDetailsDialog`, `BrandedCheckoutDrawer` — every label, helper, error toast.
6. **Studio v3** — 30+ components in `src/components/builder/v3/*` and `src/components/studio-v3/*`; narrative/voice in `src/lib/studioNarrative*`, `driftEngine*`, `drift/i18n.ts` (has PT stubs — audit completeness).
7. **Travel Designer / Multi-day / Corporate / Moments / About / Contact / FAQ / Press / Local Stories index + `$slug` articles / Booking-confirmed / Checkout token page / Cookies / Terms / Privacy** — all EN-only route files.
8. **Forms** — react-hook-form + zod messages (all `src/components/**` forms). No i18n on zod error messages today.
9. **Meta** — every route's `head()` (`meta.title`, `description`, `og:*`) is EN-only.
10. **Transactional email templates** — `src/routes/email/*` and Resend templates.
11. **Structured data** — JSON-LD descriptions in `src/lib/jsonld.ts` are EN-only.
12. **Image `alt` text** — inline in components.

---

## D. SEO localization plan

1. **URL model**: keep EN at root, PT under `/pt/*`. Add TanStack layout route `src/routes/pt.tsx` (`<Outlet />`), then mirror every public route as `src/routes/pt.<name>.tsx` re-exporting the shared component with `locale="pt"` prop, OR refactor pages to read `useLocale()` and drop the duplicate files (preferred — single source, less drift). Slug translation (e.g. `/pt/tours/tour-vinhos-arrabida-tudo-incluido`) needs a slug map in `signatureTours` (`slug: { en, pt }`) + a resolver in the loader.
2. **`<html lang>`**: drive from `useLocale()` in `__root.tsx` shell — `en` or `pt-PT`.
3. **Per-route `head()`**: return localized `title`, `description`, `og:title`, `og:description`, self-canonical, and 3 `<link rel="alternate">` (`en`, `pt-PT`, `x-default`). Add a `buildHreflangLinks(path, ptSlug?)` helper in `src/i18n/seo.ts`.
4. **Canonicals**: EN → self at `https://yesexperiencesportugal.com/<path>`, PT → self at `.../pt/<path>`. Never cross-canonical.
5. **Sitemap**: extend `src/routes/sitemap[.]xml.ts` to emit both locale URLs per route, using `xhtml:link` alternates. Exclude PT entries for routes whose PT translation is not yet published (gated by a `ptReady` flag per route/tour).
6. **`x-default`** → EN.
7. **robots.txt** — no change; keep both locales indexable.

---

## E. Currency plan (display-only USD, EUR remains truth)

- **Display-only**: EUR stays the stored + charged currency. USD is a soft approximation next to the EUR figure.
- **Selector**: small EUR/USD toggle beside language switcher; persists in `localStorage` (`yes_currency`) and a cookie for SSR read. **No IP auto-switch.** Optionally a one-time hint banner "Show approximate USD?" for `Accept-Language: en-US`.
- **Rate source**: single free provider (e.g. `exchangerate.host` or ECB reference rate). Wrap in a server function `getEurUsdRate()` with:
  - Supabase table `fx_rates(base text, quote text, rate numeric, fetched_at timestamptz)` (1 row).
  - Cache TTL 24h; refresh via cron edge trigger or lazy on read when stale.
  - Fallback constant `EUR_USD_FALLBACK = 1.08` if API fails — never block render.
- **Rounding**: nearest whole dollar for totals; nearest whole dollar for pp too (no `.99` psychology).
- **Display component** `<PriceDisplay eur={169} />` → "€169" primary; if USD mode → append muted "≈ $183 USD". No layout shift: reserve fixed min-width via `tabular-nums`.
- **Copy** (EN + PT) added under every conversion surface exactly as you specified.
- **JSON-LD**: keep `priceCurrency: "EUR"` regardless of display toggle.
- **Checkout**: remains EUR (Option A). USD note appears next to the final CTA and inside `BrandedCheckoutDrawer` summary.

---

## F. Studio & checkout changes

- Remove FR everywhere in section A. Add `"Spanish available on request"` static note under the language row (never a selectable pill).
- Split three concepts into distinct fields in state:
  - `websiteLocale: "en" | "pt"` (URL + UI)
  - `tourLanguage: "en" | "pt"` (guest preference; `es` only via free-text "on request" checkbox that flags booking metadata)
  - `displayCurrency: "EUR" | "USD"` (view only)
  - `checkoutCurrency: "EUR"` (constant for now)
- Update `guestDetails` payload sent to `create-signature-checkout` to add `spanishOnRequest: boolean` (nullable), drop `fr`, add server-side allow-list validation (`en|pt|es`).
- Translate every Studio step label / helper / error, plus `FinalDetailsDialog`, `BrandedCheckoutDrawer`, `booking-confirmed`.

---

## G. Data model

```ts
// src/i18n/config.ts
LOCALES = ["en", "pt"] as const;   // drop "es"

// src/data/signatureTours.ts entry shape
{
  id: "arrabida-wine-allinclusive",           // stable
  slug: { en: "arrabida-wine-allinclusive",
          pt: "tour-vinhos-arrabida-tudo-incluido" },
  title: { en: "...", pt: "..." },
  subtitle: { en, pt }, highlights: { en:[], pt:[] },
  stops: [{ id, label: { en, pt }, ... }],
  languages: { standard: ["en","pt"], onRequest: ["es"] },
  ptReady: true   // gate sitemap + switcher fallback
}

// Booking payload
{ websiteLocale, tourLanguage, spanishOnRequest, displayCurrency,
  checkoutCurrency: "EUR", ... }

// New Supabase table
fx_rates (base text, quote text, rate numeric, fetched_at timestamptz);
GRANT SELECT on fx_rates TO anon, authenticated;
GRANT ALL  on fx_rates TO service_role;
```

---

## H. Files/components affected

- Config: `src/i18n/config.ts`, `src/i18n/dictionaries.ts`, `src/i18n/seo.ts`, `src/i18n/locale-context.tsx`
- Dictionaries: expand `src/content/i18n/{en,pt}/*.json` — split into namespaces (`common`, `nav`, `home`, `tours`, `studio`, `checkout`, `forms`, `legal`, `email`). Delete `src/content/i18n/es/`.
- Switcher: `src/components/LanguageSwitcher.tsx`
- FR purge: `SimpleBookingForm.tsx`, `SimpleTailorForm.tsx`, `checkout/FinalDetailsDialog.tsx`, `studio-v3/types.ts`, `hooks/useStudioLocale.ts`, `builder/v3/LocaleSwitcher.tsx`, `lib/studioNarrative.functions.ts`, `lib/builderChapter.functions.ts`, `lib/driftEngine.{server,functions}.ts`, `lib/drift/i18n.ts`, `lib/jsonld.ts`, `lib/i18n-fallback.ts`
- Data: `src/data/signatureTours.ts`, `src/data/signatureToursViator.ts`, `src/data/regionStops.ts`, `src/data/stopIntents.ts`
- Routes: `src/routes/__root.tsx` (lang attr + hreflang helpers), every public leaf route's `head()`, `src/routes/sitemap[.]xml.ts`, new `src/routes/pt.tsx` layout (or locale prop on shared components)
- Currency: new `src/lib/currency/` (`useDisplayCurrency`, `PriceDisplay`, `formatMoney`), new `src/lib/currency/fx.functions.ts` (server fn + Supabase cache), migration for `fx_rates`
- Checkout: `supabase/functions/create-signature-checkout/index.ts` + `create-builder-checkout/index.ts` (validate language allow-list, accept `spanishOnRequest`, ignore any legacy `fr`)
- Emails: `src/routes/email/*` templates (PT variants)
- Tests: extend `src/i18n/__tests__/i18n.test.ts`; new tests for hreflang emission, FR purge (grep-based), currency rounding, sitemap bilingual entries.

---

## I. Risks

1. **Incomplete PT at launch** → partial pages leak to Google. Mitigation: `ptReady` gate per route/tour; sitemap + switcher hide PT until page passes editorial review; add a lint script that fails CI if a route is marked `ptReady` but has EN strings.
2. **Duplicate content** if canonicals cross languages → penalty. Mitigation: self-canonical enforced in `head()` helper + test.
3. **Wrong hreflang** (missing return link, wrong region tag) → Google ignores cluster. Mitigation: `buildHreflangLinks` always emits reciprocal `en` + `pt-PT` + `x-default`.
4. **USD expectation mismatch at checkout** → chargebacks. Mitigation: mandatory disclaimer near every USD figure + inside checkout drawer; JSON-LD stays EUR.
5. **FX API failure** → broken cards. Mitigation: 24h Supabase cache + hard-coded fallback; USD never blocks EUR render.
6. **Guest picks Spanish → no guide available** → operational fail. Mitigation: Spanish is a checkbox ("Request Spanish-speaking guide, subject to availability"), routed to ops for manual confirmation before payment capture, not a language pill.
7. **`fr` still accepted server-side** after UI removal. Mitigation: zod allow-list `["en","pt","es"]` in both edge functions + migration to normalize any historical `fr` in `bookings` **without altering historical records** (leave old rows; only enforce on new inserts).
8. **URL migration** — `/pt/tours/<pt-slug>` creates new URLs. Mitigation: no existing PT URLs to preserve; add 301 from any `/pt/<en-slug>` typo to canonical PT slug via existing legacy redirect middleware.
9. **Machine-translation drift** — brand voice loss. Mitigation: mandate human review checklist per phase; forbid Google Translate for tour copy.

---

## J. Implementation phases

- **Phase 1 — FR purge & language-data cleanup** (safe, isolated)
  Remove `fr` from all 10+ files above; add server-side allow-list; add Spanish-on-request UI copy (EN only for now). Extend `legacy-domain-redirect` tests with a "no `fr` in tour language unions" grep test.

- **Phase 2 — Localization architecture**
  Trim `LOCALES` to `["en","pt"]`; split dictionaries into namespaces; introduce `useT(namespace)` hook; migrate `signatureTours` shape to `{en, pt}` fields (PT fields empty-but-typed initially); add `ptReady` flag; extend `LanguageSwitcher` to hide PT for `!ptReady` routes.

- **Phase 3 — Ship full Portuguese website**
  Author PT strings (human-written, European PT) for chrome + all public routes. Wire `/pt/*` route tree (or locale-prop pattern). Localize forms, errors, emails. `<html lang>` per route. Author PT tour slugs + copy for the top-priority tours first, gate the rest with `ptReady=false`.

- **Phase 4 — Bilingual SEO**
  Add `hreflang` + self-canonical + localized `og:*` per route. Emit bilingual sitemap. Add JSON-LD in matching language with shared Organization `@id`.

- **Phase 5 — USD display**
  Create `fx_rates` table + server fn + 24h cache + fallback. Add `<PriceDisplay>` primitive and currency toggle. Add EN + PT disclaimers. Update `BrandedCheckoutDrawer` to show EUR-final line prominently.

- **Phase 6 — QA matrix** (EN×EUR, EN×USD, PT×EUR, PT×USD)
  Playwright suite: language switch preserves route + query, no FR anywhere (grep + runtime), sitemap has both langs for `ptReady` routes only, hreflang reciprocal, `<html lang>` correct, JSON-LD `priceCurrency=EUR`, checkout total EUR, USD note visible next to CTA, currency selection persists, no CLS on price render, Studio steps localized end-to-end.

---

## K. Isolated implementation prompts (one per phase)

**Prompt P1 — Purge French**
> Remove French from the entire tour-language surface. Update the tour-language type unions to `"en" | "pt" | "es"` in `src/components/SimpleBookingForm.tsx`, `SimpleTailorForm.tsx`, `checkout/FinalDetailsDialog.tsx`, `studio-v3/types.ts`, `hooks/useStudioLocale.ts`, `builder/v3/LocaleSwitcher.tsx`; drop `fr` branches in `lib/studioNarrative.functions.ts`, `builderChapter.functions.ts`, `driftEngine.{server,functions}.ts`, `drift/i18n.ts`, `jsonld.ts`, `i18n-fallback.ts`. Add a server-side zod allow-list `["en","pt","es"]` in `supabase/functions/create-signature-checkout/index.ts` and `create-builder-checkout/index.ts`; reject `fr`. Add a static "Spanish available on request — subject to guide availability" line below the language row. Do not touch historical bookings. Add a test that greps the src tree for `"fr"` / `'fr'` in tour-language contexts and fails if found.

**Prompt P2 — Localization architecture**
> Trim `LOCALES` in `src/i18n/config.ts` to `["en","pt"]` and delete `src/content/i18n/es/`. Split dictionaries into namespaces (`common`, `nav`, `home`, `tours`, `studio`, `checkout`, `forms`, `legal`). Add `useT(namespace)` hook. Refactor `signatureTours` and `signatureToursViator` to store `title`, `subtitle`, `highlights`, `stops[].label`, and `slug` as `{ en: string; pt: string }`. Add a `ptReady: boolean` per tour and per route. Update `LanguageSwitcher` to hide PT when the current route/tour is not `ptReady`. Do not add page copy yet.

**Prompt P3 — Portuguese website**
> Add a `/pt/*` route branch (TanStack layout `src/routes/pt.tsx` + shared components reading `useLocale()`). Author human-written European Portuguese copy for: global chrome, homepage, experiences hub, all Signature tour pages marked `ptReady`, Studio, Tailor, Travel Designer, Corporate, Moments, About, Contact, FAQ, Local Stories, Booking-confirmed, Cookies, Privacy, Terms, all form labels/placeholders/zod messages, all transactional email templates. Drive `<html lang>` from `useLocale()`. Do not machine-translate.

**Prompt P4 — Bilingual SEO**
> In `src/i18n/seo.ts` add `buildHreflangLinks(pathEn, pathPt?)` returning three `<link rel="alternate">` (`en`, `pt-PT`, `x-default`). Update every public route's `head()` to return localized `title`, `description`, `og:title`, `og:description`, self-canonical, and `buildHreflangLinks`. Extend `src/routes/sitemap[.]xml.ts` to emit both locale URLs for `ptReady` routes with `xhtml:link` alternates; exclude PT for non-ready routes. Keep JSON-LD Organization `@id` shared across languages; localize Service/Product name + description.

**Prompt P5 — USD display**
> Create Supabase table `fx_rates (base text, quote text, rate numeric, fetched_at timestamptz, primary key (base, quote))` with grants (`SELECT` to anon/authenticated, `ALL` to service_role) — no RLS write policies (writes only via service role). Add server fn `getEurUsdRate()` in `src/lib/currency/fx.functions.ts` — read cache, refresh if older than 24h via `exchangerate.host`, fall back to `1.08` on failure. Add `<PriceDisplay eur={n} />` primitive with `tabular-nums` + reserved width. Add EUR/USD toggle in `LanguageSwitcher` neighborhood, persisted to `localStorage` + `yes_currency` cookie. Wire it into Reserve card, tour cards, Studio final investment, `BrandedCheckoutDrawer`. Show EN and PT disclaimer strings verbatim as specified. Keep JSON-LD `priceCurrency: "EUR"`. Checkout stays EUR — no Stripe currency change.

**Prompt P6 — QA matrix**
> Add Playwright specs covering the four-quadrant matrix (EN×EUR, EN×USD, PT×EUR, PT×USD): language switch preserves path + search + hash; hreflang triplet present and reciprocal; `<html lang>` matches route; sitemap emits both locales only for `ptReady`; no `fr` in DOM or network payloads; JSON-LD `priceCurrency=EUR`; checkout total in EUR; USD note visible next to every USD figure and inside the checkout drawer; currency choice persists across reload; no CLS on price render; Studio and Tailor fully localized; email preview localizes.
