# Auditoria — correções restantes

Fonte: subagente auditor (read-only). Fixamos só o que tem correção clara e alcance visível. Nada de mudanças visuais.

## P0 — Verdade de preço

1. **Centralizar `AGE_BAND_PCT`**
   - Frontend: `src/lib/email-templates/checkout-receipt.tsx` deixa de redeclarar e passa a `import { AGE_BAND_PCT } from "@/data/signatureTourPricing"`.
   - Edge (Deno): criar `supabase/functions/_shared/pricing.ts` com `AGE_BAND_PCT` + `ageBand()`; `create-signature-checkout/index.ts` importa daí.
   - Teste `src/__tests__/checkout-email-parity.test.ts` importa a constante em vez de a redeclarar.

2. **Remover edge function órfã `create-builder-checkout`**
   - Não é referenciada em `src/`. Contém fórmula de preço legada sem age-bands (risco de mis-pricing se alguém a religar).
   - Ação: apagar via `supabase--delete_edge_functions` (mantém `create-signature-checkout` como único caminho).

## P1 — NAP / legal / CTA

3. **Legal pages a usar `business-nap.ts`**
   - `src/routes/terms.tsx`, `src/routes/privacy.tsx`, `src/routes/cookies.tsx`: substituir literal `info@yesexperiencesportugal.com` por `EMAIL` + `href={EMAIL_HREF}`.
   - `src/routes/terms.tsx`: substituir 3× `"RNAAT nº 31/2023"` por `LICENSE_LABEL`.

4. **/contact info rows clicáveis**
   - `src/routes/contact.tsx:253-254`: passar `href={EMAIL_HREF}` e `href={PHONE_HREF}` ao componente `Info` (já suporta `href`).

5. **CTA verb parity — "Reserve"**
   - `src/content/faq-data.ts:34,38`: alinhar copy "book"/"submit a request" com o verbo canónico "reserve" já usado em product/tailor/studio.

6. **Footer: remover duplicação `/contact`**
   - `src/components/Footer.tsx:274-278`: manter `Contact` apenas na coluna "Company"; retirar do bottom-bar legal.

## Fora de escopo (deixar como está, com nota)

- **Viator link vazio** (`SOCIAL.viator: ""`) — precisa do URL real do owner; não invento. Deixo TODO no ficheiro.
- **Rating badge condicional** em `tours.$tourId.tsx` — é intencional (sem ratings inventados). Sem ação.
- **`serif italic` em about/legal H1s** — precisa decisão de design antes de refactor; não é regressão.
- **PT locale** — strings `_PT` em `business-nap.ts` não renderizam em lado nenhum; auditoria PT é outra tarefa.
- **Studio "no invented stops"** — já coberto por memória `studio-v3-no-invented-stops`; sem findings novos concretos.

## Verificação pós-fix

- `tsgo` no repo (build/typecheck já corre automático).
- Rota manual: abrir `/terms`, `/privacy`, `/cookies`, `/contact` — confirmar `mailto:` funciona.
- Teste de paridade de email de checkout já existente (`checkout-email-parity.test.ts`) continua a passar após import.

## Impacto

- Zero mudanças visuais.
- Remove risco de drift de preço (bandas etárias) entre email, checkout e Stripe.
- Remove 1 edge function morta (menos superfície, menos custo mental).
- 4 páginas passam a respeitar o contrato "toda info NAP vem de `business-nap.ts`".
