# Studio V3 test hardening + hero CTA fix

Two independent pieces: deeper mobile test coverage for the Studio, and one copy change on the homepage hero.

## 1. Hero CTA — remove the echo

The hero already delivers the metaphor ("Portugal is the stage. You write the story."), so a "Create Your Story" button repeats it instead of advancing it. The CTA becomes:

- Primary CTA: **Design your day**
- Secondary CTA unchanged: "Explore Signature Experiences"

Sentence case matches the brand voice rules. "Design your day" names the actual promise — a private day designed in real time — and pairs cleanly with the Studio's own language once the visitor arrives.

Because the hero strings are byte-locked (SSR probe, hero verify route, copy-diff overlay, A/B variants, e2e copy locks), the change is made once in the single source of truth and every lock/assertion referencing the old label is updated in the same pass, including the hero content-hash consumers.

## 2. Guest details — error and retry coverage

New mobile spec covering the failure paths the current tests never touch:

- Submitting with missing/invalid required fields shows field-level messages, sets `aria-invalid`, moves focus to the first offending field, and does not advance the phase.
- A simulated network failure on the submit call (route interception) surfaces an error, leaves the form filled, and keeps the user on guest details.
- Retrying after the failure succeeds: no duplicate submissions, no lost answers, the Studio state and reveal data stay intact, and the flow continues to checkout.

## 3. Accessibility assertions on the mobile Studio specs

Targeted assertions plus an automated axe scan at each key phase (intro, reveal, guest details, checkout):

- Every button and input has a stable, non-empty accessible name; icon-only controls carry labels.
- Every input is programmatically associated with its label.
- Tab order follows visual order through the guest form; focus is visible on each stop.
- Primary tap targets meet 44x44.
- axe-core scan per phase, run against serious/critical violations.

Pre-existing violations the scan surfaces get fixed where they are genuine accessibility defects in Studio markup. If any turn out to be broad, pre-existing issues outside the Studio, they are reported rather than silently suppressed, and the scan is scoped to the Studio container so the suite stays meaningful and green.

## 4. Tour date rules + checkout never stalls

- Integration tests for the date boundaries: the minimum lead time is enforced (a date inside the window is rejected with a clear message), the first allowed date is accepted, and any upper bound is respected. Covered both at initial date selection and at the guest-details date field, so the two entry points cannot drift apart.
- The mobile checkout leg asserts a bounded, deterministic transition: after a valid submit, the checkout summary with price and reserve CTA appears within a fixed budget, with no infinite spinner and no silent no-op. No live payment is taken.

## Technical notes

- Copy source of truth: `src/content/hero-copy.ts` (`HERO_COPY.primaryCta`); update dependent locks in the hero copy tests/specs, the SSR verify route and any e2e asserting the old string.
- New specs live beside the existing ones in `e2e/`, reusing `walkToReveal` and the hardened `reachGuestDetails` helper rather than duplicating navigation logic.
- Accessibility scans use `@axe-core/playwright`, added as a dev dependency if not already present.
- Network-failure simulation uses Playwright request interception on the submit/checkout endpoint — no real Stripe, Supabase or email side effects.
- Focused verification: Prettier, TypeScript, the affected unit tests and the Studio mobile e2e specs. No deploy.
