# Internal design-debt cleanup

## Goal

Finish the typography migration and remove stale homepage-questionnaire assumptions without changing the live customer journey, pricing, booking, or enquiry delivery.

## Changes

### 1. Complete the two-font system

- Replace retired Montserrat, Georgia, Times, Cormorant, Newsreader, and Kaushan references in active website and internal screens with the canonical Fraunces and Inter tokens.
- Keep web-safe Arial/Georgia stacks inside email templates, where they are intentional for email-client compatibility.
- Remove the unused script-font token and update stale typography comments and writing prompts.

### 2. Update typography safeguards

- Make the typography audit expect Fraunces for headings and Inter for body, controls, and labels.
- Update hero and editorial typography checks that still assert the retired font pairing.
- Preserve the existing visual hierarchy, copy, colors, motion, and approved hero behavior.

### 3. Finish the homepage-questionnaire cleanup

- Keep the proposal questionnaire only on the dedicated Proposals page.
- Rename stale component comments, analytics placement labels, and backend source labels that still call it a homepage form.
- Preserve enquiry storage, team and guest emails, follow-up eligibility safeguards, and the admin inbox.
- Do not remove the separate homepage email capture or the Studio discovery flow.

### 4. Verify before release

- Run focused typography, homepage-structure, proposal-form, and type checks.
- Inspect the homepage and Proposals page at 393px, then spot-check desktop.
- Confirm no retired font renders on the website, no proposal questionnaire appears on the homepage, and the dedicated form remains usable.

## Success criteria

- Fraunces and Inter are the only website font families in active UI code.
- The homepage remains clean and contains no proposal questionnaire.
- Proposal enquiries continue through the dedicated page with accurate analytics attribution.
- Existing booking, payment, pricing, email, and commercial logic remain unchanged.