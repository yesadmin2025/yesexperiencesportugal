# Fase 0 — conclusão factual corrigida e plano de priorização

Nada foi alterado. Esta versão substitui as conclusões anteriores. Ficam retiradas três afirmações:
- "0 pagas em 11 tentativas";
- a "taxa de passagem" calculada com denominadores diferentes;
- qualquer atribuição da quebra ao Google ou aos Ads.

## Conclusão factual

**1. Procura no site (sinal real, mas ainda não quantificado ao detalhe)**

Fonte: tabela própria do site, dois blocos de 11 dias.

| Indicador | 15–25/10 | 26/10–05/11 | Variação |
|---|---|---|---|
| Identificadores anónimos/dia | 100,8 | 79,0 | -22% |
| Visualizações/dia | 226,3 | 174,5 | -23% |
| Páginas de tour/dia | 34,8 | 21,2 | -39% |
| Studio/dia | 5,0 | 2,2 | -56% |

- A quebra é mais forte nas páginas comerciais (tours e Studio) do que no total.
- Ainda não estão confirmados: o peso dos bots e a fiabilidade de contar pessoas por identificadores anónimos.
- A origem não está identificada: a maior parte dos eventos não tem referrer, e os eventos com referrer Google até subiram (28 → 39).
- O GA4, com 175 sessões, mede outra população (só quem aceita cookies) e não contradiz esta descida.

**2. Conta Stripe: sem bloqueio atual**
- Pagamentos e transferências estão ativos, sem requisitos pendentes.
- Cartão, Multibanco, MB Way e Klarna estão ativos.
- Não há evidência de bloqueio geral.

**3. Pagamentos (PaymentIntents LIVE desde 1/10, n=24)**
- 12 bem-sucedidos, todos até 20/10.
- 6 falhados, todos Multibanco, com recusa genérica.
- 5 cancelados e 1 em processamento.
- As falhas confirmadas são todas Multibanco. Não há prova de falhas de cartão. Não se extrapola para o resto do checkout.

**4. Sessões de checkout do site terminadas (LIVE, por fluxo)**

| Período | Signature | Tailor | Studio | Total site | Pagas no site | Sem fluxo (fora do site) |
|---|---|---|---|---|---|---|
| 01–20/10 | 11 (2 pagas) | 13 (2 pagas) | 2 (0) | 26 | 4 | 20 (8 pagas) |
| 21/10–05/11 | 4 (0) | 1 (0) | 0 | 5 | 0 | 5 (0 pagas) |

- O número de checkouts iniciados no site caiu muito (de 26 para 5).
- Com 5 sessões, a amostra é demasiado pequena para afirmar que o checkout piorou tecnicamente.
- As 8 pagas "sem fluxo" eram pagamentos fora do site (links ou faturas). O seu desaparecimento é um fator separado, com origem comercial ou operacional, não do site.

**Síntese:** a queda das reservas explica-se sobretudo por três fatores:
- (a) menos procura nas páginas comerciais;
- (b) muito menos checkouts iniciados no site;
- (c) ausência de pagamentos fora do site depois de 20/10.

Há um problema localizado com Multibanco (6 recusas). Não está provada nenhuma avaria geral do checkout.

## Plano de priorização (só depois da tua autorização)

| Prio | Tema | Objetivo | Tipo | Ação mínima |
|---|---|---|---|---|
| P0 | Multibanco | Perceber as 6 recusas genéricas | Análise, sem código | Ver no Stripe se as 6 vêm de poucos clientes ou repetições, e se o Multibanco aparece por defeito a clientes estrangeiros. Decidir contigo se se mantém, se se esconde fora de PT ou se fica igual |
| P0 | Pagamentos fora do site | Explicar a ausência de links e faturas pagas depois de 20/10 | Operacional, sem código | Confirmar com a equipa se houve menos orçamentos enviados ou menos procura de agências e parceiros |
| P1 | Origem da quebra de procura | Saber de onde vinha o tráfego das páginas de tour | Medição | GSC por página e dispositivo (tour e Studio), dados dos Ads, e se possível referrers por domínio com o mesmo denominador. Sem conclusões até cruzar estas fontes |
| P1 | Qualidade da contagem | Separar bots e humanos na tabela do site | Medição, sem código | Comparar com os visitantes Lovable dia a dia. Só se houver discrepância persistente se propõe uma correção |
| P2 | Duplicação de eventos GA4 | Confirmar ou excluir | Teste teu no GTM Preview | Só se confirmado: um canal único. Sem impacto em reservas |
| P2 | `checkout_started` antes da sessão Stripe | Funil GA4 fiável | Código pequeno | Só com aprovação, depois das P0 e P1 |

Não se tocam preços, regras, Stripe, consentimento, design nem SEO sem dados que o justifiquem e sem a tua aprovação expressa.

## Testes e rollback (para quando houver alterações)
- Antes e depois, com o mesmo denominador e blocos de 11 dias: páginas de tour/dia, Studio/dia, sessões de checkout do site terminadas por fluxo, pagas live.
- Cada alteração é isolada e pode ser revertida pelo histórico.

## O que falta para confirmar hipóteses
- Distribuição das 6 recusas Multibanco por cliente e por país.
- Volume de orçamentos e links de pagamento enviados antes e depois de 20/10.
- GSC por página e dispositivo, e cliques e impressões dos Ads, nos mesmos dois blocos.
- Taxa de bots na contagem própria do site.

Nota: o modo plano não permite escrever no `roadmap.md`. Esta tarefa fica registada quando aprovares.
