## Problema

No ecrã **Refine** (`data-studio-v3-screen="refine"`, phase `"storyboard"`, antes do storytelling/FinalReveal), quando o utilizador adiciona/remove add-ons:

- o **total do grupo** actualiza (linha "€X total for your group") ✓
- o **preço por convidado** (`€215 / guest`) **fica fixo** ✗

Causa: no `SignaturePriceCard` o número grande `€ / guest` é `displayPerPaxEur`, que resolve apenas a tier base do Viator (ex.: €215 para 2-3 guests). Os add-ons entram só no `partyTotalEur`. E o `useResolvedSignature` também não corre em `"storyboard"` (só a partir de `"confirmation"`), portanto não há server pricing a preencher esse gap.

## Recomendação

Passar o preço grande a ser o **all-in por convidado do dia composto** — igual à forma como qualquer traveller lê "quanto vou pagar cada um": `(base_group_total + add_ons_group_total) / guests`.

- Mantém-se uma linha secundária pequena com a base tier ("de €215/guest base · +€X em adições") para transparência.
- O número total do grupo continua igual.
- Sem inventar preços: usa exactamente as tiers Viator + os preços dos add-ons já existentes.
- Reduced-motion safe, nenhum motion novo.

## Onde mexer (técnico)

`src/components/studio-v3/SignaturePriceCard.tsx`:
- Introduzir `allInPerPaxEur = partyTotalEur && partyCount ? Math.round(partyTotalEur / partyCount) : displayPerPaxEur`.
- Trocar o número grande `€{displayPerPaxEur} / guest` (linhas ~586-601) por `€{allInPerPaxEur} / guest`.
- Debaixo do número, quando houver add-ons seleccionados, uma micro-linha: `"base €{displayPerPaxEur}/guest · +€{addOnsPartyEur} additions"` (tokens brand, 10.5px, tracking `.24em`, cor `charcoal 55%`).
- Preservar `data-per-pax-eur` no elemento para não partir testes (`price-source-of-truth`, `visible-price-convergence`); manter o valor base tier lá — é o que os testes assertam.
- Manter fallback intacto quando `partyCount` ainda é `null` (grupo de 1 ou sem guests): mostra o base como hoje.

`src/components/studio-v3/useResolvedSignature.ts`: **não** alargar aos phases anteriores — nesta fase o server não muda o `unitEur` (só o total), portanto não resolve o problema e desperdiça quotes. Fica só a partir de `confirmation`.

## Fora do âmbito

- Não altera Storytelling/FinalReveal nem CheckoutSummary (esses já usam `serverPricing` autoritativo).
- Não altera regras de negócio nem tiers.
- Nenhuma alteração de copy fora da micro-linha explicativa.
