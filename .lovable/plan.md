## Goal

Make the review certificate look like the official Trustindex asset (as in the picture) — more credible — and place it **side by side** with the Livro de Reclamações seal so the footer stays compact.

## What changes

### 1. Rebuild `src/components/trust/TrustindexBadge.tsx`
Recreate the official certificate layout, in code (no third-party script, no CLS):

```text
Excellent rating        ┌───────────────────────┐
★★★★★  4.9              │ ✓  Trusted Site       │  (white top)
1000 customer reviews   │ Verified by Trustindex│  (black bottom)
                        └───────────────────────┘
```

- Left block: "Excellent rating" (bold), green star row + 4.9, "1000 customer reviews".
- Right block: rounded card — white top row with green check disc + "Trusted Site", black bottom row with "Verified by Trustindex".
- Rendered on a small ivory/white plate so the official green/black/white reads correctly against the charcoal footer, keeping brand tokens untouched (the certificate is a third-party mark, treated like the Livro de Reclamações seal).
- Compact scale for mobile (about 40% smaller than the reference), still a ≥44px tap target, links to the certificate URL with the same aria-label.

### 2. Footer layout — one shared trust row
In `src/components/Footer.tsx` (lines 297–305), replace the two stacked centered blocks with a single row:

- Mobile (393px): both seals on one line, centered, `flex items-center justify-center gap-4`, each allowed to shrink; wraps only if truly needed.
- Tablet/desktop: same row, slightly larger gap.

No other footer content moves.

### 3. Unchanged
Organization JSON-LD `aggregateRating` (4.9 / 1000) already added — stays as is. Brand palette untouched.

## Technical notes
Static markup only; certificate numbers stay as constants at the top of the badge file for easy updates.
