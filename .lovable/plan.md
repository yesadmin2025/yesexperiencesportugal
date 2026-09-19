# Premium motion system — visible on mobile, refined everywhere

## Goal

Make the public website feel alive on a phone without bounce, floating cards, cheap parallax, or effects that compete with reading and booking. Movement should support the journey: reveal the story, guide the eye, and make the next action feel unmistakable.

## Verified starting point

- The existing `SplitLines` storytelling component is not used anywhere on the public site, so no phrase currently receives a written/narrative reveal.
- About relies mainly on one opacity fade for each entire section. Its headings, story paragraphs, founder image, proof points, and final actions do not form a visible sequence.
- Shared CTA arrows start their one-shot animation when the page loads. On mobile, arrows below the first screen often finish moving before the visitor scrolls to them.
- The site currently has overlapping reveal systems: section-level reveals, automatic public-page tagging, and Scene reveals. Their safe fallbacks are useful, but the overlap makes timing inconsistent and often visually imperceptible.
- The captured ResizeObserver warning has no stack and no confirmed connection to the motion issue. It will be monitored during visual validation rather than treated as the cause.

## Motion direction

### 1. Story phrases that feel written, not typed

Use a restrained **editorial ink reveal** for one short phrase per major section:

- reveal by line or meaningful phrase group through a horizontal mask;
- add a subtle gold rule that draws once beneath or beside the phrase;
- no blinking cursor, letter-by-letter jitter, vertical rise, bounce, or repeated loop;
- keep the real text present in the page from the first render so Google and assistive technology receive the complete sentence;
- use 650–850ms for the phrase, with 100–140ms between lines.

This becomes a selective storytelling accent, not an effect applied to every paragraph.

### 2. Mobile-first scroll choreography

Each public section gets one clear sequence when it enters the visible area:

1. eyebrow or gold rule appears;
2. selected title/phrase reveals through its mask;
3. supporting copy fades in;
4. image settles from a restrained crop/scale change;
5. the action and arrow complete the sequence.

Everything remains in a fixed position. No element travels up and down, and no card follows the centre of the screen.

### 3. Arrows that are actually visible on mobile

Replace page-load arrow animation with a viewport-entry cue attached to the specific action:

- the line draws or extends once;
- the arrowhead advances 6–8px and stays in its final position;
- the cue starts only when the button or card is visible, including below-fold content;
- tapping gives immediate press feedback without restarting or reversing the arrow;
- pointer hover remains a quiet directional extension on desktop.

Apply this consistently to the shared CTA button, homepage paths, experience cards, Signature links, About actions, and editorial story links.

### 4. About page as a composed editorial story

Give `/about` its own calm chapter rhythm while keeping all existing copy and facts:

- opening: eyebrow, headline phrase, then supporting lines;
- origin story: one highlighted sentence receives the ink reveal;
- founder chapter: image uses a horizontal photographic reveal while text appears in measured groups;
- services and credentials: items resolve in a short left-to-right or top-to-bottom cadence, without movement of their boxes;
- policies remain quieter and highly readable;
- final invitation and its arrows appear only when the action area enters the screen.

Remove the cheap small-image parallax from About; image depth comes from framing and reveal, not positional drift.

### 5. Consistency across public pages

Extend the same grammar—without copying the exact same sequence everywhere—to:

- homepage;
- Experiences collection;
- every Signature experience;
- Local Stories and destination pages;
- Travel Designer, Moments, Corporate, Contact, and About.

Use the page’s content hierarchy to choose one dominant motion idea per section. Checkout, booking forms, Studio, Tailor, authentication, and administration remain quiet and immediate.

## Technical approach

- Consolidate public scroll entrances under one observer/controller and remove competing ownership for the same element.
- Rework the existing line-reveal primitive into an SSR-safe editorial mask that supports React content and intentional manual line breaks; do not split measured browser lines or mutate text after hydration.
- Add a shared viewport-aware arrow cue instead of running arrows globally at page load.
- Keep motion values tokenized: 140–200ms interaction, 380–520ms ordinary reveals, 650–850ms narrative phrases, 700–1000ms only for the homepage Hero.
- Preserve visible-by-default HTML. Hidden starting states activate only after JavaScript and an observer are ready, with a fail-safe that reveals any visible content.
- Respect `prefers-reduced-motion`: complete text, imagery, and arrows appear immediately with no decorative transition.
- Do not change copy, pricing, inventory, booking/payment behavior, SEO metadata, schema, routes, or database structures.

## Validation before release

- Record real scroll passes at 393px on homepage, About, Experiences, one Signature page, one Local Story, and Travel Designer.
- Repeat at 1280px to verify desktop hover and page transitions.
- Confirm every below-fold arrow moves when it becomes visible—not earlier—and remains still afterward.
- Confirm selected phrases build as a narrative while ordinary paragraphs remain calm.
- Verify no bounce, vertical oscillation, hidden content, overlap, horizontal overflow, layout shift, hydration error, or animation-induced ResizeObserver loop.
- Verify reduced-motion mode, keyboard focus, 44px touch targets, motion-budget tests, relevant regression tests, and route metadata checks.
- Do not publish until the mobile recordings visibly demonstrate the intended result.
