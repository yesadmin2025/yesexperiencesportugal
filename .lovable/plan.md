## Estado real (verificado via SQL agora)

Últimos 10 eventos em `stripe_webhook_events`:
- `ping.selftest` → **verified: true** (self-test funciona)
- Todas as entregas reais da Stripe (event_type NULL) → **verified: false**, erro *"No signatures found matching the expected signature for payload"*

**Diagnóstico:** o header `stripe-signature` está a chegar, mas o HMAC não bate. Isto só acontece por um motivo: **a signing secret guardada (`whsec_Zccyz8bhf…`) não corresponde ao endpoint que a Stripe está realmente a usar para entregar**. O proxy (`src/routes/functions.v1.stripe-webhook.ts`) está correto — encaminha o raw body + header intactos.

Provável causa: há mais de um endpoint no dashboard Stripe (o antigo apontando a `…supabase.co/functions/v1/stripe-webhook` continua ativo e é ele que está a entregar; a secret que revelaste foi a do novo, no domínio custom).

---

## Plano de correção (2 passos)

### 1. Limpar endpoints duplicados na Stripe (tu, 30s)
Stripe → Developers → Webhooks (**Live mode**):
- Listar TODOS os endpoints ativos.
- **Apagar** todos exceto o que aponta para `https://yesexperiencesportugal.com/functions/v1/stripe-webhook`.
- No que fica: **Signing secret → Reveal** → copiar `whsec_…`.

### 2. Confirmar/atualizar a secret
- Se o `whsec_` copiado **começar por `whsec_Zccyz8bhf`** → já está certa, avançamos direto para reserva real €1.
- Se **começar por outra coisa** → abro formulário seguro para atualizares `STRIPE_WEBHOOK_SECRET_LIVE` com o valor correto do endpoint sobrevivente.

### 3. Validação (eu, via SQL)
Depois de guardares:
- Fazes **Send test webhook → `checkout.session.completed`** na Stripe.
- Eu consulto `stripe_webhook_events` — deve aparecer `verified: true` com `event_type = checkout.session.completed`.
- Fazes reserva real €1. Confirmo row em `bookings` + email interno.

### Notas
- Emails de cliente continuam bloqueados até o DNS de `notify.yesexperiencesportugal.com` verificar — trato assim que autorizares.
- Após tudo verde, roda `sk_live_…` e `whsec_…` na Stripe (apareceram em screenshots) e volto a guardar as novas.

---

Diz-me quantos endpoints tens na Stripe (Live mode) e o prefixo (primeiros 12 chars) do `whsec_` do endpoint que sobreviver. Não mexo em código até saber isto — o problema não está no código.
