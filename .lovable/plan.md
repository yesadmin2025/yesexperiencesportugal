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

## Conclusão
Nos percursos testados não foi encontrada nenhuma falha que impeça a reserva ou o contacto no mobile: catálogo, Signature até aos dados, Studio até ao botão final, e os três formulários.

A queda dos checkouts iniciados (26 para 5) não se explica por uma avaria reproduzível. É coerente com a queda das visitas comerciais. O teste não abrange: cancelamento a meio do pagamento, Multibanco, navegadores iOS Safari reais e utilizadores com bloqueadores.

## Correções propostas (máximo 3, só com autorização)
1. **P0 — verificar e, se confirmado, corrigir o rótulo de região na revelação do Studio (3c).** Primeiro reproduzir com as mesmas escolhas e ver de onde vem o título. Só se houver incoerência real: corrigir o rótulo. Não se mexe na composição, nos preços nem nas paragens.
2. **P1 — confirmar a mensagem de sucesso do Travel Designer (4c).** Uma captura visual, sem alterar código. Só há correção se não aparecer.
3. **P2 — tratar o "Failed to fetch" do pedido de estatísticas.** Apanhar o erro em silêncio. Limpa os registos, sem efeito para o cliente.

Nenhuma destas explica a queda das reservas. O próximo trabalho com impacto comercial é perceber a origem da quebra das visitas às páginas de tour e ao Studio (aquisição), e a quebra dos pagamentos fora do site.

## O que falta para fechar
- iPhone real em Safari: date picker nativo e abertura do Stripe.
- Um pagamento de teste em sandbox até ao fim, na pré-visualização, se autorizares.
- As 6 recusas Multibanco: experiência do cliente nesse método.

Aguardo autorização explícita antes de qualquer construção. Esta tarefa ainda não está no `roadmap.md`, porque o modo plano não o permite.
