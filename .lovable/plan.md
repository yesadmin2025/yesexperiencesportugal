# Trust strip — audit + placement plan

Investigation of what trust surface already exists, whether a new strip is warranted, and where a subtle add would move the needle. **No code changes yet.**

---

## 1. Is this needed or redundant?

**Partly needed, mostly redundant — with one real gap.**

What already exists:

| Surface | Component | Trust points carried |
|---|---|---|
| Homepage (after hero, before Signatures) | `GuestQuotes` | Aggregate rating + platform badges |
| Homepage (after content) | `RecognisedByGuides` | Editorial mentions |
| Homepage (mid) | `TrustmarySection` | Verified review widget |
| Studio (persistent HUD) | `StudioTrustStrip` | 700+ 5★ · Google/Tripadvisor/GYG |
| Studio final reveal | full trust band inside `ReviewScreen` | `TRUST_POINTS` grid |
| Checkout drawer | `BrandedCheckoutDrawer` trust footer | Secure checkout cues |
| Footer | `Footer.tsx` | RNAAT nº 31/2023 · Sesimbra · legal |
| `/about` | route content | RNAAT · civil liability insurance |
| `/press` | new page | RNAAT · fact pills |

**Reviews and platforms are well-covered.** The genuine gap is **operator credibility** (licence + insurance + local support + secure payments) fused into one quiet line the traveller sees at the point of doubt — currently split across `/about`, footer, and checkout, and never adjacent to a booking CTA on Signature tour pages.

Verdict: **do NOT add a homepage trust strip** (would duplicate `GuestQuotes` + `RecognisedByGuides` and risk the "loud/salesy" feeling). **Do add one narrow "operator credentials" microstrip on tour pages and pre-checkout** where the doubt actually surfaces.

---

## 2. Best placements (ranked by expected lift, worst avoided)

### Ship

1. **Individual Signature tour pages — directly under the price/book CTA.** This is where hesitation peaks and where operator legitimacy (licence, insurance, secure payments, human support) is missing today. Highest expected lift.
2. **Checkout drawer — top of drawer, one line above the summary.** `BrandedCheckoutDrawer` has a trust *footer* but no trust *header*. A one-line credential strip above the first form field reduces cart abandonment. Second-highest lift.
3. **Studio pre-reveal → convergence.** `StudioTrustStrip` covers review counts already; extend the pattern with a second, sibling `StudioCredentialStrip` shown only at the "Secure this experience" moment (not throughout the flow — the Bible bans persistent OTA chrome). Lower lift, but consistent with the philosophy.

### Skip

- **Homepage after reviews / before Signatures.** Already dense with `GuestQuotes` + `RecognisedByGuides` + `TrustmarySection`. Adding a licence strip here reads as anxious, not premium. Rejected.
- **Footer.** RNAAT + Sesimbra already present in the bottom bar; a badged strip would fight the discreet legal row. Rejected.
- **Studio persistent HUD.** `StudioTrustStrip` already occupies this real estate; a second strip breaks the cinematic rule ("interface disappears"). Rejected.

---

## 3. Recommended wording

Keep it to a single line, four tokens, separated by `·`. No verbs, no icons in the primary line, no colour highlights.

**Primary (tour pages, pre-checkout header):**

> Licensed operator RNAAT 31/2023 · Civil liability insured · Secure checkout · Local support 7 days a week

**Compact variant (Studio convergence, tight width):**

> RNAAT 31/2023 · Insured · Secure checkout · Local support

**Micro-tooltip on RNAAT hover/focus** (a11y + curious travellers):

> Registered Portuguese tour operator, nº 31/2023 (Registo Nacional dos Agentes de Viagens e Turismo).

Wording rules:
- No superlatives ("world-class", "trusted by thousands") — the brand rules ban those.
- Do not repeat the "700+ 5★" claim here — that already lives in `GuestQuotes` / `StudioTrustStrip`. This strip is *credentials*, not *popularity*. Separating the two prevents the "loud" feeling.
- "Local support 7 days a week" only if operationally true; otherwise use "Human support before, during and after".
- Never use "guaranteed", "risk-free", or "money-back" without legal review.

---

## 4. Design approach — how to keep it subtle

- **One line, ≤ 24px tall.** Never a card, never a badge row, never icons + logos combined. The Studio micro-strip is the reference pattern.
- **Typography:** Inter, 11.5–12px, tracking `0.14em`, uppercase, weight 500. Colour: `color-mix(in oklab, var(--charcoal) 62%, transparent)` on ivory surfaces; `var(--ivory)/80` on charcoal.
- **Separator:** thin `·` (0.5 opacity) between tokens. No pipes, no bullets, no chip pills on light backgrounds (fact-pills belong on `/press`, not next to a CTA).
- **Optional single gold micro-mark** (a 6×6 gold dot, not a shield/lock icon) before the line — matches the site's "gold = micro-detail only" rule and avoids the OTA "trust badge" aesthetic.
- **Motion:** fade in with the parent card, no independent animation.
- **Reduced motion / a11y:** wrap in `role="note"` with a full-sentence `aria-label`, 4.5:1 contrast on both `--ivory` and `--charcoal` backdrops.
- **Placement rules:** always *below* the CTA on tour pages (so it reassures without pulling attention), always *above* the first form field in checkout (so it lands before doubt).
- **Never** stack this strip with `GuestQuotes` on the same viewport height — pick one signal per moment.

Reject: shield icons, lock icons, badge grids, coloured chips, star clusters, gradient bars, "As seen on" style logos on this strip (that's `PlatformBadge`'s job elsewhere).

---

## 5. Implementation complexity

**Low — ~1.5h total.**

New primitive: `src/components/ui/CredentialStrip.tsx`

- Props: `variant: "light" | "dark"`, `compact?: boolean`, optional `className`.
- Tokens driven by `--charcoal` / `--ivory` / `--gold`. No new CSS variables.
- Content constant lives in one place so wording never drifts.

Wiring:

- **Tour pages:** add one `<CredentialStrip variant="light" />` in the shared Signature booking sidebar / mobile sticky CTA container. Single insertion point if the CTA is a shared component; otherwise 4–6 route edits.
- **Checkout drawer:** add `<CredentialStrip variant="light" compact />` at the top of `BrandedCheckoutDrawer` above the summary.
- **Studio convergence (optional, phase 2):** render `<CredentialStrip variant="dark" compact />` beside the existing `StudioTrustStrip` only when `phase === "convergence"`; keep both hidden in other phases. One conditional line in `StudioDrift.tsx`.

No schema change, no i18n bundle change beyond three short strings (already covered by `en`; `pt`/`es` need one entry each). No JSON-LD change — RNAAT and insurance already declared in `organizationLd()`.

**Risk:** low. Additive only. Rollback = delete component + import. No layout reflow risk if inserted inside existing spacing containers.

---

## Suggested build order (when approved)

1. Build `CredentialStrip` primitive with `light` + `dark` + `compact` variants, story-tested at 320px, 393px and 1024px.
2. Insert on Signature tour pages under the book CTA — measure vs. control for 2 weeks if analytics allows.
3. Insert in `BrandedCheckoutDrawer` header.
4. Only after (2) and (3) look right, add the Studio convergence instance.

Confirm before shipping: **is "Local support 7 days a week" operationally accurate?** If support is weekdays only, use "Human support before, during and after".
