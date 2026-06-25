
# Sprint A v5 — Launch Polish (refined copy + booking lead time)

Scope unchanged from v4 (copy, structure, nav, hero CTAs, footer with payments + socials, FAQ, Signature truth-pass with two actions, Travel Designer refinement, About + supporting pages, pre-payment booking details form, discreet WhatsApp, SEO base, read-only Stripe smoke test). v5 refines the public wording and adds a Studio availability gate.

No Studio V3 logic changes beyond the date phase availability gate. No price changes. No invented product data. **Bókun is never named anywhere customer-facing.**

---

## 1. Refined wording — Four Ways In (no repetition, no "when available")

Three distinct verbs across the instant-booking paths. No "Reserve instantly" repeated. No "when available" — guests understand availability gates a date.

- **01 · Signature Experiences** — Ready, validated private day journeys · **Reserve in minutes** → `/experiences`
- **02 · Tailored Signatures** — Start from a Signature, shape it to your day · **Confirm in minutes** → `/experiences?mode=tailored`
- **03 · Experience Studio** — Design your day in real time, with us · **Book it live** → `/studio-v3`
- **04 · Travel Designer** — A full private journey, written around you · **Begin with a designer** → `/bespoke`

Clarification line under the row: *Signature, Tailored and Studio book direct. Travel Designer is the human-led path.*

---

## 2. Hero CTAs

- Primary → `Reserve a Signature` → `/experiences`
- Secondary → `Open the Studio` → `/studio-v3`
- Subcopy: *Private Portugal experiences — designed with you, confirmed direct.*

Existing hero film and headline preserved.

---

## 3. Studio — date phase goes straight to live availability + 3-day lead time

- The Studio date step opens directly into a calendar that queries live availability for the composed day. No intermediate "pick a date then check" screen.
- **Minimum lead time: today + 3 days.** Earlier dates are visually disabled with a calm helper: *We need at least three days before your experience to prepare it properly.*
- Past dates remain disabled.
- Disabled days have a clear pressed-state, larger tap target (≥44px), and an `aria-disabled` announcement.
- The availability call reuses the existing live-availability endpoint already used elsewhere on the site. No new partner names exposed in the UI.
- Implemented in `src/components/studio-v3/phases/DatePhase` (or current equivalent) without touching scoring/composition/map/reveal logic. New helper `src/lib/booking-lead-time.ts` exports `MIN_LEAD_DAYS = 3` and `isDateBookable(date, now)` used by Studio, Signature and Tailored date pickers so the rule is enforced everywhere consistently.

---

## 4. Signature pages — truth-pass + two clear actions

Each Signature shows two side-by-side actions:

1. **Reserve this day** → pre-payment booking details form → Stripe checkout.
2. **Tailor this Signature** → in-page panel that only exposes adjustments already attached to this Signature.

Tailor guardrails (codified in `src/lib/tailored-policy.ts`): allowed = remove a stop from this Signature, swap with an approved alternative attached to this Signature, add an upgrade that exists for this Signature, adjust pace/focus, language/pickup/time. Disallowed = pulling stops from other Signatures, inventing add-ons/inclusions/prices, changing route family. Anything outside → routes to Studio. Anything needing human judgement → routes to Travel Designer.

Copy/inclusions/exclusions/stops/duration/languages/cancellation/pickup sourced from existing Viator + project data — the same source the public site already uses. No invented stops. No price changes. Uncertainties flagged in the report.

---

## 5. Travel Designer (`/bespoke` → `/multi-day`)

- Label site-wide: `Travel Designer` (was `Bespoke Journeys`). `/bespoke` redirect preserved.
- Refined copy: positioning as **full private-journey design** — any length, any shape, any number of regions, weddings, honeymoons, multi-generational journeys, corporate retreats. Remove the "up to 7 days" framing and any hard length cap.
- Preserve the existing sample/PDF. Improve placement, add `View sample` affordance. Anonymise any visible client-sensitive detail.
- CTA stays human-led: `Begin with a designer`. No instant-booking language on this page.

---

## 6. About + supporting pages refinement

`/about`, `/contact`, `/proposals`, `/corporate`, `/multi-day`, `/local-stories`:

- Refined editorial copy in the existing brand voice — keep the storytelling that's already there, lift the rhythm: sensory verbs, specifics over superlatives, single primary action per screen.
- Drop AI references, "concierge confirms", "one conversation" (when paths are instant), `Bespoke Journeys` label.
- Canonical CTA pair replaces legacy CTAs: `Reserve a Signature` (primary) + `Open the Studio` (secondary), or page-appropriate equivalents on the human-led pages.
- Single H1 per page. Refreshed meta + canonical to `https://yesexperiencesportugal.com/...`.

---

## 7. Navigation

`Experiences · Travel Designer · Studio · About · Contact` + CTA `Reserve a Signature`. Desktop `Experiences` mega-menu: Signature, Tailored, Corporate, Proposals, Celebrations. Mobile drawer mirrors this.

---

## 8. Pre-payment booking details form

Rendered between `Reserve this day` / `Book it live` and Stripe Checkout for Signature, Tailored and Studio. Travel Designer keeps its existing request flow.

