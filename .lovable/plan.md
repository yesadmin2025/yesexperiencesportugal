## Diagnóstico

Endpoint no dashboard Stripe (Live): `https://yesexperiencesportugal.com/functions/v1/stripe-webhook` → **URL errado**. Esse domínio serve o site (Cloudflare Worker), não tem a rota `/functions/v1/*`, portanto todos os `checkout.session.completed` reais devolvem 404/erro e nada é registado.

O self-test do widget passa porque bate directamente no URL Supabase correcto:
`https://kqygnqetygcvkaauwbji.supabase.co/functions/v1/stripe-webhook`

## Correcção — 3 passos, sem código

### 1. Editar o endpoint na Stripe

Dashboard Stripe (Live) → Webhooks → **YesExperiences Portugal** → **Editar destino**.

Substituir o URL por:

```
https://kqygnqetygcvkaauwbji.supabase.co/functions/v1/stripe-webhook
```

O **Signing secret** permanece o mesmo (o `whsec_…` que já está guardado em `STRIPE_WEBHOOK_SECRET_LIVE` — o self-test confirma que coincide). Não geres um novo secret; se o dashboard forçar a rotação, colas o novo no formulário seguro que abro em seguida.

Confirma que os 15 eventos que já tens seleccionados incluem:

- `checkout.session.completed` ✅ (crítico)
- `checkout.session.async_payment_succeeded`
- `payment_intent.succeeded`
- `charge.refunded`

### 2. "Fazer ping" na Stripe

Ainda no mesmo ecrã, carrega em **Fazer ping**. Depois abre `/admin` → **Verificar**. Deve aparecer o evento novo em "Último evento verificado" com timestamp de segundos atrás e status live.

### 3. Teste real de €1

- Reserva real numa Signature tour (reembolsas depois).
- Confirmar em `/admin`: `checkout.session.completed` a verde, linha em Bookings, e-mail enviado (se o DNS `notify.yesexperiencesportugal.com` já estiver verificado — senão o e-mail continua a falhar independentemente disto).

## Se preferires, posso automatizar

Alternativa: em vez de mudares o URL na Stripe, mantenho `yesexperiencesportugal.com/functions/v1/stripe-webhook` e crio uma rota de proxy TanStack em `src/routes/api/public/stripe-webhook.ts` que reencaminha o corpo cru + header `stripe-signature` para a Edge Function. Vantagem: URL bonito no domínio próprio. Desvantagem: um salto extra e mais código para manter. Recomendação: **apontar directamente para o URL Supabase** (passo 1) — é o padrão Stripe + Supabase e é o que o próprio self-test valida.

Diz-me qual dos dois caminhos preferes e avanço.

&nbsp;

Mantém o do site yes