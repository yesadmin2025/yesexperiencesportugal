# Validate the cinematic hero, typography, and the mobile journey

## Goal

Confirm the restored opening ("Portugal is the stage. You write the story."), the premium type and motion, and then walk the homepage top-to-bottom and the booking flow on a phone-sized screen — reporting exactly what works and what does not. No new features.

## What is confirmed today

- The hero source and its frozen copy contract both hold the restored two-line story, the instant-confirmation eyebrow, the supporting service line, and both actions.
- Existing automated checks already cover hero copy, hero motion and film playback, hero type and CTA styling, homepage structure and spacing, and instant booking checkout.

## Plan

### 1. Automated validation pass

- Run the hero suites: copy locks, byte-exact copy, cinematic attributes, film playback, phrase/film sync, reveal, colour tokens, CTA parity (phone and tablet), CTA typography, visual snapshots.
- Run the typography and spacing regression suites plus the homepage structure suite.
- Run the instant booking checkout suites, positive and negative.
- Report each result. Where a snapshot fails only because the approved design changed, say so explicitly and propose refreshing it rather than silently accepting.

### 2. Manual hero review on a phone screen

- Load the homepage at phone width and watch the opening once end to end: film settles, first line, second line, service line, then the two actions.
- Check line breaks, no clipped or overflowing text, both actions reachable and clearly ranked, cookie notice not covering them, and the top bar unchanged.
- Repeat with reduced motion so everything is visible immediately.

### 3. Homepage walk on a phone screen

- Scroll the full page and check each section appears, reads in a sensible order, keeps consistent title and body type, and has no empty blocks, duplicate calls to action, or invisible sections.
- Confirm reviews are visible, images load, and there are no console errors.

### 4. Booking flow walk on a phone screen

- From the homepage, follow the Signature path to a bookable experience, choose a future date and guests, enter guest details, and confirm the payment step opens with the correct price for the guest count.
- Also confirm the Studio path reaches a payment step.
- Stop at the payment box — no real charge.

### 5. Report

- One short summary of what is confirmed working, plus a clear list of any defects with where they appear.
- Fixes for anything found are proposed separately, not bundled into this validation.

## Guardrails

- Read-and-verify only: no changes to pricing, availability, booking logic, payments, tour facts, or the existing top bar.
- No publishing as part of this pass.

## Technical scope

- Playwright suites listed above at 393px first, then tablet and desktop for the hero.
- Typecheck plus focused Vitest for hero copy, typography, and motion contracts.
- Live walkthrough driven headlessly against the running preview.