- Title: *Final details before payment.* Intro: *We just need a few details to prepare your private day properly.* Button: *Continue to secure payment.*
- Required: Full name · Email · Phone/WhatsApp · Tour date · Number of guests · Pickup address/hotel/accommodation · Preferred tour language · Main contact person.
- Optional: Dietary restrictions · Mobility notes · Children / child seats · Special occasion · Notes for the guide · Preferred pickup time (only when product supports it).
- Tour date field also enforces `MIN_LEAD_DAYS = 3` (single source of truth from §3).
- Zod-validated, mobile-first, short, premium. Stored on booking/session record before checkout. Selected fields passed as Stripe metadata. `create-signature-checkout` / `create-builder-checkout` minimally patched to require `bookingDetailsId`.

---

## 9. Discreet WhatsApp Support

Floating button site-wide, brand-aligned, never the primary CTA. Label `WhatsApp Support`. Opens `https://wa.me/351911889992`. Hidden on `/checkout/*` and while the pre-payment form is open.

---

## 10. Footer rebuild

- Brand row + tagline (refined).
- Trust strip: `Licensed tour operator (RNAVT) · Direct booking · 700+ five-star reviews` (only what's verified in config; unverifieds reported, not guessed).
- Columns: Experiences · Travel Designer · Company · Connect.
  - Connect column uses the **existing config values** for Instagram, Facebook, TikTok, YouTube, TripAdvisor, Google, WhatsApp. Nothing invented, nothing removed.
- Signature Experiences index preserved.
- **Payment acceptance row** (new, visual only): inline SVGs for Visa, Mastercard, American Express, Apple Pay, Google Pay, Link, plus a discreet `Powered by Stripe` mark. Limited to methods Stripe Checkout exposes for this account.
- Bottom bar: RNAVT, address, copyright, Terms, Privacy.

No backend partner named anywhere customer-facing.

---

## 11. Copy sweep — storytelling kept, rhythm refined

Keep the existing storytelling DNA. Just sharpen it:

- Remove: `AI`, `AI-powered`, `smart recommendations`, `Experience Quality Score`, `concierge confirms`, `one conversation` (when paths are instant), `Bespoke Journeys` as a label, `Free cancellation 48h` unless in current Terms, any "when available" qualifier, any backend partner name.
- Vary the booking verb across the page: *Reserve in minutes*, *Confirm in minutes*, *Book it live*, *Hold your date*, *Begin with a designer* — never the same line twice in a row.
- Lean on sensory verbs already in the brand voice (taste, drift, unwind, arrive, compose).

---

## 12. SEO base

- Homepage `<title>`: `Private Portugal Experiences | YES Experiences Portugal`.
- Meta description, canonical, `og:url` → `https://yesexperiencesportugal.com/`.
- Audit `__root.tsx` so no Lovable preview URL leaks as canonical.
- Per-Signature `<title>` / canonical refreshed.
- Sitemap + legacy-domain 301 untouched.

---

## 13. Read-only Stripe smoke test

1. Signature price/availability loads.
2. `Reserve this day` opens the pre-payment form, not Stripe directly.
3. Form blocks checkout until valid; date < today + 3 days is refused.
4. Stripe Checkout opens with booking-details metadata and expected payment methods (cards, Apple Pay, Google Pay, Link).
5. Tailor stays inside the Signature; outside actions route to Studio / Travel Designer.
6. Studio date phase refuses dates < today + 3 days with the helper line.
7. Studio `Book it live` reaches Stripe via the form.
8. Travel Designer flow unchanged.
9. Success / cancel pages render.
10. No duplicate bookings on webhook retry.

---

## 14. Mobile QA at 393px

Hero CTA pair · Four Ways In bento · nav drawer · Studio date calendar (disabled days + helper visible) · Signature two-action row · Tailor panel · pre-payment form · footer payment row + socials density · WhatsApp button never overlaps the primary CTA.

---

## 15. Final report

Confirm: Travel Designer sample preserved, no Stripe logic broken, pre-payment form present before Stripe, 3-day lead-time enforced in Studio + Signature + Tailored, WhatsApp added discreetly, Tailored guardrails enforced, Signature truth-pass results + flagged uncertainties, no backend partner mentioned anywhere customer-facing, existing socials/TripAdvisor/Google links preserved, legacy redirect intact, no prices changed, no Studio V3 composition/scoring/map/reveal logic changed, mobile 393px result, build/typecheck result.

---

## Technical notes

- New: `src/components/home/FourWaysIn.tsx`, `src/components/booking/BookingDetailsForm.tsx`, `src/components/support/WhatsAppSupportButton.tsx`, `src/components/trust/PaymentMethodsRow.tsx`, `src/lib/tailored-policy.ts`, `src/lib/booking-lead-time.ts` (`MIN_LEAD_DAYS = 3`, `isDateBookable`), `src/lib/booking-details.functions.ts`.
- Modified: Studio date phase (gate + direct live-availability), Signature `/tours/$tourId` (two-action row + tailor panel hook), `Footer.tsx` (payment row, label renames), `__root.tsx` (canonical + WhatsApp mount), `create-signature-checkout` / `create-builder-checkout` (require `bookingDetailsId`).
- Migration: add `booking_details JSONB NULL` + `booking_details_completed_at TIMESTAMPTZ NULL` to `bookings`.

## Unknowns to confirm before shipping

- RNAVT number, business address, current verified review count.
- Whether `Free cancellation 48h` is in current Terms.
- Whether the Travel Designer sample PDF contains real client data needing anonymisation.
- Confirm `/bespoke` URL stays for Sprint A (label-only rename to Travel Designer).
