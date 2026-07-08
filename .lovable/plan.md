# Event tracking plan — GA4 / GTM ready

Goal: prepare the 18 requested events so we can ship a `dataLayer` push (GTM → GA4) later without another round of component surgery. Also keeps the existing Supabase `builder_events` telemetry intact.

---

## 1. Recommended naming structure

Use the names you listed verbatim as GA4 `event_name`. They already follow GA4 rules (snake_case, ≤40 chars, `[a-z0-9_]`). Group them by funnel so GTM triggers stay tidy:

```text
surface_action_object[_state]
```

| Funnel stage      | Events                                                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero              | `hero_open_studio_click`, `hero_choose_experience_click`                                                                                     |
| Five Ways band    | `five_ways_signature_click`, `five_ways_studio_click`, `five_ways_moments_click`, `five_ways_corporate_click`, `five_ways_travel_designer_click` |
| Studio funnel     | `studio_start_click`, `studio_step_1_complete`, `studio_step_2_complete`, `studio_continue_draft_click`                                      |
| Signature funnel  | `signature_reserve_click`, `signature_tailor_click`                                                                                          |
| Contact / support | `whatsapp_click`, `email_click`                                                                                                              |
| Commerce          | `checkout_started`, `payment_success`                                                                                                        |
| Editorial         | `local_story_cta_click`                                                                                                                      |

Recommended standard `params` on every event (kept small so GA4 free tier stays clean):

- `page_path` — `location.pathname`
- `page_group` — `home | studio | signature | contact | local_story | checkout` (derived from route)
- `surface` — component id (e.g. `cinematic_hero`, `five_ways`, `signature_card`)
- `label` — human-readable CTA text (e.g. "Reserve instantly")
- `tour_id` / `tour_slug` — on Signature + checkout events
- `step` — on Studio step events (`1`, `2`, …)
- `value`, `currency` — on `checkout_started` + `payment_success` (GA4 ecommerce mapping)
- `variant_id` — when hero A/B or Studio pace variant is active

For `payment_success` also emit GA4 `purchase` (recommended event) alongside the branded name, so GA4 auto-links revenue reports.

---

## 2. Where each event fires

| Event                             | File / component                                                                                    | Trigger                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `hero_open_studio_click`          | `src/components/home/CinematicHero.tsx` — primary CTA                                               | onClick                                          |
| `hero_choose_experience_click`    | `src/components/home/CinematicHero.tsx` — secondary CTA                                             | onClick                                          |
| `five_ways_*_click` (×5)          | `src/components/home/FourWaysIn.tsx` (needs rename or new "FiveWays" — confirm which band you mean) | onClick per card                                 |
| `studio_start_click`              | `src/components/home/StudioLivePreview.tsx` + any "Start Studio" surface (Navbar CTA)                | onClick                                          |
| `studio_step_1_complete`          | `src/components/studio-v3/StudioV3.tsx` (beat/step transitions)                                     | on advance from beat 1                           |
| `studio_step_2_complete`          | same                                                                                                 | on advance from beat 2                           |
| `studio_continue_draft_click`     | Studio warm-resume surface (already emits `studio_v2_warm_resume` in `builder-analytics.ts`)         | onClick of the "continue" chip                   |
| `signature_reserve_click`         | `src/components/SimpleBookingForm.tsx` + `src/routes/tours.$tourId.tsx` "Reserve" button            | onClick                                          |
| `signature_tailor_click`          | `src/components/SimpleTailorForm.tsx` + `src/routes/tours.$tourId.tailor.tsx` entry CTA             | onClick                                          |
| `whatsapp_click`                  | `src/components/support/WhatsAppSupportButton.tsx`, `WhatsAppFab.tsx`, `FloatingActions.tsx`, Footer | onClick                                          |
| `email_click`                     | Any `mailto:` — Footer, Contact route, Corporate                                                    | onClick                                          |
| `checkout_started`                | `supabase/functions/create-signature-checkout/index.ts` **and** `create-builder-checkout` — dispatch client-side just before `window.location = stripeUrl` | in caller components before redirect             |
| `payment_success`                 | `src/routes/checkout.success.tsx` (or wherever Stripe returns) — verify server confirms first        | on mount, once, dedupe by `session_id`           |
| `local_story_cta_click`           | `src/routes/local-stories.$slug.tsx` — bottom CTA(s)                                                | onClick                                          |

---

## 3. Data attributes vs direct calls — use both, with rules

**Recommendation:** small typed `track()` wrapper called directly, with an optional `data-analytics-event` declarative fallback wired by one delegated listener.

