## Confirmação do que vejo nos screenshots

- **Signing secret do endpoint "Yes Experiences"**: `whsec_Zccyz8bhfJN8LSKIMCQEW2uzgHRuj4m7…` — **bate com o `STRIPE_WEBHOOK_SECRET_LIVE` já guardado** (prefixo `whsec_Zccyz8bhf`). Não precisa de update.
- **Chave secreta "Yes Experiences"**: `sk_live_…R0Bs` — é uma **chave secreta nova** (a atual `STRIPE_LIVE_API_KEY` acabou em outros chars). É esta que quero atualizar.
- **Entregas recentes**: "Nenhuma entrega recente" — o endpoint está ativo mas a Stripe não entregou nada nas últimas 24h. Os erros na base de dados são de tentativas antigas ou de outro caminho.

## Plano

### 1. Atualizar `STRIPE_LIVE_API_KEY` (secure form)
Abro o formulário para colares a nova `sk_live_…R0Bs` completa. Guardado, o servidor passa a usar esta chave para criar sessões de checkout e ler eventos.

### 2. Validação sem código novo
Depois de guardares:
- Abres `/admin` → **Webhook Health (Live)** → **Verificar**. Tile deve continuar verde (`ping.selftest`).
- Na Stripe → endpoint "Yes Experiences" → **Enviar webhook de teste** → `checkout.session.completed`.
- Consulto `stripe_webhook_events` — deve aparecer `verified: true` com `event_type = checkout.session.completed`.

### 3. Reserva real €1
Fazes checkout num tour → confirmo:
- Row nova em `bookings` com `payment_status = paid`.
- Email interno enviado.
- Email cliente continua bloqueado até DNS `notify.yesexperiencesportugal.com` verificar (paralelo).

### Segurança
A `sk_live_…R0Bs` completa apareceu no screenshot. Assim que estiver tudo verde, roda-a na Stripe e volto a guardar a nova (mesmo processo, 30s).

---

Confirmas que abro o formulário para atualizares `STRIPE_LIVE_API_KEY` com a `sk_live_…R0Bs` completa?
