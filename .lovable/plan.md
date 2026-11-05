# Teste funcional de conversão — mobile 393px, site publicado (5 nov 2026, ~23:30 UTC)

## Como foi testado
- Site publicado, visto num ecrã de telemóvel simulado (Chromium, 393×852).
- Todos os envios foram intercetados no próprio browser:
  - criação de checkout: bloqueada antes de sair;
  - formulários: resposta simulada, nada chegou ao servidor;
  - estatísticas de visita: bloqueadas.
- Não foi criada nenhuma sessão Stripe (nem live nem sandbox), nenhum lead real nem nenhum registo na base de dados.
- Nada foi alterado no código, na base de dados ou no site.

## Resultados

| # | Teste | Resultado | Prova (rota · condição reproduzível) |
|---|---|---|---|
| 1a | /experiences carrega cartões e imagens | **PASSOU** | 200 · página pronta em 2,0s · 12 imagens, 0 partidas, 0 por carregar depois do scroll · 1 título principal · sem scroll horizontal |
| 1b | /pt/experiences | **PASSOU** | 200 · 0,5s · 12 imagens, 0 partidas · 12 botões "Ver disponibilidade e reservar" |
| 1c | Destinos dos botões | **PASSOU** | 24 botões em /experiences: "See dates & reserve" leva a `/tours/<id>#book` e "Tailor this day" a `/tours/<id>/tailor`. Os 12 tours devolvem 200 e não redirecionam. Os botões PT levam aos mesmos tours |
| 2a | Signature: validação sem data | **PASSOU** | `/tours/arrabida-wine-allinclusive#book` · "Reserve this day" sem data mostra "Pick an available date at least 24 hours from now." |
| 2b | Signature: data, participantes e preço | **PASSOU** | Data 20/11/2026 e 3 adultos dão €183/adulto e total €549, coerente com a tabela de preços visível |
| 2c | Signature: abrir o passo de dados | **PASSOU** | O painel abre em 0,1s com nome, email, telefone, pedidos e checkbox. "Continue to payment" com campos vazios fica bloqueado e assinala o erro |
| 2d | Signature: abertura do Stripe | **NÃO TESTÁVEL** (de propósito) | O pedido não podia criar uma sessão live. Último teste com Stripe de teste, na pré-visualização: chegou ao ecrã de cartão a €366 |
| 3a | Studio: progressão | **PASSOU** | `/studio` · 1,6s · Sentimento → Quem → Interesses → Ritmo → Data → Recolha → Pessoas → Resumo → "Review route & price" → revelação com €305/pessoa e €610 no total · 0 erros |
| 3b | Studio: botão final | **PASSOU** (até ao botão) | "Love this day · Reserve it" visível e ativo. Não foi carregado, para não chegar ao pagamento |
| 3c | Studio: coerência da região | **A VERIFICAR** | A revelação teve o título "Southwest Alentejo · Costa Vicentina" mas mostrou Capela dos Ossos (Évora), prova de vinho de talha e paragem romana. Pode ser só um rótulo de região errado; não confirmei a causa |
| 4a | Contact | **PASSOU** | `/contact` · envio vazio deixa 3 campos inválidos · envio válido envia 1 pedido para `/api/public/contact` (nome, email, tipo, data, mensagem, origem, atribuição; telefone não) · aparece "Thank you." |
| 4b | Corporate | **PASSOU** | `/contact?type=corporate` · o tipo vem pré-selecionado (2 campos inválidos quando vazio) · mesmo pedido e "Thank you." |
| 4c | Travel Designer | **PASSOU com reserva** | `/portugal-travel-designer` · validação OK · 1 pedido com tipo de pedido incluído · o formulário desaparece depois do envio, mas o texto de sucesso não foi detetado automaticamente (a captura ficou no rodapé). Falta confirmar visualmente |
| 5 | Erros registados em rotas comerciais desde 19/10 | **INFORMATIVO** | Erros funcionais: 58 desde 19/10 contra 34 nos 11 dias anteriores. Quase todos são "Failed to fetch" (56) |
| 5b | Origem de "Failed to fetch" | **Hipótese reproduzida** | Bloquear o pedido de estatísticas (`/api/public/visit`) gera exatamente esse erro não tratado na página. É o que acontece com bloqueadores de anúncios. É ruído de medição, sem impacto na reserva |

Outros erros: imagens com fallback 91 desde 19/10 contra 88 antes (62 na homepage); terceiros bloqueados 410 contra 318. Ambos sem impacto funcional observado.

## Conclusão (limitada ao que está provado)
1. **Funcional:** nos percursos testados no mobile não foi encontrada nenhuma falha que impeça a reserva ou o contacto. Foram testados o catálogo, a Signature até ao passo de dados, o Studio até ao botão final e os três formulários. O teste não cobre: o pagamento em si, o Multibanco, o Safari num iPhone real nem utilizadores com bloqueadores.
2. **Visitas:** a tabela própria do site mostra uma queda nas visitas. Comparando 15–25/10 com 26/10–05/11: identificadores anónimos/dia de 100,8 para 79,0, páginas de tour de 34,8 para 21,2 e Studio de 5,0 para 2,2. O peso dos bots ainda não está confirmado.
3. **Stripe:** a conta live está atualmente ativa, sem requisitos pendentes. Há 6 PaymentIntents Multibanco com recusa genérica. Não há pagamentos Stripe live registados depois de 20/10.
4. **Causa:** não está provada.

Ressalvas:
- As 8 sessões pagas com `booking_type` vazio são sessões sem fluxo identificado. São compatíveis com Payment Links, faturação ou metadados em falta, mas não estão confirmadas como pagamentos fora do site.
- Não há dados de PayPal, Wise nem outros canais. Por isso, não se conclui que os pagamentos fora do site desapareceram.
- Os números 26 e 5 contam sessões Stripe com evento final dentro de cada intervalo. Não são todos os checkouts iniciados, e os períodos não têm a mesma duração (20 contra 16 dias).
- Sem denominadores da mesma população e do momento de criação da sessão, não se afirma que a taxa de entrada no checkout se manteve nem que piorou.

## Correções propostas (máximo 3, só com autorização)
1. **P0 — verificar e, se confirmado, corrigir o rótulo de região na revelação do Studio (3c).** Primeiro reproduzir com as mesmas escolhas e ver de onde vem o título. Só se houver incoerência real: corrigir o rótulo. Não se mexe na composição, nos preços nem nas paragens.
2. **P1 — confirmar a mensagem de sucesso do Travel Designer (4c).** Uma captura visual, sem alterar código. Só há correção se não aparecer.
3. **P2 — tratar o "Failed to fetch" do pedido de estatísticas.** Apanhar o erro em silêncio. Limpa os registos, sem efeito para o cliente.

Nenhuma destas está provada como causa da queda das reservas. Os próximos passos com impacto comercial (só leitura) são três:
1. Perceber a origem da queda de visitas às páginas de tour e ao Studio.
2. Contar os checkouts pela data em que foram criados e cruzar com as visitas do mesmo período.
3. Juntar os dados de outros canais de pagamento (PayPal, Wise, faturas).

## O que falta para fechar
- iPhone real em Safari: date picker nativo e abertura do Stripe.
- Um pagamento de teste em sandbox até ao fim, na pré-visualização, se autorizares.
- As 6 recusas Multibanco: experiência do cliente nesse método.

Aguardo autorização explícita antes de qualquer construção. Esta tarefa ainda não está no `roadmap.md`, porque o modo plano não o permite.
