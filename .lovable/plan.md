## Objetivo

Blindar três áreas com testes automáticos, sem alterar UI nem lógica de negócio:
1. Paridade de copy (legal, FAQ, CTAs) em todas as rotas relevantes.
2. Fluxo de checkout ponta-a-ponta com preços consistentes entre página e e-mail.
3. Guardrail de servidor que garante que as regras de preço (AGE_BAND_PCT) são a mesma fonte no frontend, edge functions e template de recibo.

---

## 1. E2E de paridade de copy e CTAs

Novo ficheiro: `e2e/copy-parity.spec.ts`.

Cobertura por rota (varre com Playwright em mobile 393×852 e desktop 1280×900):
- Rotas legais: `/terms`, `/privacy`, `/cookies` — asserção de:
  - email visível = `EMAIL` de `business-nap.ts` e `href="mailto:..."` = `EMAIL_HREF`.
  - label de licença = `LICENSE_LABEL_PT`.
  - trust line = `TRUST_LINE_PT`.
- `/contact` — linhas de email/telefone com `href` correto (`mailto:` / `tel:`).
- Footer (em `/`, `/experiences`, `/studio-v3`, `/portugal-travel-designer`) — sem link duplicado para `/contact` na barra legal; social links = `SOCIAL`.
- FAQ (`/about` + `HOMEPAGE_FAQ`) — nenhuma ocorrência do verbo "book" em CTAs/perguntas onde o canónico é "reserve"; título dos botões primários = "Reserve".
- CTA vocabulary lock (já existe `e2e/cta-vocabulary-lock.spec.ts`) — estender para incluir `/tours/$tourId` e `/tours/$tourId/tailor`: primário = "Reserve", secundário = "Tailor this day" (nunca "Customize"/"Book").

Fonte de verdade importada dos módulos existentes (`@/config/business-nap`, `@/content/faq-data`) para o teste falhar automaticamente se a copy divergir.

## 2. E2E de checkout ponta-a-ponta com paridade de preços

Novo ficheiro: `e2e/checkout-price-parity.spec.ts` (usa Stripe test mode já configurado).

Cenários (matriz mínima 4×):
- 2 adultos, 0 menores.
- 2 adultos + youth (13) + child (8).
- 1 adulto + infant.
- 4 adultos + 15/12/9/4/2.

Passos por cenário:
1. Abrir `/tours/arrabida-wine-signature` (tour com `priceFrom > 0`).
2. Preencher composição no `SimpleBookingForm`.
3. Capturar cada linha do `PriceBreakdownRows`: label, unit, qty, subtotal, total.
4. Avançar até à Stripe Checkout Session (interceptar `create-signature-checkout` response) e ler `line_items` / `amount_total`.
5. Assert:
   - Total página = `amount_total` Stripe.
   - Cada linha da página existe como line_item equivalente (band × qty × unit).
6. Simular webhook `checkout.session.completed` (POST direto ao endpoint com assinatura de teste) e ler o payload passado ao template `checkout-receipt`.
7. Renderizar o template via `/lovable/email/transactional/preview` com esse payload e extrair as rows.
8. Assert: rows do e-mail == rows da página (label, unit, subtotal). Reutiliza `summarizeJourneyLines` como oráculo — já é o mesmo mecanismo do teste unitário `checkout-email-parity.test.ts`.

## 3. Guardrail de consistência AGE_BAND_PCT (backend + frontend)

Problema: existem hoje três locais que definem multiplicadores por escalão:
- `src/data/signatureTourPricing.ts` (frontend + email template importa daqui).
- `supabase/functions/_shared/pricing.ts` (edge functions Deno).
- Cópia local reproduzida em `src/__tests__/checkout-email-parity.test.ts` (intencional, como oráculo).

Sem SSOT partilhado entre Node e Deno, adicionar teste de guarda:

Novo ficheiro: `src/__tests__/age-band-pct-ssot.test.ts`.
- Lê os dois ficheiros em disco como texto.
- Extrai `AGE_BAND_PCT` e a função `ageBand` de ambos com regex simples.
- Compara: mesmas chaves, mesmos valores numéricos, mesmos thresholds (`>= 11` youth, `>= 3` child, else infant).
- Falha o build se divergirem.

Adicionar workflow: `.github/workflows/pricing-ssot.yml` que corre este teste em cada PR.

Runtime check adicional (produção):
- Endpoint público read-only `src/routes/api/public/pricing-ssot.ts` que devolve o `AGE_BAND_PCT` que o frontend usa (import direto de `signatureTourPricing`).
- Edge function `create-signature-checkout` já usa `_shared/pricing.ts`; adicionar no fim do handler um log estruturado `pricing_ssot_snapshot` com os multiplicadores efetivamente usados nesse cálculo (só quando `LOVABLE_DEBUG_PRICING=1`), para permitir comparar em produção sem custo permanente.

## Detalhes técnicos

- Testes E2E correm com `playwright.local.config.ts` contra o dev server em `localhost:8080`; adicionar aos workflows GitHub existentes (`.github/workflows/`) um novo job `copy-parity` e `checkout-price-parity`.
- Checkout E2E usa `STRIPE_SANDBOX_*` (já em secrets) e cartão `4242 4242 4242 4242`.
- Nenhuma alteração a componentes, rotas de UI, edge functions de produção ou schema. Só novos ficheiros de teste, um endpoint de leitura pública sem PII, e um workflow.

## Ficheiros criados

```text
e2e/copy-parity.spec.ts
e2e/checkout-price-parity.spec.ts
src/__tests__/age-band-pct-ssot.test.ts
src/routes/api/public/pricing-ssot.ts
.github/workflows/pricing-ssot.yml
.github/workflows/copy-parity.yml
.github/workflows/checkout-price-parity.yml
```

## Ficheiros alterados

```text
e2e/cta-vocabulary-lock.spec.ts   # estender às páginas de tour + tailor
supabase/functions/create-signature-checkout/index.ts   # log opcional pricing_ssot_snapshot
```

## Fora de âmbito

- Unificar AGE_BAND_PCT num único ficheiro partilhado Node+Deno (bloqueado pelo runtime split; guardrail acima é a mitigação).
- Alterações a UI, copy, ou lógica de checkout.
