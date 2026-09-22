# Live visual, UX and conversion audit

## Scope and guardrails
- Audit only the currently published site at `https://yesexperiencesportugal.com`, treating commit `cce817743f94951d0bc121dac90e2c1bf150caa4` as the requested baseline.
- Make no source, content, database, configuration, commit, or publishing changes.
- Inspect only observable behavior and presentation; do not submit payment or create a real booking.

## Audit method
1. Open a fresh browser session at each requested viewport: 393×852, 430×932, 768×1024, 1280×800, and 1440×900.
2. Review the complete homepage scroll and every requested page:
   - `/experiences`
   - `/tours/arrabida-wine-allinclusive`
   - `/about`
   - `/portugal-travel-designer`
   - `/contact`
   - `/local-stories/best-wine-tours-from-lisbon`
3. Capture evidence at key states rather than relying on source inspection: first viewport, representative section transitions, cards, social proof, footer, sticky controls, menus, forms, and conversion handoffs.
4. Exercise the Signature booking journey through date selection, guest controls, and the payment screen, stopping before payment submission. Check normal layout and a 200% text-size simulation on the booking flow.
5. Observe motion after fresh loads and while scrolling, including Five Ways, Studio, Signature introduction, and the Travel Designer book reveal. Also confirm reduced-motion behavior remains usable.
6. Test obvious interaction and accessibility quality: keyboard focus, 44px-class tap targets, text wrapping, horizontal overflow, sticky CTA/WhatsApp/back-to-top collisions, form feedback, and mobile navigation.
7. Record browser console errors and failed network requests, separating site-attributable failures from browser extensions, blocked analytics, or third-party noise.
8. Compare visible copy and facts against the established project rules: Fraunces/Inter usage, YES casing, private positioning, 4.9/5 and 1,000-review proof, restrained gold, and no retired `700+` claim.

## Evaluation framework
Assess each requested dimension with route- and viewport-specific evidence:
- Hero clarity and premium feel
- Spacing rhythm and eyebrow/title consistency
- Visible, narrative motion
- Gold restraint and typography consistency
- Signature card hierarchy, alignment, highlights, and CTA clarity
- Human-contact availability and informational-to-booking handoff
- Mobile floating-control collisions
- Social proof hierarchy, footer clarity, and trust information
- Copy/factual consistency
- Accessibility, overflow, focus, tap targets, and 200% text behavior
- Runtime and console health

## Deliverable
Return one prioritized audit with four sections:
- **BLOCKER** — prevents booking, access, or a core journey
- **HIGH** — materially weakens trust, comprehension, or conversion
- **MEDIUM** — visible quality or consistency issue with bounded impact
- **LEAVE ALONE** — elements that are working well and should not be changed

Every actionable finding will include:
- Exact route
- Exact viewport and interaction state
- Observable evidence
- Why it matters
- The smallest targeted fix

The report will distinguish confirmed findings from items not reproducible. It will include a concise coverage summary and explicitly state that nothing was edited, committed, or published.
