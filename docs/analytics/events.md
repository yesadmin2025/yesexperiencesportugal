# Analytics event catalogue — YES Experiences Portugal

Container: **GTM-M82SQS79** (loaded in `src/routes/__root.tsx`).
Custom events go through `trackEvent()` in `src/lib/analytics-events.ts`.
GA4 ecommerce events (view_item, add_to_cart, begin_checkout, add_payment_info,
purchase, generate_lead) go through `src/lib/analytics-ga4.ts`.

Every custom event auto-carries: `page_path`, `language`, `device`, and any
persisted `utm_*` / `gclid` / `fbclid` from the current attribution window.
PII (`email`, `phone`, `name`, `given-name`, `family-name`, `message`,
`address`, `user_id`, `customer_email`) is stripped before the push.

## Homepage

| Event | Where it fires | Extra params |
|---|---|---|
| `hero_open_studio` | Hero primary CTA "Open the Studio" | `placement: "hero"` |
| `hero_choose_experience` | Hero secondary CTA "Choose an experience" | `placement: "hero"` |
| `five_ways_signature_click` | Homepage Five-Ways card → Signature | `placement: "five_ways"` |
| `five_ways_studio_click` | Homepage Five-Ways card → Studio | `placement: "five_ways"` |
| `five_ways_moments_click` | Homepage Five-Ways card → Moments | `placement: "five_ways"` |
| `five_ways_corporate_click` | Homepage Five-Ways card → Corporate | `placement: "five_ways"` |
| `five_ways_travel_designer_click` | Homepage Five-Ways card → Travel Designer | `placement: "five_ways"` |

## Signature funnel

| Event | Where it fires | Extra params |
|---|---|---|
| `signature_card_view` | `/experiences` card intersects viewport (once per card per session) | `experience_id`, `experience_type: "signature"` |
| `signature_reserve_click` | Reserve CTA on `/tours/:id` + Mobile Sticky CTA | `experience_id`, `placement` |
| `signature_tailor_click` | Tailor CTA on `/tours/:id` | `experience_id` |
| `availability_open` | `SimpleBookingForm` / `BrandedCheckoutDrawer` opened | `experience_id` |
| `date_selected` | Date picked in booking form | `experience_id` |
| `participants_selected` | Composition changed (debounced) | `experience_id`, `group_size` |
| `checkout_started` | Just before Stripe redirect (Signature + Tailor) | `experience_id`, `value`, `currency`, `group_size`, `utm_*` |
| `checkout_completed` | `/booking-confirmed` mount, once per `session_id` | `experience_id`, `value`, `currency`, `utm_*` |

## Studio funnel

| Event | Where it fires | Extra params |
|---|---|---|
| `studio_started` | Studio intro Begin CTA | – |
| `studio_step_completed` | Step advanced (Continue) | `step_number`, `step_name` |
| `studio_option_added` | Add-on selected | `addon_id` |
| `studio_option_removed` | Add-on removed | `addon_id` |
| `studio_draft_resumed` | Existing draft restored from sessionStorage | – |
| `studio_checkout_started` | Just before Stripe redirect | `experience_id` (`studio-<tier>`), `value`, `currency` |
| `studio_checkout_completed` | `/booking-confirmed?surface=studio` | `experience_id`, `value`, `currency` |
| `studio_abandoned` | pagehide / visibilitychange mid-flow (beacon) | `step_number`, `step_name`, `ms_on_step` |

## Lead generation

| Event | Where it fires | Extra params |
|---|---|---|
| `whatsapp_click` | Any `[data-analytics="whatsapp_click"]` (global delegator) | `placement`, `page_path` |
| `contact_form_started` | First focus into a contact form field | – |
| `contact_form_submitted` | Contact form submit OK | – |
| `moments_lead` | `/moments` form submit | – |
| `corporate_lead` | `/corporate` form submit | – |
| `travel_designer_lead` | `/portugal-travel-designer` form submit | – |

## Trade (B2B, `/trade`)

| Event | Where it fires | Extra params |
|---|---|---|
| `trade_access_click` | Hero "Request trade access" CTA | `placement: "hero"` |
| `trade_email_click` | Hero "Email a local designer" CTA | `placement: "hero"` |
| `trade_whatsapp_click` | WhatsApp entry from `/trade` | `placement` |
| `sample_journey_view` | First interaction with the Travel Designer book preview | `placement: "trade"` |
| `travel_book_sample_request` | "Request a travel book sample" CTA | `placement: "sample_journey"` |
| `trade_faq_open` | A Trade FAQ item is opened | `placement` (item id) |
| `trade_form_started` | First focus into a trade form field | – |
| `trade_form_submitted` | Trade form submit OK | – |
| `trade_form_error` | Validation or network failure | `placement: "validation" \| "network"` |

No agency name, personal name, email or phone is sent with any trade event.

## Other

| Event | Where it fires | Extra params |
|---|---|---|
| `language_changed` | `LanguageSwitcher` click | `from`, `to` |
| `tripadvisor_click` | Any Tripadvisor outbound link | `placement` |
| `google_reviews_click` | Any Google Reviews outbound link | `placement` |
| `phone_click` | Any `<a href="tel:">` (global delegator) | `placement`, `page_path` |
| `email_click` | Any `<a href="mailto:">` (global delegator) | `placement`, `page_path` |

## Consent & privacy

- **Google Consent Mode v2** is initialised default-denied at the top of
  `__root.tsx`, before the GTM snippet loads.
- Events fired while `analytics_storage = denied` are queued in memory and
  flushed once `setAnalyticsConsent("granted")` is called by the banner.
- PII never reaches GA4. See `PII_KEYS` in `analytics-events.ts`.

## UTM attribution

- `src/lib/utm.ts` captures `utm_source|medium|campaign|term|content|gclid|fbclid`
  on any page load that carries them and stores in sessionStorage +
  localStorage (30 days).
- Every `trackEvent` push adds the current UTM snapshot to its params,
  which makes attribution available on lead and checkout events without
  extra plumbing.
- The Stripe checkout server functions forward UTMs into
  `session.metadata` for server-side reporting.

## Dedupe

- Same `(event + experience_id + placement)` fired within 800ms is silently
  dropped (prevents double-click and double-fire on route transitions).
- `checkout_completed` / `studio_checkout_completed` add a per-session
  guard keyed by Stripe `session_id`.
- `signature_card_view` observers only fire once per card per session.
