# Three fixes so the homepage and Studio behave correctly on mobile

## 1. The hero shows a play button instead of the moving film

What happens today: the film is added to the page and told to play. When the phone refuses (iPhone Low Power Mode, data saver, or a slow first second), the still frame stays on screen **with Safari's big play button on top** — exactly the screenshot.

The fix:

- Keep the still photo as the instant first paint, as today.
- Only fade the film in once it is genuinely playing (listen for the `playing` event). Until then the film element stays invisible, so no play badge can ever appear over the hero.
- If play is refused, remove the film element entirely and keep the still photo with its slow drift — the hero still feels alive, never broken.
- Retry once quietly on the first scroll or tap, and when the tab becomes visible again, so a phone that later allows playback gets the film.
- No change to hero copy, buttons, poster art or layout.

## 2. The three Journal cards under the map still reuse Signature cover photos

What happens today: each card avoids the cover photo of *its own* linked tour only. It can still pick a photo that is the cover of a **different** Signature tour shown elsewhere on the site — which is what you are seeing.

The fix:

- Build one exclusion list of every Signature cover photo across the whole catalogue, plus every image already used higher up the homepage.
- Each Journal card then picks a deeper frame from its own real gallery that is not in that list, and the three cards de-duplicate against each other.
- If a card cannot find a clean photo, it falls back to another real gallery frame from the same day — never a stock image, never an invented one.
- Add a small automated check so a future content change cannot silently reintroduce a repeated photo.

## 3. Studio cannot be paid on the spot from a phone

Verified on the live site at phone width: the day composes, the price is correct (€406), the Reserve step opens Stripe — but the payment panel opens on **Stripe Link's "verify your phone number" screen** and a currency chooser, not on a card form. Card entry is buried behind "Pay without Link", and the payment panel only renders 281px wide inside a 393px screen. To a guest this reads as "I can't pay".

The fix:

- Create the payment session so a card form is the first and default thing a guest sees: request card payment explicitly and stop pre-filling the phone number into Stripe (the phone is already captured in Studio and stored with the booking, so nothing is lost).
- Give the payment panel the full width of the phone screen, with no side padding squeezing it.
- Turn off the currency-choice step so the guest sees the euro price they were quoted, with no conversion prompt.
- Add an automated phone-width test that fails if the payment panel does not show a card field and a pay button within a few seconds of pressing Reserve.

## Technical notes

- `src/components/home/CinematicHero.tsx` — `HeldClip`: gate visibility on the `playing` event, unmount on `play()` rejection, one retry on `pointerdown`/`visibilitychange`, all behind `prefers-reduced-motion`.
- `src/routes/index.tsx` — `journalCardMeta`: exclusion set built from all `SIGNATURE_TOURS[].img` plus homepage-rendered images, not just `tour?.img`; add a unit test asserting three distinct sources with no overlap with any cover.
- `supabase/functions/create-signature-checkout` — set `payment_method_types: ['card']` (removes the Link wall), drop `customer_details.phone` prefill, keep `ui_mode: 'embedded_page'`, `currency: 'eur'`, and disable adaptive pricing on the session.
- Studio summary panel container: remove the `max-w`/`px-5` constraint around the embedded checkout mount at `<640px`.
- New Playwright spec (393px, WebKit) asserting a card number field is visible inside the embedded checkout frame after Reserve.
- Pricing, itinerary truth, and the reserve gate (`canReserve`) are untouched.

Publish is required for any of this to reach the live domain.
