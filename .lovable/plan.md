## Scope

Single homepage section: `src/components/home/FourWaysIn.tsx` ("Five ways to shape your Portugal."). Hero, nav, routes, layout, imagery, spacing, motion and CTA destinations are untouched. Only strings and one small descriptor line per card are added.

Remove review count by the platforms icons under the hero. Just keep the icons. 

&nbsp;

## Files touched

1. `src/components/home/FourWaysIn.tsx` — EN copy + new descriptor line per card + section orientation paragraph.
2. `src/routes/pt.index.tsx` — replace the current 3-card "Positioning" block with the same five-path structure and PT copy so hierarchy parity matches the brief. (No new components; reuses local card markup already in that file. Alternative: leave PT untouched and only ship EN — see "Open question".)

## EN copy table

### Section intro (add below H2, above cards)


| Current                | Proposed                                                                                                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| *(no intro paragraph)* | Every path is private. Choose a day already designed by YES, shape your own in real time in the Studio, or let us create a celebration, group experience or full Portugal journey around you. |


Styling: existing editorial body token, `max-w-2xl` centered, `text-[15px] md:text-[16px]` charcoal-soft, `mt-5 md:mt-6`, sits between the H2 gold rule and the card grid. Two lines on desktop, wraps cleanly on mobile.

### Card copy

New uppercase descriptor rendered above each card's `label` eyebrow using the existing eyebrow token (`text-[10.5px] uppercase tracking-[0.28em]`) but in `text-[color:var(--charcoal-soft)]` (not teal) so it stays secondary to the branded label. No new icon, badge or box.


| #   | Card                  | Current label         | Current body                                                                                                                   | New descriptor                | New title                                              | New body                                                                                                                   | CTA                                      |
| --- | --------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 01  | Signature Experiences | Signature Experiences | "Choose one of our private experiences and enjoy it as designed, or tailor a few details."                                     | DESIGNED BY YES               | *unchanged* ("Private days, already designed by YES.") | Private days thoughtfully designed and ready to reserve. Enjoy the experience as created, or tailor a few details with us. | unchanged                                |
| 02  | Studio                | Studio                | "Choose the mood, rhythm and route in real time. See the live price and reserve instantly, with local support if you need it." | DESIGNED BY YOU, IN REAL TIME | Your day, designed by you.                             | Choose what speaks to you and watch the route, timings and price take shape in real time. Then reserve in minutes.         | unchanged (Open the Studio → /studio-v3) |
| 03  | Moments               | Moments               | *current poetic body*                                                                                                          | DESIGNED AROUND THE MOMENT    | *unchanged*                                            | Proposals, birthdays and private celebrations created around the people and meaning behind the day.                        | unchanged                                |
| 04  | Corporate & Groups    | Corporate & Groups    | *current body*                                                                                                                 | DESIGNED AROUND THE GROUP     | *unchanged*                                            | Team days, incentives and private group experiences shaped around your people, purpose and pace.                           | unchanged                                |
| 05  | Travel Designer       | Travel Designer       | *current body*                                                                                                                 | DESIGNED WITH A LOCAL         | *unchanged*                                            | Multi-day journeys across Portugal, created with a local designer around the way you want to travel.                       | unchanged                                |


Titles kept as-is because they already carry the branded H3 voice; only bodies + new descriptor change. This preserves the italic teal emphasis pattern and card height rhythm.

## PT copy table (`/pt`)

Section heading (kept if present, otherwise): "Cinco caminhos para desenhar o seu Portugal."

Orientation paragraph: "Todos os caminhos são privados. Escolha um dia já desenhado pela YES, crie o seu em tempo real no Studio, ou deixe-nos conceber uma celebração, experiência de grupo ou viagem completa por Portugal à sua medida."


| #   | Card                  | Descriptor                          | Body                                                                                                                                  |
| --- | --------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | Signature Experiences | DESENHADO PELA YES                  | Dias privados pensados ao detalhe e prontos a reservar. Viva a experiência tal como foi criada ou ajuste alguns detalhes connosco.    |
| 02  | Studio                | DESENHADO POR SI, EM TEMPO REAL     | Escolha o que mais combina consigo e veja o percurso, os horários e o preço ganharem forma em tempo real. Depois, reserve em minutos. |
| 03  | Moments               | DESENHADO PARA O MOMENTO            | Pedidos de casamento, aniversários e celebrações privadas criados em torno das pessoas e do significado do dia.                       |
| 04  | Corporate & Groups    | DESENHADO PARA O GRUPO              | Dias de equipa, incentivos e experiências privadas de grupo pensados em função das pessoas, do objetivo e do ritmo do grupo.          |
| 05  | Travel Designer       | DESENHADO COM UM ESPECIALISTA LOCAL | Viagens de vários dias por Portugal, criadas com um especialista local à medida da forma como gosta de viajar.                        |


## Technical detail

- New descriptor field added to the `Path` type in `FourWaysIn.tsx` (`descriptor: string`) rendered as a `<span>` directly above the existing branded `label` eyebrow, `mt-4 mb-1`, charcoal-soft, same tracking. Zero layout shift risk: same line-box style, one extra 14px line on each card (all 5 cards get the same line so heights stay balanced).
- No changes to icons, numerals, hover animations, gold rule, sheen or reveal cadence.
- Analytics attributes, hrefs and CTA labels untouched.
- Orientation paragraph is a plain `<p>` inside the existing `.reveal max-w-2xl mx-auto text-center` header block, placed after the gold rule.

## Open question

The current `/pt` homepage exposes only 3 positioning cards (Signature / Studio / Roteiros à Medida), not 5. To honour the brief's "same hierarchy" instruction, the plan expands it to 5 cards matching EN. If you prefer to keep PT as-is for now and ship only the EN refinements + PT strings staged in `src/content/i18n/pt/common.json` for a later pass, say so and I'll drop step 2.

## Validation

- Hero DOM diffed against current: no changes.
- All 5 links resolve to existing routes (already in code).
- Visual check at 393px (mobile) and 1280px (desktop): descriptor sits above label, titles unchanged, body wraps 3–4 lines, card heights balanced.
- No new components, no route changes, no motion changes, no token changes.