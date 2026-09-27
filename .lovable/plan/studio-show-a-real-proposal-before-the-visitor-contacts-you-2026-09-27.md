# Studio: show a real proposal before the visitor contacts you

## Goal
When Studio reveals the day, the visitor sees a clear proposal card with facts, not only the story: duration, pickup, what's included and the price. They see it before any contact or enquiry form.

## What the visitor sees
On the reveal, directly under the story:
- **Duration**: taken from the matched Signature tour (for example, "8 hours").
- **Pickup**: their chosen pickup address, or "Door-to-door from your address in Lisbon" if they haven't picked one yet.
- **Included**: the tour's real inclusions list (maximum 5 lines, then "See everything included").
- **Price**: "from €X per person" for their group size, taken from the existing price tiers, plus the small note "price per person varies with group size".
- Two actions: "Love this day · Reserve it" (main) and "Talk to a local" (WhatsApp, quiet link).

The AI text stays as tone only. Every fact in the card comes from the verified tour data, never from the AI.

## When facts are missing
If a detail isn't in the tour data, the line is hidden, never guessed. Corporate and multi-day requests keep the enquiry flow and show "Proposal prepared by a local expert", with no price.

## Not changed
Prices, price tiers, how Studio chooses the day, the questions, checkout, Stripe, booking rules, tour facts and the database.

## Technical details
- Reuse `DayAtGlance.tsx` / `SignaturePriceCard.tsx` data, fed by the resolved tour from `signatureTours.ts` and the existing pricing helper; mount the card in `FinalRevealStory.tsx` / `SignatureDayReveal.tsx` above `LeadCaptureSheet`.
- Pure selector `buildStudioProposal(tour, logistics, guests)` returning only present fields; unit test that no field is produced without source data and that the price matches checkout for 1–8 guests.
- Mobile first at 393px; editorial reveal motion (existing tokens), reduced-motion respected.
