## Diagnóstico atualizado (logs da Edge Function)

O self-test passa porque assina e verifica com a mesma secret guardada. Mas os logs mostram dois problemas reais separados:

**1. Eventos reais da Stripe continuam a falhar com "No signatures found matching"**
```
sig: t=1784605209,v1=94fb03468bae07af... | bodyLen: 496
STRIPE_WEBHOOK_SECRET_LIVE: present len=38 prefix=whsec_If
```
A `whsec_If…` que temos guardada **não é** a signing secret que a Stripe está a usar para o endpoint `yesexperiencesportugal.com/functions/v1/stripe-webhook`. Tem de vir literalmente do dashboard da Stripe → Developers → Webhooks → esse endpoint específico → "Signing secret" → **Reveal**.

**2. A `rk_live_…` foi guardada no secret errado**
```
STRIPE_WEBHOOK_SECRET_SANDBOX: present len=107 prefix=rk_live_
```
A restricted key acabou dentro de `STRIPE_WEBHOOK_SECRET_SANDBOX`. Isto corrompe o ambiente sandbox e sugere que também a `STRIPE_LIVE_API_KEY` pode não ter recebido a chave correta.

## Plano de correção

**Passo A — Limpar o secret errado**
- Apagar / substituir `STRIPE_WEBHOOK_SECRET_SANDBOX` (nunca deve conter `rk_live_`). Se não usas sandbox agora, remover é o mais seguro.

**Passo B — Confirmar `STRIPE_LIVE_API_KEY`**
- Verificar prefixo atual em `/admin/payments-env`. Se não estiver `rk_live_…` ou `sk_live_…`, abrir formulário novamente para colares a restricted key correta.

**Passo C — Corrigir `STRIPE_WEBHOOK_SECRET_LIVE` (root cause dos pagamentos não gravarem)**
- Ir a: Stripe Dashboard (modo Live) → Developers → Webhooks → endpoint `yesexperiencesportugal.com/functions/v1/stripe-webhook` → "Signing secret" → Reveal → copiar valor `whsec_…`.
- Colar num formulário seguro que eu abro com `update_secret` → `STRIPE_WEBHOOK_SECRET_LIVE`.

**Passo D — Validar end-to-end**
- Na Stripe, clicar **"Send test webhook"** → `checkout.session.completed`.
- Em `/admin` → widget deve mostrar o evento real como último verificado (não `ping.selftest`).
- Fazer reserva real de €1 numa tour e confirmar:
  - `bookings` recebe row nova.
  - `email_send_log` mostra tentativa (falhará ainda se DNS `notify.yesexperiencesportugal.com` estiver pendente).

## O que eu preciso de ti

1. Confirmação para apagar/limpar `STRIPE_WEBHOOK_SECRET_SANDBOX`.
2. Cópia da signing secret `whsec_…` do endpoint live na Stripe (só se sim, eu abro o formulário seguro — nunca a coles aqui em texto simples).

Nenhum código muda; é só rotação de secrets + verificação.
