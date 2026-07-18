Replace only the placeholder body copy in three Local Stories entries inside `src/content/local-stories-articles.ts`. No other files, no title/heading/CTA/style changes.

&nbsp;

Low credit 

## Edits (single file: `src/content/local-stories-articles.ts`)

1. **Setúbal Wine Country — A Local's Guide** (lines 118–121): replace the 4 `[Body copy to be supplied.]` bodies for sections "Why Setúbal is different", "Moscatel de Setúbal, explained simply", "The wineries we love", "What to pair it with" with the supplied copy exactly as written.
2. **The Best Wineries Near Lisbon** (lines ~442–457): replace the 4 placeholder bodies for "Arrábida: the coast that quietly makes great wine", "Setúbal Moscatel — sweet, salty, and very Portuguese", "Alentejo talha wines — buried clay, ancient method", "How we choose which wineries to visit" with the supplied copy exactly.
3. **Arrábida vs Sintra: Which Day Trip Is Right For You?** (lines 96–99): replace the 4 placeholder bodies for "What Arrábida feels like", "What Sintra feels like", "Crowds, driving time, pace", "Our honest take" with the supplied copy exactly.

Placeholders on other articles (Portinho da Arrábida, private-vs-group) are left untouched per instructions.

## Verification

- `rg "Body copy to be supplied" src/content/local-stories-articles.ts` — confirm remaining placeholders belong only to the two untouched articles.
- `git diff --stat` shows only `src/content/local-stories-articles.ts` modified.