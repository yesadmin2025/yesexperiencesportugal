# Studio V3 — product audit (live browser, 393px + 1440px)

Walked the real flow twice per viewport: Intro → name → Feeling → Who → Interests → Rhythm → adaptive refinement → Logistics → Your Day (map/reel) → Reveal → Guest details → Summary, with screenshots at every phase.

## A. Overall verdict — 7.5 / 10

The Studio already reads as a private travel director rather than a marketplace: the question sequence is emotionally led, the language is restrained and specific, and the final day is composed from real stops (Mercado do Livramento, Cristo Rei, José Maria da Fonseca, Azeitão lunch) with honest drive times and a single clear price. That is well ahead of anything an OTA does. What holds it back from a 9 is the middle of the journey: the "Noted" interpretation overlay currently renders as an empty grey card with loading dots and blocks taps for a couple of seconds, the "Your Day" map paints as a near-blank grey rectangle with overlapping labels, and the reveal — the emotional payoff — is a long unbroken column of text with no imagery at all. For a 50+ US traveller about to spend €366+, the payoff screen currently reads more like a confirmation letter than a reveal. Everything wrong is small, local and fixable; nothing needs redesigning.

## B. Top 5 already excellent

1. **The question ladder.** Feeling → Who → Interests → Rhythm is genuinely emotional, one decision per screen, and the option copy ("Cliffs, coves, salt air", "Three stops. Long pauses.") is specific, human and free of AI filler.
2. **Honest logistics consolidation.** Date + starting point + party on one screen, with "I'm flexible" and "I don't know yet" as first-class answers, removes the classic booking-form wall.
3. **Price honesty.** "Estimated for 2 guests · €366 · €183 / adult", the age-band table (100/75/50/free) and "What can change this price" are unusually transparent and pre-empt price anxiety.
4. **The summary screen.** Date, guests, stops, travellers, contact, total, "Instant confirmation" — calm, auditable, nothing hidden. This is checkout done right.
5. **Brand coherence in type and palette.** Fraunces italic emphasis on ivory, teal accents, champagne rules, uppercase Inter eyebrows — consistent across all phases, no default shadcn tells.

## C. Top 5 remaining friction points

| # | Sev | Screen | Problem |
|---|-----|--------|---------|
| 1 | **P0** | Interpretation beat over Logistics | The "YES — NOTED" overlay shows an empty grey card with a row of dots for ~2s and intercepts pointer events. It reads as a failed image / loading spinner, not a cinematic beat, and it blocks the primary CTA underneath. Highest-risk moment for a 50+ user who taps and nothing happens. |
| 2 | **P0** | Your Day (map/reel), both viewports | The map area renders as an almost blank grey rectangle; on mobile the moment name "Mercado do Livramento" overlaps the "THE DAY TAKES SHAPE" title. The one screen that should prove "this is a real route in a real place" proves the opposite. |
| 3 | **P1** | Reveal (confirmation) | Zero imagery. ~500 words of continuous prose before the price. The reward is intellectual, not sensory — it does not yet feel like a bespoke day worth the eight questions. |
| 4 | **P1** | Summary, mobile 393px | The sticky "Reserve and pay" bar covers the TOTAL row (€366 sits half-hidden behind the bar). The one number a buyer re-checks before paying is the one obscured. |
| 5 | **P2** | Desktop 1440px | Everything is a 520px centred column in a very wide frame; the reveal parchment card is mostly empty. Desktop feels like a stretched phone, not a designed second viewport. |

Secondary observations (not in top 5): the intro hero image is so dark it reads as flat grey; the interests grid offers 10 options where the brand rule is 5–6 visible; the guest-details screen shows all "(required)" hints before any interaction, which reads slightly bureaucratic.

## D. Ten small pre-launch tweaks

1. Interpretation beat: drop the empty image card and dot row — keep only the gold rule + the italic line ("Time inside the cellar. We will build the day around that.") on the ivory ground.
2. Interpretation beat: make it non-blocking — `pointer-events: none` on the overlay layer, auto-dismiss ≤1.4s, so the Logistics CTA is never dead.
3. Your Day, mobile: move "TODAY'S DRAFT / <moment name>" below the map frame instead of inside it, clearing the overlap with "THE DAY TAKES SHAPE".
4. Your Day: when no map tiles/route render, fall back to the numbered timeline immediately rather than showing an empty frame.
5. Reveal: place one real photo of the first stop above the story text (the moment cards already carry image slots) — one image, not a gallery.
6. Reveal: break the prose into the four numbered moments already used elsewhere (01/02/03/04 with name + drive time), keeping the narrative sentence under each. Same words, scannable rhythm.
7. Reveal: raise body text from ~13px to 15–16px and tighten the measure — this is the longest read in the product and the target reader is 50+.
8. Summary, mobile: add bottom padding equal to the sticky bar height so TOTAL is never covered.
9. Guest details: show "(required)" / helper errors only after blur or submit attempt; keep the neutral field state on first paint.
10. Interests: show 6 moments with a quiet "More moments" expander for the remaining four, per the max-6 rule.

## E. What NOT to touch

- The question sequence, its order, and the option wording.
- "Let YES decide" and the flexible/undecided date answers.
- Pricing logic, the age-band table, and "What can change this price".
- The summary layout, its field order and "Instant confirmation" line.
- Typography and palette tokens (Fraunces + Inter, ivory/teal/champagne).
- CTA vocabulary (Begin · Personalise a few details · Continue to guest details · Reserve and pay).

## F. Launch recommendation

**Ship after tiny polish.** Items 1–4 and 8 in section D are the launch gate: they are the three places where the product currently looks broken rather than restrained (dead-looking beat, empty map, covered total). All are contained presentation fixes, roughly a single focused pass. Items 5–7 (reveal imagery, moment structure, type size) materially raise the payoff and are strongly recommended in the same pass; 9–10 and the desktop composition can follow after launch.
