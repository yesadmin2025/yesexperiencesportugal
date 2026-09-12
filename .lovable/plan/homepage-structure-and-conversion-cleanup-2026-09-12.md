# Homepage structure and conversion cleanup

## Goal

Turn the homepage back into a calm, guided journey. The homepage should introduce the five ways to travel with YES, build desire and trust, then help the visitor take one clear next step. It should not contain a long questionnaire inside the editorial story.

## What is creating the mess

- The mobile homepage is currently about **18,600px long** and contains 13 major blocks.
- The “Five ways into Portugal” block introduces every service, then several of those services are explained again in full below.
- The Proposals area alone is about **2,650px tall** because two editorial cards are followed by a seven-field form.
- That form also mixes proposals, celebrations, corporate days and private groups, then the page immediately opens a separate Corporate section. This breaks the narrative and makes ownership of the form unclear.
- The last third moves through form → Corporate → map → Journal → FAQ → another large call-to-action. These are individually useful, but together they feel like unrelated additions rather than a deliberate ending.
- The final call-to-action contains a duplicated decorative divider and repeats “Open the Studio,” even though the Studio has already had its own major section.

## Recommended homepage journey

```text
1. Cinematic hero
2. Trust strip
3. Five clear ways into YES
4. Experience Studio — the distinctive product
5. Signature Experiences — the quickest bookable path
6. Travel Designer — the multi-day path
7. Private moments — Proposals & Celebrations
8. Corporate & Private Groups
9. Guest reviews — reassurance after the service choices
10. Explore Portugal — map and selected Local Stories as one discovery chapter
11. FAQ
12. Final decision — three concise next steps
```

This creates four understandable chapters: **orientation → ways to travel → proof and inspiration → decision**.

## Changes

### 1. Remove the questionnaire from the homepage

- Remove the embedded proposal questionnaire entirely.
- Keep the real form and email workflow on the dedicated Proposals page, where the surrounding content provides the right context.
- The homepage Proposals section becomes one concise editorial feature with one action: **Plan a proposal**.
- Corporate requests continue through the dedicated Corporate page, not through a mixed-purpose homepage form.
- Preserve all current enquiry storage, confirmation emails, follow-up emails and analytics on the dedicated form.

### 2. Make the two specialist services distinct and concise

- Keep Proposals & Celebrations and Corporate & Private Groups as separate, clearly named paths.
- Give each one image, one promise, one practical reassurance and one CTA.
- Remove the second celebrations card from the homepage; celebrations can remain explained on the dedicated page.
- Keep each mobile section to roughly one screen rather than a multi-screen stack.

### 3. Turn the lower homepage into a deliberate ending

- Move guest reviews after the service chapters so they answer the visitor’s final trust question.
- Group the Portugal map and three Local Stories under one “Explore Portugal” chapter with tighter spacing and one clear onward link.
- Keep FAQ immediately before the final decision area.
- Remove the duplicated gold divider and excess empty vertical space.

### 4. Replace the final generic CTA with a choice that matches intent

Use three restrained actions rather than repeating only the Studio:

- **Reserve a Signature day** → Experiences
- **Design one private day** → Studio
- **Plan a Portugal journey** → Travel Designer

Add a quiet “Talk to a local” contact link beneath them for visitors who are still unsure. This closes the homepage by reflecting the actual customer choices introduced at the top.

### 5. Tighten repetition without changing approved facts

- Keep the locked hero copy unchanged.
- Make the top “Five ways” area a concise orientation menu; the later sections provide the emotional and practical detail.
- Remove repeated phrases and repeated service explanations between the five-way menu and the later sections.
- Preserve real prices, tour names, reviews, links, availability, booking logic and all product facts.

## Mobile presentation

- Design and verify first at 393px.
- Keep each specialist service to one strong image and a compact text block.
- No embedded long forms, nested cards or horizontal controls in the final third.
- Maintain 44px minimum tap targets, visible focus, readable contrast and the existing Fraunces/Inter system.
- Use negative space and gold rules between chapters, not oversized blank gaps.

## Technical scope

- Reorder and simplify the homepage sections in `src/routes/index.tsx`.
- Remove `ProposalRequestForm` only from the homepage; do not delete its enquiry or email infrastructure.
- Reuse the existing `EditorialCard`, `Eyebrow`, `CtaButton`, reviews, map, Journal and FAQ components.
- Update the approved homepage structure contract and its source/live-page tests to match the new order and count.
- Preserve hero timing and copy locks, booking/checkout paths, review submission, analytics, schema, metadata and crawl behavior.
- Verify the complete page at 320px, 393px, 414px, tablet and desktop, including section order, page length, CTA destinations, text fit and the dedicated proposal form journey.

## Success criteria

- No questionnaire appears on the homepage.
- Proposals and Corporate each have one obvious destination and no mixed form ownership.
- The final third reads as proof → inspiration → answers → decision.
- The homepage is materially shorter on mobile without hiding any core service.
- Every final action leads to a real, complete page and the existing commercial flows remain unchanged.
