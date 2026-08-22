# Emails: papéis de acesso, validação de links, reenvio automático e pré-visualização com dados reais

Quatro melhorias ao painel `/admin/emails` (monitorização + estúdio de templates), mantendo a estética editorial atual e mobile-first.

## 1. Controlo de acesso por papéis

Três níveis, guardados na tabela de papéis existente (nunca no perfil):

| Papel | Ver logs / bounces / fila | Enviar testes | Reprocessar fila | Gerir papéis |
|---|---|---|---|---|
| `admin` | sim | sim | sim | sim |
| `email_operator` | sim | sim | sim | não |
| `email_viewer` | sim (emails de destinatários mascarados) | não | não | não |

- Novos valores no enum de papéis: `email_operator`, `email_viewer`.
- Toda a verificação é feita no servidor, em cada função (não no browser). Quem não tiver papel continua a receber "Forbidden".
- O `email_viewer` recebe os endereços parcialmente ocultos (`j***@dominio.com`), porque o painel expõe dados pessoais de hóspedes.
- Pequena secção "Acesso" visível apenas ao admin: atribuir/remover `email_operator` e `email_viewer` a utilizadores existentes por email.
- A interface esconde os botões que o papel não permite, mas a decisão real é sempre do servidor.

## 2. Validador de links dos templates

Botão "Verificar links" no estúdio de templates. Para o template selecionado:

- Extrai todos os `href` do HTML renderizado.
- Classifica cada um: interno (nosso domínio), externo, `mailto:`/`tel:`, âncora, ou inválido (relativo, placeholder, `#`, variável não preenchida).
- Faz um pedido `HEAD` (com fallback `GET`) a cada URL http(s), em paralelo e com timeout curto, e mostra o estado: OK, redirecionado (com destino final), 404, erro, ou tempo esgotado.
- Resultado numa lista com o texto do botão/link, o URL e um selo colorido. Links de gestão de reserva/itinerário são marcados como "requer referência" quando dependem de um `session_id` — validados com a referência escolhida no ponto 4.
- O envio de teste fica bloqueado com aviso (não impedido) quando existem links quebrados, para o operador decidir.

## 3. Reenvio automático apenas para falhas transitórias

- Classificação do erro antes de decidir: **transitório** (429, 5xx, timeout, falha de rede, domínio ainda a verificar) → reenvia; **permanente** (400/422 de endereço inválido, destinatário suprimido, conteúdo rejeitado) → marca como falha definitiva e não volta a tentar.
- Backoff exponencial com jitter a partir do momento da última tentativa: 1 min, 5 min, 15 min, 1 h, 3 h, 6 h, 12 h — máximo 7 tentativas e 48 h de vida; depois disso o email fica "abandonado" e visível no painel para ação humana.
- Um agendamento no backend chama o reenvio periodicamente, por isso deixa de ser preciso carregar em "Reprocessar" manualmente. O botão manual mantém-se para forçar.
- Novas colunas na fila parqueada: próxima tentativa, tipo de falha e estado final. O painel passa a mostrar "próxima tentativa em X" e separa "a aguardar retry" de "falha definitiva".

## 4. Pré-visualização com preenchimento automático de variáveis

- Novo seletor no estúdio: **Dados de exemplo** ou **Dados reais de uma reserva**.
- Em "dados reais", o operador escolhe uma reserva recente (lista das últimas reservas, por referência e data) ou cola uma referência. O sistema carrega o snapshot dessa reserva e preenche automaticamente: nome, data, número de hóspedes, itinerário completo, extras, notas, valor, referência e todos os links (itinerário online, PDF, gestão da reserva, página da experiência).
- Para templates de autenticação, os campos correspondentes (link de confirmação, código) são preenchidos com valores de exemplo seguros e claramente marcados como teste.
- Qualquer variável em falta é destacada a vermelho na pré-visualização, para se ver logo o que ficaria vazio no email do cliente.
- O envio de teste usa exatamente o mesmo conjunto de dados que está pré-visualizado, com o assunto prefixado `[TESTE]`, e nunca envia para o hóspede — apenas para o endereço indicado pelo operador.

## Notas técnicas

- Migração: novos valores no enum `app_role`; colunas `next_attempt_at`, `failure_kind`, `status` em `email_deferred_sends`; agendamento periódico do flush.
- Funções de servidor em `src/lib/emailAdmin.functions.ts` passam a devolver as capacidades do papel; a lógica sensível fica em `src/lib/email/admin.server.ts`.
- Classificação de erro e backoff em `src/lib/email/send-internal.server.ts`, reutilizada pelo envio inicial e pelo flush.
- Validação de links num endpoint de servidor (evita CORS no browser) com limite de concorrência e timeout de 5 s.
- Preenchimento a partir de `booking_snapshots` através do contrato já existente em `src/lib/booking-snapshot-contract.ts`, para a pré-visualização ser idêntica ao email real.
