## Goal

Bring every public route in line with the homepage's editorial feel: Typography v3, homepage section rhythm (eyebrow → H2 with italic emphasis → serif lead → body → gold-rule → CTA), canonical CTAs/links, and standard site motion. Homepage-only tricks (`.home-energy` parallax, gold sheen sweep, H2 medium-500 exception) stay confined to `/`.

## Scope

**In scope — normalise to homepage system:**
- `about`, `contact`, `experiences`, `multi-day`, `day-tours`, `proposals`, `corporate`, `reviews`, `press`
- Signature landing pages: `arrabida-wine-tour`, `arrabida-day-trip-from-lisbon`, `alentejo-wine-tour-from-lisbon`, `evora-alentejo-wine-tour`, `evora-private-tour-from-lisbon`, `sintra-day-tour-from-lisbon`, `wine-tours-lisbon`, `private-wine-tour-lisbon`
- Editorial/SEO hubs: `day-trips-from-lisbon`, `itineraries/10-day-private-portugal-tour`, `portugal-tours`, `luxury-tours-portugal`, `private-tours-portugal`, `portugal-wine-tours`, `local-stories`
- Tour detail templates: `tours.$tourId`, `tours.$tourId.tailor`
- Shared chrome: `SiteLayout`, `Navbar`, `Footer` (verify tokens only — no restructure)

**Preserved as-is:**
- `/` (homepage) — reference source, untouched
- Studio v3, Builder, Checkout, Auth, Admin, QA — product chrome stays
- Legal (`terms`, `privacy`), `unsubscribe`, token routes

## What "consistent" means (the rules being enforced)

**Typography v3**
- H1 / H2: `font-display` Montserrat, weight 700 (H2 stays 700 outside `/`)
- H3+: Montserrat, weight 600
- Italic emphasis: `<SectionTitle.Em>` (Georgia italic, teal) inside headlines only — no free-standing italic paragraphs, no `.bridge-whisper`, no `.he-pull`, no `.kw`
- Body: Inter, 16–17px, line-height 1.85
- Serif italic lead paragraph directly under H1 only (matches homepage hero pattern)
- Eyebrow: 11px uppercase, tracking 0.32em, `--gold-warm` — always via `<Eyebrow>`

**Section rhythm**
- Every content section: `<Eyebrow>` → `<SectionTitle as="h2">` (with italic Em where copy earns it) → optional serif italic lead → Inter body → optional gold-rule divider → single `<CtaButton>` or teal-uppercase inline link
- Section padding: `py-20 md:py-28` on ivory; `py-16 md:py-20` on sand
- Max text column: `max-w-2xl` centred (editorial), `max-w-3xl` for hero headers
- Gold rule divider: `border-t border-[color:var(--gold-soft)]/40` before CTA bands

**CTAs & links**
- Primary/ghost buttons: `<CtaButton variant="primary|ghost">` — no bespoke `<button>` or raw Tailwind pill styles
- Inline forward links: `font-sans text-[12px] uppercase tracking-[0.2em] text-[color:var(--teal)] hover:text-[color:var(--teal-2)]` + gold arrow `→`
- Back links: same pattern, `←` prefix, `--charcoal-soft`
- One primary action per section; secondary as ghost

**Motion (standard site, NOT homepage)**
- Entry: fade + translateY 12–16px, ≤220ms, respects `prefers-reduced-motion`
- Hover: image zoom 1.02–1.04, card/CTA lift -2px
- Accordion: existing radix animations
- Forbidden outside `/`: parallax, gold sheen sweep, sequenced staggered reveals >250ms, bounce/spring, glass, blob, shimmer
- Use a shared `useRevealOnScroll` hook (IntersectionObserver, one-shot) applied to top-level section wrappers

## Implementation approach

1. **Audit + inventory** — grep each route for: bespoke buttons, `font-light` on light bg, raw `text-white/black`, `.bridge-whisper`, `.he-pull`, `.kw`, non-primitive H2s, ad-hoc italic paragraphs, hardcoded font sizes outside the v3 scale.
2. **Add shared reveal hook** — `src/hooks/useRevealOnScroll.ts` + `.reveal-on-scroll` utility in `styles.css` (fade + translateY, one-shot, reduced-motion safe). Homepage keeps its own `.home-energy` utilities untouched.
3. **Route-by-route rewrites** — for each in-scope file, normalise: swap raw H1/H2 for `<SectionTitle>`, swap eyebrows for `<Eyebrow>`, swap buttons for `<CtaButton>`, swap inline "Learn more" for the teal-arrow pattern, remove banned italic paragraphs/spans, apply standard section paddings, wire reveal-on-scroll on section wrappers. Copy stays — only the shell changes.
4. **Tour detail template** (`tours.$tourId.tsx`) — highest leverage since it powers every Signature URL; align hero, itinerary section, inclusions, CTA band once.
5. **Verify** — typecheck (`bunx tsgo --noEmit`), spot-check 4 routes on mobile viewport via Playwright screenshots (About, Experiences, one Signature landing, one Tour detail), grep for remaining banned classes.

## Out of scope for this pass

- Copy rewrites (structure only; the words stay)
- Adding new sections, hero images, or product logic
- Homepage — reference only
- Admin/Studio/Builder/Checkout chrome
- Brand tokens in `styles.css` — only additive utilities (`reveal-on-scroll`), no palette changes

## Risk & mitigation

- **Regression risk** on Signature landings (they're indexed) — SEO head blocks and JSON-LD stay byte-identical, only visual shell changes.
- **Test coverage** — existing itinerary/signature/reveal-order tests already gate Studio v3; nothing in that path changes.
- **Scale** — ~25 files. I'll batch parallel edits per group (editorial hubs, signature landings, commercial pages, tour templates) and run typecheck between groups.

## Deliverable

A single sweep with one changelog: files touched, primitives added, banned patterns removed. No copy changes, no new features, no homepage touched.
