# Studio and checkout audit — 18 October 2026

## Reliable traffic evidence

Live-domain visit history starts on 3 October, so a full 30-day comparison is unavailable. As of 18 October 07:44 UTC: 2,047 page views, 1,622 anonymous visitors; Contact 97 visitors, /book 68, Arrábida wine 70, Experiences 55, Studio 54, Arrábida Tailor 32. These are page-level counts, not an attributed purchase funnel.

The visit stream contains zero booking_start visitors. Studio's historical funnel includes 826 mobile intro sessions, 197 mobile feeling sessions, 599 mobile storyboard sessions and 208 mobile guest-detail sessions, far above 54 recorded live Studio visitors. Device detection cannot identify all mobile-emulated QA. Old flow ordering, deep entries and historical instrumentation also prevent treating those totals as one cohort. Previous claims of ~60% Feeling abandonment, 270–315 visits/day or a proven 3D Secure cause are not supported by this verified dataset.

No precise live mobile abandonment percentage is claimed. The demonstrable opportunity is Contact receiving more visitors than Studio, alongside the actual inclusion mismatch and missing sharing action. New live cohorts should be reviewed after publication, not mixed with older events.

Live Stripe bookings created in the current week: three paid-status bookings, €2,265.44 total (one has no payment_status despite paid status). This is incomplete-week booking evidence, not session-attributed conversion.

## Repairs

- The active reveal price card still used the raw catalogue inclusion list; payment payload also froze that list despite guest-summary filtering. All now call the composed-day helper on authoritative route labels.
- Removed catalogue-only lunch, named admissions and private workshops must not survive through a general-service keyword; Monday Livramento exclusion has a concrete regression.
- No invented inclusion fallback if the verified filtered list is empty.
- WhatsApp shares only day title, date, stops and total, explicitly unconfirmed; no guest email, phone or pickup address.
- Existing date calendar and valid alternatives retained. Earlier-date WhatsApp and pickup-area/address-later clarity added without changing availability rules.
- Signature/Tailor shared guest recap now reads its supplied date and party instead of discarding them. Existing cancellation, secure-payment reassurance and sticky controls retained.
- Contact's general/private-day/Studio entry gets Signature and Studio shortcuts and urgent WhatsApp; Corporate/Moments preselection remains enquiry-focused.

## Release checks

Preview only. No deployment or payment submission authorized in this phase. Mobile sweeps must open real test Stripe before the release is called ready.