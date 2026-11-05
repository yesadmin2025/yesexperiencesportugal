# Diagnóstico corrigido — Fase 0 (apenas leitura, nada alterado)

As correções que fizeste estão certas. Os números "311 expiradas contra 8 pagas" misturavam sandbox com produção e ficam retirados. A frase "o tráfego total não caiu" também fica retirada.

Todas as consultas abaixo foram agregadas (SELECT), sem nomes, emails nem telefones. Nenhum código, base de dados, configuração, GTM, Stripe ou DNS foi alterado.

## (a) Visitas e medição

| Fonte | O que mede | Resultado | Limitação |
|---|---|---|---|
| Analytics Lovable (os teus dados) | Visitantes e pageviews de todo o tráfego, sem depender de consentimento | Visitantes de 1.890 para 1.428 (-24%); pageviews de 5.008 para 3.006 (-40%) | Mudança de método (legacy → split) a 26/10, o que parte a série |
| Tabela própria do site (anónima, só domínio live) | Hits e visitantes por semana | Semanas 05/10 e 12/10: 729 e 833 visitantes. Semanas 19/10, 26/10 e 02/11 (parcial): 592, 557 e 307. Studio passou de ~51 para 15–17 hits/semana; páginas de tour de 420 para 166 | Só começou a 03/10, por isso não há base de setembro |
| GA4 (os teus dados) | Sessões com consentimento | 175 contra 151 | Só conta quem aceita cookies; 40% em "Unassigned" |

Conclusão provisória: duas fontes independentes, que não dependem de consentimento, mostram uma descida real a partir da semana de 19/10. Nas páginas de tour e no Studio a descida é mais forte do que no total. O GA4 sobe porque mede outra coisa (sessões com consentimento) e não serve para medir volume.

Ainda não está provado:
- quanto da descida da Lovable se deve à mudança de método de 26/10;
- a parte dos bots.

## (b) Reconciliação Stripe LIVE (01/10–05/11)

| Período | Tipo | Evento | n | Sessões | Valor |
|---|---|---|---|---|---|
| 01–20 out | Sem tipo (sem metadados do site) | Concluído, pago | 8 | 8 | €6.219 |
| 01–20 out | Signature (site) | Concluído, pago | 4 | 4 (3 clientes) | €2.072 |
| 01–20 out | Signature | Concluído, por pagar | 5 | 5 (2 clientes) | — |
| 01–20 out | Signature | Pagamento diferido falhado | 5 | 5 (2 clientes) | — |
| 01–20 out | Signature / sem tipo | Expirado | 15 / 12 | — | — |
| 21 out–05 nov | Signature | Concluído, por pagar | 2 | 2 clientes | €732 |
| 21 out–05 nov | Signature | Pagamento diferido falhado | 3 | 1 cliente | €1.042 |
| 21 out–05 nov | Signature / sem tipo | Expirado | 3 / 5 | — | €1.258 / €12.150 |

**As 12 pagas.** Só 4 vieram do checkout do site. As outras 8 não têm metadados do site, o que é compatível com links de pagamento ou faturas criados à mão (houve 10 `payment_link.created` e eventos de fatura). As "10 reservas" de antes vinham da tabela de reservas e incluíam entradas manuais. Conversões do website: 4 pagas entre 1 e 20 out e 0 depois.

**As 15 "falhas".** Os 7 "concluídos por pagar" e os 8 "pagamento diferido falhado" são todos de sessões do site (Signature, Studio e Tailor). Nenhum foi pago depois. Houve 8 `payment_intent.processing`, sinal de métodos com pagamento diferido (por exemplo Klarna, Bancontact ou débito). Não são recusas de cartão. Estão concentrados em poucos clientes (cerca de 1–2 por período), que tentaram várias vezes.

**Após 20 out.** Os 13 eventos correspondem a cerca de 4–6 pessoas distintas, não a 13 pessoas. Dos expirados "sem tipo", 5 somam €12.150. Não vêm do checkout do site; são provavelmente links ou orçamentos de valor alto, a confirmar.

**Sinais na conta Stripe a verificar (sem conclusão).** Desde 1 out há 3 `payout.failed`, 3 disputas abertas com fundos retirados, 1 `account.application.deauthorized` e muitos `capability.updated`. Nada disto prova bloqueio de pagamentos, mas convém confirmar que nenhum método de pagamento ficou limitado.

## (c) Verificações só de leitura que posso fazer agora
1. Ver, em cada sessão "por pagar" ou "diferido falhado", qual método de pagamento foi usado. Fica em `charge.failed` / `payment_intent.payment_failed`, contado por código de falha, sem dados pessoais.
2. Ver o estado das capacidades da conta Stripe (cartões, Klarna, etc.) e o que mudou depois de 20/10, a partir dos eventos `capability.updated` e `account.updated` (só tipo e estado).
3. Comparar visitantes por dia na tabela do site à volta de 26/10, para isolar o efeito da mudança de método da Lovable.
4. Calcular a taxa de hits com user-agent ou padrão de bot, se estiver registado. Se não estiver, digo que não dá para medir.
5. No código, ver a lista de métodos de pagamento ativos no checkout embebido e as mudanças recentes nesse ficheiro.
6. Contar por semana as tentativas de checkout no site (sessões criadas por fluxo) contra as visitas a páginas de tour, para obter uma taxa de passagem real.
7. Rever no código, sem concluir nada, a possível duplicação de eventos GA4. Só o GTM Preview, feito por ti, a pode provar.

## (d) Ação mínima seguinte
Correr as verificações 1, 2, 3 e 6, todas só de leitura, e devolver uma tabela curta. Nada é alterado.

A decisão sobre o que corrigir (métodos de pagamento diferido, conta Stripe, aquisição ou medição) fica para depois desses números e da tua aprovação.

## Correções metodológicas aceites
- Sem consentimento de analytics, nenhuma mudança no arranque do GTM faz aparecer UTMs no GA4. O consentimento mantém-se como está.
- A duplicação de eventos continua a ser só uma hipótese, até ser verificada no GTM Preview.
- Não vou estimar créditos por número de mensagens. Separo os testes só de leitura das alterações de código.
- Web vitals: além de uma amostra mínima, é preciso separar mobile e desktop, ver o período e confirmar que a métrica é estável antes de agir.
- Não tenho permissão de escrita em modo plano, por isso esta tarefa ainda não foi registada no `roadmap.md`. Fica registada quando aprovares.
