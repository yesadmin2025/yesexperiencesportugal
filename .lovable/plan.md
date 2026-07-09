## Goal

Establish a single source of truth for the business NAP + license, purge stale/incorrect claims (RNAVT, "team from Lisbon", "based in Lisbon"), and make every footer/legal/contact surface read from the same config.

## Audit findings

- **RNAVT**: zero occurrences anywhere in `src/` or `public/`. Nothing to remove; guardrail test still worth adding.
- **"team from Lisbon"**: 3 hits, all in `src/routes/index.tsx` meta descriptions (lines 224, 233, 242 — description / og:description / twitter:description).
- **Footer**: only one component (`src/components/Footer.tsx`). No divergent second variant renders on the public site — the perceived "two variants" is the mobile-only legal line at L282–284 that duplicates the desktop `<span>` at L253. Both currently agree, but they're hand-typed twice and will drift. Consolidating fixes that.
- **Contact page JSON-LD** (`src/routes/contact.tsx` L62, L74): `email: "yesexperiences@gmail.com"` — inconsistent with on-page display `info@yesexperiencesportugal.com` (L188). Public NAP should be the public inbox.
- **About page** (`src/routes/about.tsx` L247): reads `RNAAT 31/2023` — missing the "nº" that every other surface uses.
- **Terms** (`src/routes/terms.tsx` L42): "a licensed Portuguese tour operator (RNAAT)" — license number missing entirely.
- **Phone / email / WhatsApp** are hard-coded in ~8 files (Footer, WhatsAppFab, WhatsAppSupportButton, Contact, About, Terms, Privacy, Cookies, Unsubscribe, CredentialStrip). All values agree today but nothing enforces that.
- **Kept as-is** (not public NAP): `yesexperiences@gmail.com` in `src/lib/email/team-recipients.ts` (internal ops inbox), `src/routes/auth.tsx` (admin login placeholder), and the historical letter body in `src/routes/admin.gbp-legacy-removal.tsx`.

## Plan

### 1. New single source of truth
Create `src/config/business-nap.ts` exporting frozen constants:

```
BUSINESS_NAME         = "YES experiences Portugal"
BUSINESS_LEGAL_NAME   = "YES Experiences Portugal"   // JSON-LD / legal prose
LICENSE_LABEL         = "RNAAT nº 31/2023"
LICENSE_SHORT         = "RNAAT"
LICENSE_NUMBER        = "31/2023"
BASED_IN              = "Sesimbra, Portugal"
BASED_IN_LONG         = "Based in Sesimbra, designing private journeys across Portugal, with pickups from Lisbon, Cascais, Sintra, Sesimbra and Setúbal."
CITY / COUNTRY_CODE   = "Sesimbra" / "PT"
EMAIL                 = "info@yesexperiencesportugal.com"
PHONE_DISPLAY         = "+351 911 889 992"
PHONE_TEL             = "+351911889992"
WHATSAPP_NUMBER       = "351911889992"
WHATSAPP_URL(msg?)    = wa.me helper
```

Plus one composed legal line used by footer + credential strips:
`FOOTER_LEGAL_LINE = "© {year} YES experiences Portugal · RNAAT nº 31/2023 · Sesimbra, Portugal · All rights reserved."`

### 2. Refactor consumers to import from config

| File | Change |
|---|---|
| `src/components/Footer.tsx` | Read tagline license line, both mobile + desktop legal spans, and © line from config (collapses the two duplicated legal spans into one shared string). |
| `src/components/ui/CredentialStrip.tsx` | Import LICENSE_LABEL instead of literal. |
| `src/components/WhatsAppFab.tsx`, `src/components/support/WhatsAppSupportButton.tsx` | Import WHATSAPP_NUMBER + URL helper. |
| `src/routes/contact.tsx` | Replace `yesexperiences@gmail.com` (JSON-LD ContactPoint, 2 places) with EMAIL. Use PHONE_DISPLAY + BASED_IN. |
| `src/routes/about.tsx` | Line 247 → LICENSE_LABEL (`RNAAT nº 31/2023`). Phone/email/tagline → config. |
| `src/routes/terms.tsx` | "(RNAAT)" → "(RNAAT nº 31/2023)". Email link → EMAIL. |
| `src/routes/privacy.tsx`, `src/routes/cookies.tsx`, `src/routes/unsubscribe.tsx` | Email → EMAIL. |
| `src/routes/index.tsx` | 3 meta descriptions: replace "shaped by a licensed local team from Lisbon" with "shaped by a licensed local team based in Sesimbra". |

Only prose/data changes. No visual/layout/color changes.

### 3. Guardrail test
Add `src/__tests__/nap-consistency.test.ts`:
- Scans `src/` + `public/` (excluding `admin.gbp-legacy-removal.tsx`, `email/team-recipients.ts`, `auth.tsx`, and this test itself) and fails on any occurrence of:
  - `RNAVT`
  - `team from Lisbon`, `based in Lisbon`, `Lisbon-based team`
  - literal phone `911 889 992` or email `yesexperiencesportugal.com` outside `src/config/business-nap.ts` and the auto-gen SEO files (allow in JSON-LD builders that import from config).
- Enforces that Footer.tsx, Terms, Contact, About import from `@/config/business-nap`.

### 4. Verification
- `bunx vitest run src/__tests__/nap-consistency.test.ts`
- Visual spot-check of `/`, `/about`, `/contact`, `/terms` on mobile viewport (393px) to confirm no layout drift.

## Out of scope

- Brand colors, tokens, typography — untouched.
- Footer structure, columns, credential-strip layout — untouched.
- Internal-only inboxes (`yesexperiences@gmail.com` for team notifications / admin auth).
- i18n dictionaries (currently no NAP strings live there).
