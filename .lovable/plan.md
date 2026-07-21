## Estado atual (verificado nos dados)

- **Bookings:** tabela `bookings` está vazia — **nenhum checkout live jamais gravou** (0 rows). Isto confirma que o webhook nunca completou uma reserva real.
- **Emails para clientes:** desde julho **todos os emails para destinatários que não sejam `yesexperiences@gmail.com` falham** com `resend 403 validation_error` — a Resend está em modo de teste porque `notify.yesexperiencesportugal.com` ainda não tem os DNS verificados. Único email que passa: o teu próprio (interno).
- **Emails internos para ti:** funcionam (`internal-lead` → `yesexperiences@gmail.com` = `sent`). Último envio: hoje 20:39.
- **Webhook Stripe:** signing secret foi rodada agora há pouco + adicionei fallback para o formato v2 (thin event). Ainda não há evento real verificado após a rotação.

## O que testar (nesta ordem)

**1. Webhook signature (30 s, sem gastar dinheiro)**
- Na Stripe (Live) → Developers → Webhooks → endpoint `yesexperiencesportugal.com/functions/v1/stripe-webhook` → **Send test webhook** → escolher `checkout.session.completed` → **Send**.
- Em `/admin` (site publicado) → carregar **Verificar**.
- **Esperado:** último evento verificado passa de `ping.selftest` → `checkout.session.completed`. Tile "checkout.session.completed (72h)" fica verde.
- Se falhar → parar, ler o log e corrigir antes de fazer pagamento real.

**2. Reserva real de €1 (fim-a-fim)**
- Escolher uma tour, agendar para uma data ≥ 24 h à frente, cartão real, valor mínimo.
- **Verificar em SQL logo a seguir:**
  - `bookings` tem uma nova linha com `status = 'paid'`, `stripe_session_id`, `amount_total`, `customer_email`, composição correta (adultos/crianças).
  - `stripe_webhook_events` regista o evento com `verified = true`.
  - `email_send_log` mostra tentativa do template `booking-confirmation` (ou equivalente) para o email do cliente.

**3. Analisar o que aconteceu aos emails**

Aqui há **dois destinatários e dois resultados esperados diferentes**:

| Destinatário | Template | Resultado esperado hoje | Porquê |
|---|---|---|---|
| **Cliente** (email real dele) | Confirmação de reserva + recibo Stripe | ❌ Vai falhar com `resend 403` | DNS de `notify.yesexperiencesportugal.com` **ainda pendente** — Resend está em modo teste |
| **Tu** (`yesexperiences@gmail.com`) | Notificação interna de nova reserva | ✅ Deve chegar | É o email "owner" verificado na Resend |

Ou seja, sem o DNS verificado **é impossível testar o email ao cliente com sucesso**. O checkout e o gravar em `bookings` são independentes disso — esses vão funcionar assim que o webhook estiver ok.

## Bloqueio a resolver antes de dizermos "prontos"

**DNS pendente em `notify.yesexperiencesportugal.com`.** Enquanto isto não estiver verificado, todo o cliente que reservar não recebe confirmação. Registos exatos a adicionar no provedor de DNS (aparecem em Cloud → Emails do painel):

- `TXT` em `_lovable-email.yesexperiencesportugal.com`
- `NS` em `notify.yesexperiencesportugal.com` → `ns3.lovable.cloud` + `ns4.lovable.cloud`

Depois de propagar, carregar em **Verify Domain** em Cloud → Emails.

## O que preciso de ti para avançar

1. Confirmação de que fizeste o passo 1 (test webhook Stripe) e o resultado em `/admin`.
2. Se sim → autorização para fazer a reserva real de €1 e depois eu verifico as 3 tabelas em SQL.
3. Confirmação de que **avanças com o DNS de `notify.yesexperiencesportugal.com`** (posso guiar-te no provedor onde tens o domínio) — sem isto o email ao cliente nunca vai passar em produção, por muito que o resto funcione.

Sem alterações de código nesta fase — é validação + desbloqueio de DNS.
