# Verificar checkout em todos os pontos de entrada

Objetivo: confirmar que o cliente consegue chegar ao Stripe (ou ao handoff, no caso bespoke) a partir de cada superfície de reserva, sem alterar código a não ser que apareça um bug real.

## Pontos de entrada a testar

1. **Signature — reserva direta na página do tour**
   `src/components/SimpleBookingForm.tsx` → `create-signature-checkout`
   (usado em `/tours/:tourId`)
2. **Tailored — versão ajustada de uma Signature**
   `src/routes/tours.$tourId.tailor.tsx` → `create-signature-checkout` com selecções
3. **Studio V3 — cinematic builder**
   `src/components/studio-v3/StudioV3.tsx` → `create-signature-checkout` (usado a partir de `/studio`, `/portugal-travel-designer`, etc.)
4. **Bespoke Studio V2 — handoff humano**
   `src/routes/checkout.$token.tsx` → `POST /lovable/...` (não gera sessão Stripe; termina em confirmação "designer irá contactar")
5. **Retomar sessão paga**
   `src/routes/booking-confirmed.tsx` → `stripe-session-status` (verifica o retorno do Stripe)

## Como se verifica (sem gastar dinheiro real)

Passa-passo por cada entry point acima:

- **A. Diagnóstico técnico (agente, sem custo Stripe):**
  Para cada rota, invocar `create-signature-checkout` em modo dry com um payload representativo (1 adulto, tour existente, data futura) via `stack_modern--invoke-server-function` / `supabase--curl_edge_functions`. Confirmar:
  - resposta 200 e URL `https://checkout.stripe.com/...`
  - `stripe_env` correcto (live vs sandbox conforme flag)
  - `line_items` com `unit_amount` esperado (adulto vs criança)
  - allowlist do domínio a não rejeitar `yesexperiencesportugal.com` nem preview

- **B. Smoke test manual guiado (tu, no telemóvel):**
  1. `/tours/exclusive-douro-valley-experience` → SimpleBookingForm → "Reserve" → deve abrir Stripe Checkout.
  2. `/tours/…/tailor` → escolher 1 adição → "Reserve" → Stripe Checkout com preço tailored.
  3. `/studio` → completar até GuestDetailsStep → "Reserve" → Stripe Checkout.
  4. `/checkout/<token>` (a partir de um Studio V2 draft) → preencher form → deve mostrar écran "Your day is in our hands" (handoff), **sem** ir para Stripe.
  5. Cancelar cada Stripe Checkout com "back" → deve regressar à origem sem erro.

- **C. Verificação de reserva real:**
  Uma reserva teste de €1 em (1). Confirmar via `/admin` que:
  - `stripe_webhook_events` regista `checkout.session.completed` como `verified: true`
  - aparece linha em `bookings`
  - email interno enviado; email cliente ficará em fila até DNS de `notify` estar verde (já conhecido)

## Entregável

- Relatório curto por ponto de entrada com **PASS / FAIL / motivo**.
- Se algum FAIL, listar a causa exacta (payload rejeitado, allowlist, key errada) — **sem fixes especulativos**; qualquer correcção vem num plano separado depois de confirmares.

## Fora de âmbito

- Alterar copy, layout ou preços.
- Corrigir DNS de emails (assunto separado, já identificado).
- Rotacionar chaves Stripe (a fazer depois do teste real, como já combinado).
