# Porque não estás a receber pedidos + como passar a receber tudo

Investiguei a base de dados e encontrei **duas falhas críticas** e uma **lacuna de acesso admin**. Nenhuma é de UI — é infraestrutura de email/Stripe + uma nova página admin.

## Diagnóstico (factos, não suposições)

1. **Stripe webhook está a falhar com assinatura inválida (HTTP 400)**
   - Último evento em `stripe_webhook_events`: `"No signatures found matching the expected signature for payload"`.
   - Consequência: a reserva que viste no Stripe **nunca criou linha em `bookings`**, **nunca disparou o email de recibo**, **nunca notificou a equipa YES**. A tabela `bookings` está vazia.
   - Causa: `STRIPE_WEBHOOK_SECRET` (live) não corresponde ao endpoint configurado no dashboard Stripe, ou o endpoint aponta para o URL errado.

2. **Resend está em modo de teste (domínio não verificado)**
   - Todos os envios para endereços que não sejam `yesexperiences@gmail.com` falham com `403: "You can only send testing emails to your own email address..."`.
   - Consequência: mesmo que o webhook funcionasse, emails para clientes e para `info@yesexperiencesportugal.com` seriam rejeitados. Só o Gmail pessoal recebe.
   - Vê-se no `email_send_log`: dezenas de `internal-lead` / `contact-received` / `signature-story` a falhar para `info@…` e para emails de clientes.

3. **Não existe uma página admin unificada** que mostre num único sítio:
   - Contactos (`contact_messages`)
   - Leads do Studio V3 (`studio_v3_leads`)
   - Reservas (`bookings`)
   - Sessões de checkout Stripe (via `stripe_webhook_events`)
   - Estado de emails (`email_send_log`)

## Plano

### 1. Configurar domínio de email real (elimina o 403 do Resend)
Abrir o diálogo de setup do domínio de email da Lovable para que o `notify.yesexperiencesportugal.com` (ou similar) seja provisionado e verificado. A partir desse momento, todos os `sendTransactionalInternal` para clientes e para `info@yesexperiencesportugal.com` passam a chegar.

Ação em chat:
```
<presentation-open-email-setup>Set up email domain</presentation-open-email-setup>
```

### 2. Corrigir o Stripe webhook
- Confirmar que o endpoint no dashboard Stripe (live) aponta para o URL da edge function `stripe-webhook` do projecto.
- Copiar o **signing secret** exacto desse endpoint e actualizar o secret `STRIPE_WEBHOOK_SECRET_LIVE` (via `update_secret`, form seguro — não escrevo o valor).
- Repetir para sandbox se necessário (`STRIPE_WEBHOOK_SECRET_SANDBOX`).
- Depois: fazer um teste de checkout de 1 € e confirmar que aparece linha em `bookings` + emails de `internal-booking` e `checkout-receipt` em `email_send_log` com `status='sent'`.

### 3. Reforço: garantir alerta mesmo quando o webhook falha
Adicionar um send fire-and-forget para a equipa quando o webhook devolve erro (dentro de `supabase/functions/stripe-webhook/index.ts`): um email simples “Stripe webhook falhou — sessão X” para `TEAM_NOTIFICATION_RECIPIENTS`. Assim, mesmo que a assinatura volte a partir, ficas a saber logo em vez de descobrir no dashboard Stripe dias depois.

### 4. Nova página admin: `/admin/inbox`
Uma única página com abas para veres tudo o que entra, sem depender de email:

- **Contactos** — últimos 100 `contact_messages` (nome, email, mensagem, data, source).
- **Leads Studio** — últimos 100 `studio_v3_leads` (intent book/refine, jornada, contacto, data).
- **Reservas** — últimos 100 `bookings` (email, tour, montante, status, data).
- **Checkouts Stripe** — últimos 50 `stripe_webhook_events` (event_type, verificado?, status_code, error_message, email) — para veres imediatamente se algum webhook falhou.
- **Emails** — últimos 100 `email_send_log` (template, destinatário, status, erro) — para veres se algum envio caiu.

Cada aba: tabela simples, ordenada por data desc, com filtro rápido por email. Sem edição, só leitura.

Acesso: protegido pelo mesmo padrão dos outros `/admin/*` (role `admin` via `has_role`). O teu utilizador `yesexperiences@gmail.com` já tem role admin (via `grant_admin_for_yes_email`).

### 5. Notificação em tempo real (opcional, ligar depois)
Depois do domínio de email estar verificado, ligar Supabase Realtime na tabela `contact_messages`, `studio_v3_leads` e `bookings` para que a página `/admin/inbox` mostre novos itens sem refresh. Fica marcado como próximo passo, não bloqueia o essencial.

## Ficheiros a alterar

- `supabase/functions/stripe-webhook/index.ts` — enviar email de alerta ao falhar assinatura.
- `src/routes/admin.inbox.tsx` — nova página com as 5 abas.
- `src/lib/admin/inbox.functions.ts` — server functions (`requireSupabaseAuth` + role check) para ler cada tabela.
- `src/routes/admin.index.tsx` — adicionar link para `/admin/inbox`.

## Fora de âmbito
- Nenhuma mudança de UI pública, tipografia, branding, Studio ou fluxo de checkout.
- Não mexer no schema das tabelas existentes.
- Não alterar templates de email (apenas garantir que chegam).

## Ordem de execução
1. Setup do domínio de email (acção tua no diálogo).
2. Actualizar `STRIPE_WEBHOOK_SECRET_LIVE` com o valor correcto do dashboard.
3. Implementar `/admin/inbox` + alerta de webhook falhado.
4. Teste end-to-end: 1 contacto + 1 checkout sandbox → confirmar linhas nas tabelas e emails enviados.
