# Editorial motion across the public site

## Goal
Make the public website feel consistently alive and conversion-focused through calm fades, transitions, CTA feedback, and directional arrow movement—never bounce or distracting perpetual motion.

## Changes
- Apply the existing editorial reveal controller centrally across public storytelling and discovery pages, while excluding checkout, booking tools, Studio, admin, auth, and internal routes where motion could interrupt tasks.
- Extend automatic one-time reveals to section titles, supporting copy, cards, images, and conversion groups with short staggered timing and low movement distance.
- Standardize CTA interaction: subtle lift/press, restrained surface transition, one-time arrow cue, and directional arrow movement on hover, keyboard focus, and tap.
- Keep Five Ways arrows long, aligned, and moving in the same direction; retain visible labels and whole-card click targets.
- Preserve cinematic Hero choreography and all existing copy, routes, prices, booking/payment logic, SEO, analytics, and data.
- Respect reduced-motion by showing everything immediately and removing decorative movement.

## Validation
- Check homepage, Experiences, one Signature detail, Travel Designer, Local Stories, and About at 393×852 and 1280×900.
- Verify fades trigger once, CTAs/arrows respond without bounce, no hidden content, no overflow, no page errors, and reduced-motion is static.
- Run focused motion/brand tests, type checks, motion-budget checks, and the production build.
- Do not publish.

## Technical details
- Reuse the current `data-motion` controller and semantic duration/easing tokens rather than introducing another animation library.
- Centralize public-route activation to avoid inconsistent per-page behavior and duplicate observers.
- Use opacity and small transform transitions only; no spring physics, bouncing, looping CTA animation, or layout-shifting effects.