- **Direct call — default choice.** Every CTA in the map above should call `track('hero_open_studio_click', { surface: 'cinematic_hero', label })` inside its `onClick`. Reasons:
  - Full TypeScript safety (union of allowed event names — extends the existing `BuilderEvent` union pattern in `src/lib/builder-analytics.ts`).
  - Access to component-local params (`tourId`, `step`, `variant_id`) that data attributes can't express cleanly.
  - Works for non-click events (`studio_step_1_complete`, `payment_success`, `checkout_started`).
- **`data-analytics-event` — escape hatch.** Register a single delegated listener in `src/lib/analytics.ts` that reads `data-analytics-event`, `data-analytics-*` and dispatches. Useful for:
  - Static links inside MDX / rich text (Local Stories body copy).
  - Third-party embeds we don't control component-side.
  - Rapid QA — marketing can add tracking to a new CTA without a code change beyond attributes.

Dispatch layer (single file, no vendor lock-in):

```ts
// src/lib/analytics.ts
type AnalyticsEvent =
  | 'hero_open_studio_click'
  | 'hero_choose_experience_click'
  | 'five_ways_signature_click'
  | /* …full union… */
  | 'local_story_cta_click';

export function track(event: AnalyticsEvent, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  const payload = { event, page_path: location.pathname, ...params };
  // 1. GTM / GA4
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).dataLayer.push(payload);
  // 2. Existing Supabase telemetry (fire-and-forget)
  void trackBuilderEvent(event as any, params).catch(() => {});
}
```

GTM/GA4 loads later from `__root.tsx` via `head.scripts` (async, non-blocking). Until then, `dataLayer.push` is a no-op but the queue survives — no wasted work re-instrumenting later.

---

## 4. Files & components affected

New:
- `src/lib/analytics.ts` — typed `track()`, delegated listener, GA4 param normaliser.
- (later) `<GtmScript />` snippet in `src/routes/__root.tsx` `head.scripts`.

Edited (touch surface only):
- `src/components/home/CinematicHero.tsx`
- `src/components/home/FourWaysIn.tsx` (confirm this is the "Five ways" band — currently named "FourWaysIn")
- `src/components/home/StudioLivePreview.tsx`
- `src/components/studio-v3/StudioV3.tsx` — step complete transitions
- `src/components/SimpleBookingForm.tsx`, `SimpleTailorForm.tsx`
- `src/routes/tours.$tourId.tsx`, `src/routes/tours.$tourId.tailor.tsx`
- `src/components/support/WhatsAppSupportButton.tsx`, `WhatsAppFab.tsx`, `FloatingActions.tsx`, `Footer.tsx`
- `src/routes/contact.tsx`, `src/routes/local-stories.$slug.tsx`
- Checkout entry points (before Stripe redirect) + Stripe return route (`payment_success`).

No changes needed in `builder-analytics.ts` — `track()` re-uses it so existing Studio telemetry keeps flowing.

---

## 5. Implementation complexity

| Chunk                                                             | Complexity |
| ----------------------------------------------------------------- | ---------- |
| `src/lib/analytics.ts` (wrapper + delegated listener + types)     | XS         |
| Hero + Five Ways + Studio start + Local Story CTA wiring          | S          |
| Signature reserve/tailor wiring across Signature routes           | S          |
| WhatsApp + email surfaces (4 files)                               | XS         |
| Studio step-complete events inside StudioV3 beats                 | S–M (need to identify precise beat-advance callbacks) |
| `checkout_started` / `payment_success` (dedupe by session_id, `purchase` alias) | M |
| GTM container inject + verify in `dataLayer` via Playwright       | S          |

**Total:** ~half a day of work, no schema changes, no design changes.

### Open confirmations before coding

1. Is the "Five ways" band the current `FourWaysIn` component, or is a new fifth card being added? Names below assume 5 cards exist.
2. Which GA4 property + GTM container ID should we wire? (Add via `secrets` when ready — never inline.)
3. Should `payment_success` also fire the GA4 `purchase` event with `items[]` for revenue reporting? (Recommended.)

### Risk

Low. The wrapper is additive; existing Studio Supabase telemetry keeps working. No user-visible UX change. Main risks are (a) missing a CTA surface — mitigated by grep for `href="/builder"` / `mailto:` / `wa.me` before shipping, and (b) firing `payment_success` twice on Stripe return — mitigated by `sessionStorage.setItem('paid:' + session_id, '1')` guard.
