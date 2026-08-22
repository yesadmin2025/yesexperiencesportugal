# Emails: painel de administração, emails de reserva e templates de autenticação

Três frentes, todas assentes no remetente técnico `notify.yesexperiences.pt` (respostas continuam a ir para `info@yesexperiencesportugal.com`).

## 1. Painel de administração de emails (novo)

Nova página protegida em `/admin/emails`, no mesmo padrão das restantes páginas de admin (acesso apenas a utilizador autenticado, `noindex`).

Inclui:
- **Filtro de período** — botões Últimas 24h / 7 dias / 30 dias + intervalo personalizado (predefinição: 7 dias).
- **Filtro por tipo de email** — lista de templates existentes (confirmação de reserva, recibo, boas-vindas, contacto, avisos internos, emails de autenticação).
- **Filtro por estado** — Todos, Enviado, Falhado, Suprimido, com etiquetas de cor (verde/vermelho/amarelo).
- **Cartões de resumo** — total de emails únicos, enviados, falhados, suprimidos no período filtrado.
- **Tabela de registos** — um registo por email (estado mais recente), com template, destinatário, estado, data/hora e mensagem de erro quando falhou; ordenada por data descendente e paginada acima de 50 linhas.
- **Bounces e reclamações** — separador com a lista de endereços bloqueados (motivo e data), para perceber entregas recusadas.
- **Fila parada** — contagem e lista dos envios que ficaram em espera enquanto o DNS não estava verificado, com botão para reprocessar.

Nota importante: a página mostra emails de clientes e detalhes de erros, por isso fica restrita a administradores.

## 2. Emails transacionais de reserva e boas-vindas

Já existem e estão ligados ao fluxo de checkout (confirmação de reserva com itinerário completo, recibo, boas-vindas). O trabalho aqui é de acabamento premium, não de criação:
- Rever o tom e a estrutura dos templates de confirmação, recibo e boas-vindas para o registo editorial da marca (dourado como detalhe, texto quente, sem linguagem genérica).
- Garantir links úteis e visíveis: itinerário online, transferência do PDF, contacto direto, página da experiência.
- Confirmar que o assunto e o pré-cabeçalho de cada email são específicos e pessoais.
- Verificar que os três templates aparecem corretamente na pré-visualização e no painel novo.

## 3. Templates de email de autenticação com a marca

Os seis templates de autenticação (registo, link mágico, recuperação de palavra-passe, convite, alteração de email, reautenticação) estão neste momento no visual genérico por omissão. Vão passar a usar a mesma linguagem visual dos emails de reserva: sobrescrito dourado, títulos serifados, corpo em Inter/Arial, botão da marca, assinatura YES Experiences Portugal e assunto no tom certo. O remetente técnico é `notify.yesexperiences.pt`, com resposta para `info@yesexperiencesportugal.com`.

## Detalhes técnicos

- Nova rota `src/routes/admin.emails.tsx` a ler `email_send_log`, `suppressed_emails` e `email_deferred_sends`.
- Todas as consultas deduplicam por `message_id` (registo mais recente por email), para as contagens não duplicarem estados intermédios.
- O reprocessamento da fila usa o endpoint interno já existente de drenagem de envios parados.
- Templates de autenticação em `src/lib/email-templates/` (signup, magic-link, recovery, invite, email-change, reauthentication) reescritos com os tokens de marca já usados em `booking-confirmation.tsx`; fundo do corpo mantém-se branco por requisito de compatibilidade de email.
- Sem alterações de esquema de base de dados.

## Fora do âmbito

- Emails de marketing ou newsletters.
- Alterações ao DNS: assim que `notify.yesexperiences.pt` ficar verificado, desligo o remetente temporário e reenvio o que ficou parado.
