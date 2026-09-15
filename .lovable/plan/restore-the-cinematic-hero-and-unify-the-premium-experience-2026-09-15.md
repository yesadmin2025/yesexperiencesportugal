# Restore the cinematic hero and unify the premium experience

## Direction

Restore the homepage opening to the brand statement:

> Portugal is the stage.  
> You write the story.

The film remains the first emotional signal; the supporting copy immediately explains the practical offer. The site should feel like one refined editorial journey, not a collection of unrelated effects.

## What is confirmed today

- The visible homepage H1 currently says “Private day trips from Lisbon, tailored Portugal tours.”
- The hero already uses the single optimized road film, a sequenced reveal, two working conversion links, and a reduced-motion fallback.
- Fraunces and Inter are already the canonical site-wide type families.
- A shared CTA component and a shared section-title component already exist, but the hero and several page sections still carry one-off styling.
- The stylesheet contains multiple generations of reveal, timing, hover, and hero animation rules. The result is functional, but its rhythm is not fully unified.

## Plan

### 1. Restore the hero story

- Restore the H1 exactly to “Portugal is the stage. You write the story.” across its source, frozen copy contract, and tests.

&nbsp;

- Preserve the current film, poster fallback, top bar, analytics fields, links, performance behavior, and mobile-first layout.
- Update the homepage title, description, and structured supporting content only where needed to retain strong service relevance without forcing search keywords into the poetic H1.

### 2. Refine the cinematic opening

- Choreograph a quiet sequence: film settles, first line appears, second line follows, proposition arrives, then the two actions.
- Use slow opacity, restrained vertical movement, and a soft focus-to-sharp transition—no bounce, snap, excessive parallax, or decorative clutter.
- Give the primary action clear priority while keeping the Signature option elegant and visibly secondary.
- Retain immediate final-state rendering for reduced-motion visitors and test snapshots.

### 3. Consolidate one premium motion language

- Make the existing shared motion tokens the single timing/easing source for public editorial pages.
- Remove or neutralize obsolete hero/reveal rules that compete with the current implementation.
- Standardize section entrances, image reveals, card movement, route transitions, accordions, and CTA feedback around a small hierarchy: cinematic opening, editorial reveal, functional feedback.
- Keep checkout, forms, Studio, booking, and admin motion functional and fast; no cinematic delay may block a task or payment action.
- Preserve no-JavaScript visibility, mobile performance, and the global reduced-motion contract.

### 4. Unify typography and editorial hierarchy

- Apply Fraunces consistently to titles and intentional italic emphasis; keep Inter for body copy, navigation, labels, forms, prices, and buttons.
- Replace remaining one-off public-page title styles with the shared title system where this does not alter heading order or page meaning.
- Normalize mobile title sizing, line length, paragraph rhythm, eyebrow treatment, and spacing so every page feels authored by the same brand.
- Keep the old solid ivory top bar unchanged.

### 5. Unify calls to action and conversion language

- Bring public-page actions onto the shared CTA system, including the hero visual treatment, without changing their destinations.
- Establish a clear vocabulary by intent: “Design your day” for Studio, “Explore Signature Experiences” for ready-made private days, “Reserve” for a chosen bookable experience, and “Plan” for human-led bespoke work.
- Remove nearby duplicate actions that compete for the same destination while preserving useful actions at distinct decision points.
- Keep all tap targets, focus states, loading states, pricing, availability, and checkout behavior intact.

### 6. Copy and storytelling consistency pass

- Review public-facing pages in journey order: homepage, Signature/listing pages, Studio entry, multi-day, proposals, corporate, About, Local Stories, booking, reviews, FAQ, and contact.
- Tighten repeated or generic wording while preserving verified facts, approved tour content, cancellation terms, prices, inclusions, and operational truth.
- Give each page a simple narrative arc: desire → concrete value → proof → clear next step.
- Do not invent destinations, experiences, partners, inclusions, prices, availability, or superlatives.

### 7. Verification

- Update hero copy locks, typography snapshots, animation contracts, CTA vocabulary tests, and metadata checks.
- Test the homepage and representative editorial, Studio, Signature, booking, and admin pages on mobile first, then tablet and desktop.
- Verify no overflow, clipped text, invisible reveals, duplicate H1s, broken links, console errors, or motion-induced layout shifts.
- Confirm both hero actions navigate correctly and the Studio/Signature booking paths still reach payment.
- Confirm reduced-motion users receive the complete experience without delayed or hidden content.

## Guardrails

- No changes to pricing, inventory, booking logic, Stripe, availability, tour facts, admin permissions, or database behavior.
- No change to the existing solid ivory top bar.
- No new decorative animation framework or dependency.
- No autoplay carousel, glass effects, animated blobs, bounce/spring motion, or generic luxury clichés.
- Publishing is separate and happens only when explicitly requested.

## Technical scope

- Hero truth and tests: `src/content/hero-copy.ts`, its frozen spec/tests, and `src/components/home/CinematicHero.tsx`.
- Shared presentation: `src/styles.css`, motion tokens/primitives, `CtaButton`, `SectionTitle`, and selected public-page consumers.
- Verification includes focused type/tests plus Playwright at 393px, tablet, and desktop viewports.
- Must be clear that studio is also instantly confirmed, signature as they are or tailored also instantly confirmed. On the experiences tab on the menu it must show all, not only first 3 and then the rest.  Typography on menu must be more readable 