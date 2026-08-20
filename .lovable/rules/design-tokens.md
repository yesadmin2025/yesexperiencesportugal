# Design Tokens

Token reference for **YES Experiences Portugal**. Use utility classes and CSS variables — never raw values.

## Colors

Apply with any color utility: `bg-<name>`, `text-<name>`, `border-<name>`, `ring-<name>`, `divide-<name>`, etc.

| Name | CSS variable |
|---|---|
| `teal` | `--teal` |
| `teal-2` | `--teal-2` |
| `gold` | `--gold` |
| `gold-soft` | `--gold-soft` |
| `gold-warm` | `--gold-warm` |
| `gold-deep` | `--gold-deep` |
| `gold-ink` | `--gold-ink` |
| `ivory` | `--ivory` |
| `sand` | `--sand` |
| `charcoal` | `--charcoal` |
| `charcoal-soft` | `--charcoal-soft` |
| `charcoal-deep` | `--charcoal-deep` |
| `card` | `--card` |
| `popover` | `--popover` |
| `destructive` | `--destructive` |
| `destructive-foreground` | `--destructive-foreground` |
| `border` | `--border` |
| `input` | `--input` |
| `cta-primary-halo-blur` | `--cta-primary-halo-blur` |
| `cta-primary-halo-opacity` | `--cta-primary-halo-opacity` |
| `cta-primary-bloom-blur` | `--cta-primary-bloom-blur` |
| `cta-primary-bloom-opacity` | `--cta-primary-bloom-opacity` |
| `cta-secondary-halo-blur` | `--cta-secondary-halo-blur` |
| `cta-secondary-halo-opacity` | `--cta-secondary-halo-opacity` |
| `cta-secondary-bloom-blur` | `--cta-secondary-bloom-blur` |
| `cta-secondary-bloom-opacity` | `--cta-secondary-bloom-opacity` |
| `primary` | `--primary` |

## Typography

Typography classes (`font-*` for families, `text-*` for sizes):

| Class | CSS variable |
|---|---|
| — | `dur.text` |
| `font-display` | `--font-display` |
| `font-serif` | `--font-serif` |
| `font-sans` | `--font-sans` |
| `font-script` | `--font-script` |
| `text-muted` | `--text-muted` |
| `text-subtle` | `--text-subtle` |
| `text-icon` | `--text-icon` |
| `text-on-dark-muted` | `--text-on-dark-muted` |

## Spacing

Apply with any spacing utility: `p-<name>`, `m-<name>`, `gap-<name>`, `space-<name>`, `w-<name>`, `h-<name>`, etc.

| Name | CSS variable |
|---|---|
| `1` | `--space-1` |
| `2` | `--space-2` |
| `3` | `--space-3` |
| `4` | `--space-4` |
| `5` | `--space-5` |
| `6` | `--space-6` |
| `7` | `--space-7` |
| `8` | `--space-8` |
| `9` | `--space-9` |
| — | `--section-gap-mobile` |
| — | `--section-gap-desktop` |
| — | `--hero-rhythm-signature-line-gap` |

## Border Radius

Border-radius classes:

| Class | CSS variable |
|---|---|
| `rounded-sm` | `--radius-sm` |
| `rounded-md` | `--radius-md` |
| `rounded-xl` | `--radius-xl` |
| `rounded-2xl` | `--radius-2xl` |
| `rounded-3xl` | `--radius-3xl` |
| `rounded` | `--radius` |
| `rounded-soft` | `--radius-soft` |
| `rounded-card` | `--radius-card` |
| `rounded-pill` | `--radius-pill` |

## Shadows

Box-shadow classes:

| Class | CSS variable |
|---|---|
| `shadow-elegant` | `--shadow-elegant` |
| `shadow-card` | `--shadow-card` |
| `shadow-card-hover` | `--shadow-card-hover` |
| `shadow-cta` | `--shadow-cta` |
| `shadow-cta-hover` | `--shadow-cta-hover` |
| `shadow-cta-light` | `--shadow-cta-light` |
| — | `--scrim-shadow-rgb` |
| `shadow-soft` | `--shadow-soft` |
| `shadow-hover` | `--shadow-hover` |

## Other

Reference via `var(--name)` in inline styles or CSS.

| CSS variable |
|---|
| `dur.tap` |
| `dur.quick` |
| `dur.base` |
| `dur.slow` |
| `dur.image` |
| `dur.scene` |
| `dur.cinematic` |
| `ease.premium` |
| `ease.snap` |
| `ease.scene` |
| `stagger.sm` |
| `stagger.md` |
| `--breakpoint-xs` |
| `--ease-premium` |
| `--dur-tap` |
| `--dur-quick` |
| `--dur-base` |
| `--dur-slow` |
| `--ease-snap` |
| `--dur-image` |
| `--dur-scene` |
| `--dur-cinematic` |
| `--stagger-sm` |
| `--stagger-md` |
| `--ease-scene` |
| `--hero-scrim-base` |
| `--hero-scrim-focus` |
| `--hero-scrim-mobile-radial` |
| `--hero-scrim-mobile-vertical` |
| `--transition-fast` |
| `--transition-base` |
| `--transition-slow` |
| `--motion-lift` |
| `--motion-image-zoom` |
| `--motion-ease-editorial` |
| `--motion-dur-mask` |
| `--motion-dur-split` |
| `--motion-dur-rule` |
| `--motion-stagger` |
| `--section-y` |
| `--section-y-lg` |
| `--section-y-sm` |
| `--section-y-app` |
| `--cta-pulse-delay` |
| `--cta-pulse-duration` |
| `--cta-pulse-easing` |
| `--cta-pulse-iterations` |
| `--cta-pulse-stagger` |
| `--cta-breathe-duration` |
| `--cta-breathe-easing` |
| `--cta-breathe-peak` |
| `--cta-breathe-stagger` |
| `--logo-filter-teal-on-ivory` |
| `--logo-filter-gold-on-charcoal` |
| `--logo-scale-teal-on-ivory` |
| `--logo-scale-gold-on-charcoal` |
| `--hero-rhythm-cta-to-microcopy` |
| `--hero-rhythm-microcopy-to-signature` |
| `--outline` |
| `--phrase-fade-in` |
| `--phrase-fade-out` |
| `--phrase-from-x` |
| `--phrase-from-y` |
| `--phrase-to-x` |
| `--phrase-to-y` |
| `--phrase-md-scale` |
| `--phrase-rest-x` |
| `--phrase-rest-y` |
| `--phrase-ease` |
| `--phrase-offset-x` |
| `--phrase-offset-y` |
| `--persistent` |
| `--dark` |
| `--ghost` |
| `--cta-active-shift` |

