# Resultados das verificações 1, 2, 3 e 6 (só leitura, agregados)

Nada foi alterado. Todas as consultas foram SELECT agregados, sem dados pessoais.

## 1. Método de pagamento e código de falha — não é possível medir com a base de dados
- Os eventos LIVE `charge.failed` (18) e `payment_intent.payment_failed` (18) estão gravados sem o conteúdo do evento: o campo de metadados está vazio nestes tipos.
- Por isso, a base de dados não diz qual foi o método usado nem o código de falha.
- O que se sabe: houve 8 `payment_intent.processing` LIVE desde 1 out. Nenhuma das 15 sessões "por pagar" ou "diferido falhado" teve depois `async_payment_succeeded`.
- Conclusão: é compatível com métodos de pagamento diferido, mas não está provado.
- Para provar: no Stripe (live), em Pagamentos → filtro "Falhado" desde 1 out, contar por método e por motivo de recusa. Posso fazer essa consulta pelo conector se autorizares uma leitura (não altera nada).

## 2. Capacidades da conta Stripe — também não é possível medir com a base de dados
- Os 107 `capability.updated` e 21 `account.updated` LIVE também não têm conteúdo gravado.
- Não dá para dizer se algum método foi limitado depois de 20/10.
- Para provar: leitura das capacidades da conta pelo conector Stripe (só GET), que mostra o estado atual de cartões, Klarna, Bancontact, etc.
- Ficam por esclarecer, também nessa leitura: os 3 `payout.failed`, as 3 disputas e o `account.application.deauthorized`.

## 3. Visitantes por dia à volta de 26/10 (tabela anónima própria do site, só domínio live)

| Dia | Visitantes | Dia | Visitantes |
|---|---|---|---|
| 19/10 | 105 | 26/10 | 139 |
| 20/10 | 94 | 27/10 | 67 |
| 21/10 | 57 | 28/10 | 68 |
| 22/10 | 70 | 29/10 | 81 |
| 23/10 | 44 | 30/10 | 60 |
| 24/10 | 135 | 31/10 | 95 |
| 25/10 | 92 | 01/11 | 49 |

- Média de 19 a 25/10: ~85 visitantes/dia. Média de 26/10 a 01/11: ~80/dia.
- Esta fonte não muda de método a 26/10 e não mostra quebra nessa data.
- A descida forte nesta fonte acontece antes: as semanas de 05/10 e 12/10 tiveram ~104 e ~119 visitantes/dia, e as seguintes ~85 e ~80.
- Conclusão: a quebra começa por volta de 19–21/10. A mudança de método da Lovable a 26/10 não é a causa principal, embora possa exagerar a comparação mensal da Lovable.

## 6. Tentativas de checkout do site LIVE contra visitas a páginas de tour, por semana

Contagem de sessões Stripe distintas com evento final (pago, expirado ou falhado). O sandbox fica excluído da taxa.

| Semana | Signature | Studio | Tailor | Total site (live) | Hits em páginas de tour | Tentativas por 100 hits | Sem tipo (fora do site) | Sandbox (testes) |
|---|---|---|---|---|---|---|---|---|
| 05/10 | 5 | 0 | 11 | 16 | 420 | 3,8 | 10 | 40 |
| 12/10 | 4 | 0 | 0 | 4 | 318 | 1,3 | 7 | 59 |
| 19/10 | 3 | 1 | 2 | 6 | 238 | 2,5 | 0 | 146 |
| 26/10 | 3 | 0 | 1 | 4 | 166 | 2,4 | 3 | 2 |
| 02/11 (parcial) | 1 | 0 | 0 | 1 | 89 | — | 2 | 3 |

- Depois de 12/10, a taxa de passagem das páginas de tour para o checkout mantém-se estável, entre 2,4 e 2,5 por 100 hits.
- O que caiu foram as visitas às páginas de tour (de 420 para 166) e, com elas, o número absoluto de tentativas.
- A semana de 05/10 foi excecional: 11 tentativas Tailor, possivelmente poucas pessoas a repetir.
- Pagamentos concluídos no site: 4 entre 1 e 20/10 e 0 depois. Com 11 tentativas live depois de 19/10, zero pagamentos é fraco, mas é uma amostra pequena.
- A semana de 19/10 teve 146 sessões sandbox, sinal de testes intensos nesse período.

## Diagnóstico corrigido (resumo)
1. **Principal fator demonstrado:** menos tráfego a chegar às páginas de tour e ao Studio a partir de ~19/10, confirmado por duas fontes independentes do consentimento.
2. **Checkout:** a taxa de entrada no checkout não piorou. A conversão final (pagar) depois de 20/10 é 0 em 11 tentativas live, e a causa não está provada. Há pagamentos diferidos falhados ou por pagar em poucos clientes, e há dúvidas sobre a conta Stripe.
3. **Medição:** a descida da Lovable a 26/10 não coincide com uma quebra na fonte própria do site. O GA4 continua inadequado para medir volume.

## Próxima ação mínima (precisa da tua autorização, continua só leitura)
- **A.** Leitura no Stripe live pelo conector (só GET): falhas por método e motivo desde 1 out, mais o estado atual das capacidades da conta. Fecha os pontos 1 e 2.
- **B.** Na tabela do site, de onde vem o tráfego das páginas de tour antes e depois de 19/10 (referrer agregado por domínio). Mostra se a quebra veio do Google, dos Ads ou de sites externos.

Nenhuma alteração ao código, ao Stripe ou ao site sem aprovação expressa. Não registei esta tarefa no `roadmap.md`, porque o modo plano não o permite.
