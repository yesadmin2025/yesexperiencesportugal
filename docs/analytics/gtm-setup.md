# GTM setup — YES Experiences Portugal

Container **GTM-M82SQS79** already loads from `src/routes/__root.tsx`
(head snippet + noscript iframe). This document is a build sheet for the
GTM workspace itself.

## 1. Variables (Data Layer Variables)

Create one DLV per parameter our events push:

| Variable name | Data layer key |
|---|---|
| `dlv.page_path` | `page_path` |
| `dlv.language` | `language` |
| `dlv.device` | `device` |
| `dlv.experience_id` | `experience_id` |
| `dlv.experience_type` | `experience_type` |
| `dlv.group_size` | `group_size` |
| `dlv.placement` | `placement` |
| `dlv.value` | `value` |
| `dlv.currency` | `currency` |
| `dlv.utm_source` | `utm_source` |
| `dlv.utm_medium` | `utm_medium` |
| `dlv.utm_campaign` | `utm_campaign` |
| `dlv.utm_term` | `utm_term` |
| `dlv.utm_content` | `utm_content` |
| `dlv.gclid` | `gclid` |
| `dlv.fbclid` | `fbclid` |
| `dlv.ecommerce` | `ecommerce` |

## 2. Triggers (Custom Event, exact match)

For each event in `docs/analytics/events.md`, create a Custom Event trigger
whose Event Name is the exact event string.

Naming convention: `CE — <event_name>` (e.g. `CE — hero_open_studio`).

## 3. GA4 tags

One GA4 Configuration tag (fires on All Pages) using the property's
Measurement ID. Then one GA4 Event tag per custom event, wired to its
Custom Event trigger, event name = trigger name. Attach the parameter
DLVs relevant to that event (see the tables in `events.md`).

Ecommerce events (`view_item`, `add_to_cart`, `begin_checkout`,
`add_payment_info`, `purchase`, `generate_lead`) map their `ecommerce`
object directly — enable "Send Ecommerce data" and pick "Data Layer" as
the source.

## 4. Key events (GA4 conversions)

Mark as key events (formerly "conversions") in GA4:

- `checkout_completed` (Signature/Tailor purchase)
- `studio_checkout_completed` (Studio purchase)
- `purchase` (redundant with the two above via ecommerce)
- `moments_lead`, `corporate_lead`, `travel_designer_lead`
- `contact_form_submitted`
- `whatsapp_click` (soft lead)
- `generate_lead`

## 5. Consent Mode v2

- `analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization`
  all default to **denied** in `__root.tsx`.
- The banner (or `setAnalyticsConsent("granted")`) fires `consent_update`
  with `analytics_storage = granted` once the user accepts.
- Enable "Consent Overview" in the GTM container to lock built-in tags to
  `analytics_storage`.

## 6. Preview / QA

1. GTM Preview → open the site.
2. Walk the funnel: hero → five ways → signature card → reserve → date →
   composition → checkout → confirmation.
3. Confirm each event fires once and carries `page_path`, `language`,
   `device`, and UTM params when a `?utm_source=…` was used.
4. Verify no PII appears in the DataLayer inspector for any event.
