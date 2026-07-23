# Traveller Preferences: Tests · A11y · Persistence

Three surgical additions on top of the existing `CurrencyProvider`, `CurrencyToggle` and `LanguageSwitcher`. No visual redesign, no checkout changes (checkout stays EUR — source of truth).

---

## 1. E2E — currency conversion parity

New Playwright suite `e2e/currency-toggle-parity.spec.ts` (mobile 393×706, matching the site's default probe viewport).

Covers on **Home · `/experiences` · a Signature tour · `/tours/$id/tailor` · `/studio` intro**:

- Toggle mounts with `EUR` active by default (fresh context).
- After clicking `USD` in the header toggle:
  - Every visible price element (selector: `[data-price-eur]`, plus `PricePerPerson` output) reformats to `$` and matches `Math.round(eur * FX_RATES.USD)` from `src/config/fx-rates.ts`.
  - The "Charged in EUR" indicative hint appears next to converted prices.
  - Sum of per-person × pax lines still equals the displayed total (no double-conversion).
- Checkout / booking summary routes (`/checkout/*`, Stripe redirect stub, email preview route) MUST remain EUR even when USD is active — asserted by scanning for `€` and absence of `$` in totals.
- Reload the page → USD persists (localStorage + cookie both present).
- Navigate to another route → USD persists without flicker (single render, no EUR → USD swap after mount).

Helpers extracted to `e2e/currency-parity-helpers.ts` (price scraping + rate math), reused by future suites.

Wire into existing Playwright config alongside `copy-parity` suites; no new CI job needed.

---

## 2. Accessibility polish — LanguageSwitcher & CurrencyToggle

Keep the visual language as-is; only strengthen semantics and contrast.

- **Keyboard**
  - Both switchers become a single `role="group"` with roving `aria-pressed` buttons already in place; verify Tab order lands on each option and Enter/Space activates.
  - Add `focus-visible` ring already present on Currency — mirror it on LanguageSwitcher active/inactive buttons (currently missing on the anchor variant).
  - Disabled PT `<span>` becomes `<button disabled aria-disabled="true">` so screen readers announce state and it stays in Tab order predictably.
- **ARIA labels**
  - `nav aria-label` becomes translatable: `t("currency.switcher_label")` (new key, EN "Currency", PT "Moeda"). Language switcher already uses `t("lang.switcher_label")`.
  - Each option gets `aria-label` including full name: e.g. `aria-label="Euro"` / `aria-label="US dollar (indicative)"`, `aria-label="English"` / `aria-label="Português"`.
  - Globe icon in Navbar becomes `aria-hidden` (decorative), with the label carried by the surrounding switcher.
- **Contrast**
  - Footer variant currently uses `text-[color:var(--ivory)]/75` on `--charcoal` — bump inactive to `/85` to clear 4.5:1 (verified against `--charcoal #2E2E2E`).
  - Header inactive uses `--charcoal-soft`; keep, already passes on `--ivory`.
- **Announce currency change** via a polite `aria-live="polite"` visually-hidden region ("Prices now shown in US dollars, indicative — charged in euros").

New test `e2e/traveller-prefs-a11y.spec.ts`:
- axe scan on the switcher cluster (header + footer).
- Tab from logo reaches Language then Currency buttons in order.
- `aria-pressed` toggles correctly on Space.

---

## 3. Persistence hardening

Currency and locale already write to `localStorage` + cookie individually — align them and guarantee cross-navigation stability.

- **Currency** (`src/lib/currency.tsx`)
  - On mount, prefer cookie value when localStorage is empty (fixes first render after cross-subdomain arrival / cleared storage).
  - Emit selection synchronously via a lazy `useState` initializer guarded by `useHydrated()` to avoid an EUR → USD flicker on route change (currently a `useEffect` swap).
  - Cookie already 180-day `SameSite=Lax`; add `Secure` in production (`location.protocol === 'https:'`).
- **Locale** (`src/i18n/locale-context.tsx` + `LanguageSwitcher`)
  - Cookie is the canonical store (SSR-readable); mirror to `localStorage["yes.locale.v1"]` so the client can restore instantly if the cookie is stripped by a privacy extension.
  - Ensure globe icon + label render the persisted locale on first paint (no `EN` flash when cookie says `pt`).
- **E2E persistence check** added to the currency suite above: set USD + PT → hard reload → navigate to 3 routes → both preferences survive; clear cookie only → localStorage rehydrates; clear both → defaults return.

---

## Files touched

- Add: `e2e/currency-toggle-parity.spec.ts`, `e2e/currency-parity-helpers.ts`, `e2e/traveller-prefs-a11y.spec.ts`
- Edit: `src/lib/currency.tsx`, `src/components/CurrencyToggle.tsx`, `src/components/LanguageSwitcher.tsx`, `src/i18n/locale-context.tsx`, `src/i18n/en.ts` / `pt.ts` (new keys), `src/components/ui/PricePerPerson.tsx` (add `data-price-eur` attribute for reliable scraping)
- No changes to checkout, Stripe, pricing SSOT, or visual design tokens.

## Out of scope

- Live FX rates (stays versioned in `fx-rates.ts`).
- Adding new currencies or locales.
- Any change to checkout / receipt / email currency (remains EUR).
