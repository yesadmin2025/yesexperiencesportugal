# Reservas por dia + resumo para o guia

Objetivo: no painel de reservas, clicar num dia do calendário e ver as reservas desse dia, abrir um resumo operacional **sem preços** e enviá-lo ao guia por e-mail ou WhatsApp.

## 1. Filtrar e clicar no calendário

- Clicar num dia abre um painel do dia, abaixo do calendário, com todas as reservas dessa data.
- Cada linha mostra: hora de início, experiência, nº de viajantes (adultos/crianças), nome do cliente, local de recolha, estado.
- Filtros já existentes mantêm-se (experiência) e acrescenta-se filtro por estado (paga / pendente).
- Dias com reservas ficam marcados; o dia selecionado fica destacado.
- Botão “Ver no detalhe” em cada linha continua a abrir a página completa da reserva.

## 2. Resumo do guia (sem preço)

Um botão “Resumo do guia” por reserva, e também “Resumo do dia” quando há várias reservas no mesmo dia.

O resumo inclui apenas o que o guia precisa:
- Data e hora de início, duração
- Experiência e lista de paragens na ordem do dia (do registo da reserva)
- Nº de viajantes e composição (adultos, crianças com idades)
- Cliente: nome, telefone, e-mail, local/hotel de recolha
- Pedidos especiais, notas internas, idioma
- Referência da reserva

Nunca inclui: total pago, preço por pessoa, extras com valor, dados de pagamento. Todos os campos vêm do registo gravado na compra — nada é inventado; o que falta aparece como “a confirmar”.

## 3. Enviar ao guia

- Lista de guias guardada no admin (nome, e-mail, WhatsApp) — escolhe-se pelo nome.
- Também é possível escrever um contacto pontual, sem guardar.
- **E-mail:** envia o resumo com a marca YES pelo sistema de e-mails existente (fica registado em Admin → Emails).
- **WhatsApp:** abre o WhatsApp com o mesmo resumo já escrito, pronto a enviar.
- “Copiar resumo” para colar em qualquer sítio.
- Cada envio fica registado na reserva (quem, quando, para que guia).

## Detalhes técnicos

- Nova tabela `guides` (nome, e-mail, telefone/WhatsApp, ativo) com acesso restrito a administradores; GRANTs e RLS por `has_role`.
- Nova página admin `/admin/guides` para criar/editar/desativar guias.
- `src/lib/bookingsAdmin.functions.ts`: nova função `buildGuideBrief` (monta o resumo a partir do snapshot da reserva, sem campos monetários) e `sendGuideBrief` (e-mail via `sendTransactionalInternal` com `rendered`, idempotente, audita em `metadata.guide_dispatches`). Ambas com `requireSupabaseAuth` + verificação de admin.
- `BookingsAvailabilityCalendar.tsx`: painel do dia selecionado, filtro de estado, ações por reserva.
- Novo componente `GuideBriefPanel` reutilizado no calendário e na página `/admin/bookings/$id`.
- Testes focados: o resumo nunca contém valores monetários; agrupamento por dia; link WhatsApp bem codificado.
- Validação a 393px e desktop; sem alterações a preços, Stripe, regras de disponibilidade, dados de tours, SEO ou schemas.
