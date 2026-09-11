# Homepage copy rewrite + premium hero motion

Two things: fix the repetitive, overlapping homepage wording, and make the hero feel calmer and more cinematic.

## What is wrong today (checked in the page)

- The word "Choose" appears five times in the first two screens: the paths heading ("Choose how you want to travel"), the Signature card ("Choose a private day"), the Studio card ("Choose your mood, group and rhythm"), the Studio section ("Choose mood, group and rhythm"), and the Why-YES pillar ("Choose the pace, the stops and the feeling").
- The Studio is sold twice, almost word-for-word: once as a card right under the reviews, again as a full section a screen later. The reader learns nothing new the second time.
- "Open the Studio" is the button label in three separate places on one page.
- The occasions band mixes four different intents in one row — proposals, celebrations, corporate, multi-day journeys — under a single heading, so groups, romance and long trips read as one blurred category.
- The heading right after the reviews jumps straight into choosing before saying what YES actually is.

## Copy plan

**1. Paths block (under the reviews)**
- Heading: "Three ways into Portugal." with the italic accent kept.
- Signature card: "A private day, ready to go" — body about a proven route, tailored to the details that matter.
- Studio card: shortened to a one-line teaser only ("Shape a day around your mood, pace and people — see the real route and price before you reserve"), because the full Studio pitch comes later.
- Designer card: "Plan a whole Portugal journey" — unchanged intent, tightened wording.
- Remove the word "choose" from every card; use verbs that differ: pick / shape / plan.

**2. Studio section**
- Rewrite the paragraph so it adds what the card did not: real timings, live price, confirmation in minutes, a local reachable afterwards. No "choose mood, group and rhythm" repeat.
- Keep one primary button here; this is the page's Studio moment.

**3. Occasions band → split into two clear ideas**
- "Occasions" keeps proposals and celebrations only, with a heading about moments that deserve a setting.
- Corporate and multi-day move under a second, quieter heading ("Bigger plans") so groups and long journeys stop competing with romance.
- Fix the mismatched section label (it currently says "groups" while showing occasions).

**4. Button vocabulary**
- Three distinct primary labels across the page instead of "Open the Studio" three times: "Design your day" (paths card), "Open the Studio" (Studio section), "Start your Portugal" (closing block). Destinations unchanged.

**5. Why-YES pillars**
- Reword the pillar that starts with "Choose the pace" so the page's freedom idea is stated once, in its own words.

Locked and untouched: the hero headline "Portugal is the stage. You write the story.", the hero eyebrow, subheadline and CTA labels, all prices, tour names, review numbers and links.

## Hero motion plan

- Slower, sequenced entrance: eyebrow, then headline lines one after the other, then subheadline, then buttons, with longer gaps and a softer easing curve so nothing "pops".
- Longer, gentler cross-fades between film chapters, with a very slow scale drift on the film so it breathes instead of cutting.
- Softer scrim gradient so the headline lifts off the footage without a grey box behind it.
- Buttons get a slower, quieter hover (light gold sweep, small lift) instead of an abrupt state change.
- More air: increased spacing between headline, subheadline and buttons; lower links stay compact and quiet.
- Everything respects reduced-motion and keeps the existing timing contract, analytics hooks and test selectors intact.

## Technical notes

- Copy edits: `src/components/home/FourWaysIn.tsx`, `src/components/home/WhyYesPillars.tsx`, `src/routes/index.tsx` (Studio, Occasions, closing sections).
- Occasions split reuses the existing `EditorialCard` primitive and the existing `groupsAndCelebrations` data, partitioned by id — no new data source, no new components.
- Hero motion changes are confined to `src/components/home/CinematicHero.tsx` plus scoped `.home-energy` utilities in `src/styles.css`; `HERO_COPY`, `data-hero-field` hooks and the phrase cadence contract stay byte-identical so the hero copy and crossfade suites keep passing.
- Verification: `bunx tsgo --noEmit`, the hero copy/byte-exact suites, homepage structure and CTA-vocabulary specs, plus a mobile screenshot pass.
