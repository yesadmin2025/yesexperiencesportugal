# Conversion / UX audit — current preview (read-only)

What I checked: the homepage, /experiences, the Arrábida Wine tour, the /studio landing page and /portugal-travel-designer. I loaded each page at 390px (phone) and 1280px (desktop), recorded which buttons show in the first screen and what stays fixed on screen, measured how far down the booking box sits, and went through the Arrábida booking box up to the Reserve button.
What I did not check: payment, the full Studio flow past its landing page, and sending the Travel Designer form. Those items below are marked "unverified" and should be tested next. I haven't invented any funnel percentages.

## A) Top 5 friction points (ranked by likely commercial impact)

1. **Couples see a lower "from" price than they will pay.** The phone booking bar and the price cards say "From €135", but that is the price per person for 7–8 travellers. A couple (your main buyer) pays €183 per person, €366 in total, and only finds out inside the booking box. This is the most likely cause of drop-off at checkout and of lost trust.
   - Files: `src/components/booking/MobileReserveBar.tsx`, the `priceFrom` value on tour cards in `/experiences`, the tour page hero price, and `PriceQualifier`.
2. **On phones the booking box is about 8 screens down.** On the Arrábida page it starts around 6,900px into a 17,100px page. There is no Reserve button in the first phone screen (desktop has one). The phone booking bar fills this gap, but only after the cookie notice is answered (see 3).
   - Files: `src/routes/tours.$tourId.tsx` (section order), `#book` in `SimpleBookingForm.tsx`.
3. **On a first visit, the cookie notice hides the booking bar.** `MobileReserveBar` stays hidden while `.cookie-consent-card` is on screen. That was a deliberate choice so two bars don't stack. Until the visitor answers, the first phone screen shows Cookie / Customise / Essential only / Accept all and WhatsApp, but no booking action. That affects the 64% who bounce, and phones are your biggest group of visitors.
   - Files: `MobileReserveBar.tsx` (cookie check), the cookie consent component.
4. **The Reserve button is greyed out with no explanation.** In the booking box, "Reserve this day" stays disabled until a date is picked, and "Tailor this day" sits right next to it. A visitor who taps Reserve straight away gets no response. The visible label also says "Book the Signature, as designed", which is your internal wording.
   - Files: `SimpleBookingForm.tsx` (around line 699, `signature-reserve-cta`), `CtaButton` disabled state.
5. **The booking box asks for too much before the date.** In order, it shows: reviews, trust lines, a 3-row price table, availability, date, adults, a children question, a 4-row price-by-age table, Add a child, an explanation line, trip preferences, and the total. For the simplest booking (2 adults, one date) that is a lot of reading before the one decision that matters. The age table could stay folded away until a child is added (unverified whether it already does this on smaller screens).
   - Files: `SimpleBookingForm.tsx`, `PerPersonBands.tsx`.

Also seen, lower priority:
- On the homepage at 390px, the first screen has only two main buttons ("Design your day", "Explore experiences") plus a quiet Travel Designer link. That's good. But a visitor has to infer what "Design your day" means compared with "Experiences".
- The /studio landing page is one screen with a single "Design your day" button and no price hint. Someone who doesn't yet know what Studio is gets no answer before committing (unverified past the landing page).
- The Travel Designer page has a clear "Design my journey" button. The form length and the reply-time promise are still to be checked.

## B) Quick wins (no redesign)

1. Make the "from" price honest for couples: show the 2-guest price in the phone bar and on cards, or label the current one "from €135 pp for groups of 7–8". Presentation only; prices stay the same.
2. Let the phone booking bar show above the cookie notice, or turn the cookie notice into a slim top or inline strip on tour pages, so a booking action is always visible.
3. When Reserve is tapped with no date, scroll to and highlight the date picker with a short line ("Choose a date to reserve"). Keep the button visually active. Replace "Book the Signature, as designed" with plain wording.
4. Keep the price-by-age table and the explanation line folded under "Travelling with children?" until a child is added.
5. Make "Tailor this day" a lighter text link under Reserve inside the booking box, so it doesn't look like an equal second choice.
6. On phones, add a short summary line at the top of the tour page (price for 2 · duration · pickup · free cancellation) that jumps to `#book`.

## C) Looks fine — do not change

- The homepage first screen (two-line statement, two buttons, quiet Travel Designer link) has no clutter at 390px and no sideways scrolling.
- The booking box's trust block: 4.9/5 with 1,000 reviews, instant confirmation, secure payment, free cancellation 24h, WhatsApp help.
- The phone booking bar hides itself once the booking box is on screen, and moves the WhatsApp button up so they don't overlap.
- No page had sideways scrolling at 390px.
- The Travel Designer page's main action and its WhatsApp alternative.
- The verified inclusions shown before payment (fixed earlier) and the clear total ("€366 · €183 / adult for a group of 2").

## D) Publish the SEO-only change first?

Yes. It only touches the reviews-page link, winery titles and descriptions, and the Évora link. It's low risk and doesn't affect any of the issues above. Publish it now; the UX changes can follow separately.

## E) Routes and files per issue

| Issue | Route | Files |
|---|---|---|
| 1 Misleading "from" price | /tours/*, /experiences | MobileReserveBar.tsx, tour card component, PriceQualifier, PriceEur |
| 2 Booking box too far down | /tours/$tourId | routes/tours.$tourId.tsx, SimpleBookingForm.tsx |
| 3 Cookie notice hides booking bar | /tours/* (phone) | MobileReserveBar.tsx, cookie consent component |
| 4 Reserve greyed out with no reason | /tours/* | SimpleBookingForm.tsx, ui/CtaButton.tsx |
| 5 Too much before the date | /tours/* | SimpleBookingForm.tsx, checkout/PerPersonBands.tsx |
| Studio landing gives no context | /studio | studio-v3/LivingAtlasStudioPage |

## Next step if approved

Run the checks marked unverified: Studio through to the price reveal, the Travel Designer form, and the checkout fields and going back (stopping before payment). Then apply quick wins 1–5, which only change presentation, not prices, payments or booking rules.
