## Decision

- **Target color**: `--charcoal` for stat captions / dates / timeline numbers / neutral meta, `--teal` for labels attached to an actionable control (a step title above a picker, a price cue, a "step 3 of 6" that leads to CTA). Both are AA on ivory and sand.
- **Scope**: public site only. Admin (`/admin.*`, `/brand-audit`, monitor pages) is staff-only — out of scope.
- **`.he-eyebrow-bar` primitive is already compliant** (label = `--charcoal`, only the 32×1.5px leading rule + inline SVG icon are gold). No CSS change to the eyebrow — it's the source of truth.

## What actually needs to change

Small (<24px) **text nodes** classed `text-[color:var(--gold)]` on ivory / sand backgrounds. Icons, borders, halos, gradients, ratings, and the eyebrow rule stay gold.

Concrete offenders (from grep across public routes):

| File | Lines | Element | Recolor to |
|---|---|---|---|
| `src/routes/about.tsx` | 253, 263, 272, 282 | stat caption `text-xs uppercase` under big number | `--charcoal` |
| `src/routes/tours.$tourId.tsx` | 463, 467 | itinerary step "STOP 1" pill + time chip (10px uppercase) | `--teal` (label of a numbered step) |
| `src/routes/tours.$tourId.tsx` | 636 | timeline row number (10px uppercase) | `--teal` |
| `src/routes/tours.$tourId.tsx` | 877 | review date meta (`· Aug 2024`) inside `<figcaption>` | `--charcoal-soft` |
| `src/routes/tours.$tourId.tailor.tsx` | 748, 885, 1166 | step section eyebrow labels (11px uppercase) that sit **outside** `<Eyebrow>` | `--teal` (they head an interactive picker) |
| `src/routes/tours.$tourId.tailor.tsx` | 1029 | inline price delta ("+ €25") next to option label | `--teal` |
| Any other public-route match to `text-\[color:var\(--gold\)\]` where the node is a text span with `text-[10-13px]` / `text-xs` / `text-sm` and NOT wrapping a Lucide icon | | | per the two rules above |

**What stays gold** (per user's rule: display accents ≥24px, hairline dividers, icon strokes):
- `<Eyebrow>` leading/trailing rule + icon slot (rule width 32×1.5px, SVG icon 12px stroke)
- All Lucide icons currently classed `text-[color:var(--gold)]` (`MapPin`, `Clock`, `Star`, `Lock`, `Info`, `AlertTriangle`, `Sparkles`)
- Star rating rows (icon fill, not text)
- Border, ring, `bg-*/[0.06]`, gradient, halo, `decoration-*` uses
- Numbered circle badges where the digit sits inside a `border-[--gold]` chip — border stays gold, the number inside recolors to `--teal` (still reads as brand)
- Homepage `.home-energy` gold sheen / shimmer

**Untouched files** (admin / brand-audit / monitor — out of scope):
- `src/routes/admin.*`
- `src/routes/brand-audit.tsx`, `hero-verify.tsx`, `brand-qa.tsx` if any

## Approach

1. **Identify** — grep `text-\[color:var\(--gold\)\]` across `src/routes/**` and `src/components/**`, exclude `admin.*` / `brand-audit`. For each hit, classify: text-node vs icon-node vs decoration-node. Only text-nodes are candidates.
2. **Rewrite in place** — search-replace the class per file. No new tokens, no new CSS. Charcoal → `text-[color:var(--charcoal)]` (or `--charcoal-soft` when the original was a subdued caption). Teal → `text-[color:var(--teal)]`.
3. **Preserve tracking / weight / size** — this is a color-only sweep. Zero copy, spacing, or hierarchy changes.
4. **Verify** — after edits, re-grep public routes for `text-\[color:var\(--gold\)\]` and manually confirm every remaining hit is an icon or a decoration wrapper. Take mobile (393×588) screenshots of `/experiences`, `/tours/arrabida-wine-allinclusive`, `/tours/arrabida-wine-allinclusive/tailor`, `/about` to confirm nothing reads as "greyed out" after the swap.
5. **Locked**: no hex changes to `--teal #295B61`, `--teal-2 #2A7C82`, `--gold #C9A96A`, `--gold-soft`, `--gold-warm`, `--gold-deep`, `--ivory #FAF8F3`, `--sand #F4EFE7`, `--charcoal #2E2E2E`, `--charcoal-soft`.

## Out of scope

- The `--gold` token itself. Palette stays byte-identical.
- Homepage `.home-energy` motion (sheen sweep on CTA hover uses gold — decoration, not text).
- Admin routes (staff-only, not user-facing).
- Any text ≥24px — the user explicitly allows gold at display sizes; none currently exist in `text-[color:var(--gold)]` at ≥24px on public routes anyway (verified in grep: all matches are 10–14px meta labels or icon nodes).
