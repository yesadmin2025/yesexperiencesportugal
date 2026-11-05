# Diagnóstico e plano mínimo — yesexperiencesportugal.com (só proposta, nada alterado)

Base: os teus dados GSC/GA4/SiteGuru e uma leitura do código, sem fazer alterações. Não repeti a auditoria. Nada foi editado nem publicado.

## Leitura dos números (o que provam e o que não provam)
- As impressões subiram 49% e os cliques desceram 19%. A descida do CTR (de 2,45% para 1,33%) explica-se sobretudo pelas impressões novas com poucos cliques (/regions-of-portugal ~1.883). Isto é diluição, não uma penalização. A última semana está estável (29 vs 27).
- Os cliques mobile desceram de 104 para 68 e os de desktop ficaram iguais. A descida orgânica concentra-se no mobile, mas ainda não sabemos se vem da posição ou de páginas/queries específicas. Falta o corte "página × dispositivo" no GSC.
- As páginas comerciais têm volumes de 0 a 5 cliques. São demasiado pequenos para tirar conclusões sobre título ou canibalização.
- As reservas pagas no site caíram (10 entre 1 e 20 out, 0 depois), mas as sessões não caíram. O problema está no funil ou na medição, não na aquisição.

## (A) Tabela de problemas

| # | Problema | Evidência específica | Estado | Impacto provável | Solução mínima | Ficheiros | Risco | Esforço | Prio |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Eventos possivelmente contados a dobrar | `__root.tsx` define sempre um `window.gtag` (stub do Consent Mode). Por isso, em `analytics.ts:117-127`, todo o evento que não é page_view é enviado duas vezes: `dataLayer.push({event})` e também `gtag('event')`. A deduplicação só existe para page_view. | Risco confirmado no código; a duplicação real é hipótese | checkout_started e checkout_completed podem estar inflacionados no GA4, e o funil fica falso | Confirmar no GTM Preview. Se duplicar, enviar os eventos personalizados por um único canal (dataLayer) | `src/lib/analytics.ts` | Baixo | 1 msg | P0 (testar primeiro) |
| 2 | 40% das sessões em "Unassigned" | O GTM só arranca após interação, idle ou 4s. O page_view inicial depende do GTM e o SPA page_view está desligado (`SITE_SENDS_SPA_PAGE_VIEW=false`, depende do enhanced measurement). Com consentimento negado, os pings sem cookie perdem a fonte. Quem sai antes do boot fica sem `session_start` com origem. | Hipótese forte | A atribuição Ads/orgânico fica cega para 40% | Testar visita com UTM, recusar e aceitar o consentimento e sair em menos de 4s. Se confirmado, baixar o fallback do boot (4s → ~1,5s) ou arrancar no `pagehide` já existente. Não mexer no consentimento | `__root.tsx` (script do boot) | Baixo; pode afetar TBT, que é medido | 1 msg | P0 |
| 3 | `checkout_started` disparado antes de a sessão Stripe existir | `SimpleBookingForm.tsx:403` dispara begin_checkout e checkout_started antes de `invokeSignatureCheckout`. O mesmo padrão existe em `tailor.tsx:1118` | Confirmado no código | O funil "iniciou checkout" fica inflacionado e as falhas de criação ficam invisíveis | Disparar só depois de o `clientSecret` chegar. Adicionar `checkout_session_failed` quando há erro. Não mexer na lógica de pagamento | `SimpleBookingForm.tsx`, `tours_.$tourId.tailor.tsx` | Baixo | 1 msg | P1 |
| 4 | Abandono no ecrã do cartão | Dados da BD já recolhidos: 311 sessões Stripe expiradas contra 8 pagas desde 1 out. Atenção: cada abertura cria uma sessão, por isso repetições do mesmo cliente inflacionam o número | Parcialmente confirmado, o rácio exato é hipótese | Principal ponto de perda | Medir primeiro clientes únicos (email ou telefone) por sessão expirada. Só depois decidir. A ponte WhatsApp já está publicada e não é para refazer | só leitura da BD | — | 0,5 msg | P0 (medição) |
| 5 | Performance lab de /experiences (61), /pt/experiences (60), /corporate (70) | Score SiteGuru de laboratório. Os dados reais (CWV) ainda não foram consultados | Hipótese | Moderado no mobile | Ler os web vitals reais (p75 de LCP/INP/CLS por página, com pelo menos 30 leituras). Agir só se o LCP p75 for superior a 2,5s: prioridade ao primeiro cartão e lazy nas restantes imagens, sem mexer nas animações aprovadas | `src/routes/experiences*.tsx` (após confirmar) | Baixo | 1–2 msg | P1 |
| 6 | /regions-of-portugal com muitas impressões e poucos cliques | ~1.883 impressões nos dados GSC | Confirmado (dado) | Dilui o CTR; oportunidade de leads | Ver as queries da página. Só se a intenção for comercial: rever o título/meta e acrescentar ligações claras para Signature, Studio e Travel Designer | rota de regiões e mapa SEO | Baixo | 1 msg | P2 |
| 7 | "travel designer portugal": posição 5,5 e 0 cliques | Duas URLs aparecem, a editorial e a comercial | Canibalização não provada | Baixo volume | Confirmar no GSC qual URL recebe as impressões. Garantir que a editorial liga em destaque para /portugal-travel-designer. Sem mudanças de título até haver volume | guia em `local-stories-articles.ts` | Baixo | 0,5 msg | P2 |
| 8 | Último rastreio de /experiences em julho | Indicado pelo SiteGuru | Hipótese (pode ser só a URL inspecionada) | Baixo, porque a página está indexada | Fazer a Inspeção de URL no GSC, ver o lastmod no sitemap e pedir reindexação se necessário | — | Nulo | 0,2 msg | P2 |
| 9 | Redirects do domínio antigo | Não verificado | Hipótese | Pode haver perda de link equity | Lista de URLs antigas, `curl -I` página a página, e confirmar 301 para o destino equivalente | só leitura | Nulo | 0,5 msg | P2 |
| 10 | Deploys GitHub/Vercel | Há workflows de CI em `.github/workflows`, mas não há configuração Vercel no projeto. A produção é publicada pelo Lovable | Confirmado: a produção não depende do Vercel | Nenhum, salvo se existir um projeto Vercel paralelo no mesmo domínio | Confirmar o DNS do domínio e ver se algum workflow falhado bloqueia algo (só CI) | — | Nulo | 0,2 msg | P2 |

## (B) Fases (intervenções mínimas, sem redesign)
1. **Fase 0 — Provar, sem alterar código (~1–2 mensagens):** testes das secções C e D para os problemas 1, 2, 4, 5, 8, 9 e 10. O resultado decide o que avança.
2. **Fase 1 — Medição (~1–2 mensagens):** só o que a Fase 0 confirmar nos problemas 1, 2 e 3. Sem mudar UI, preços nem Stripe.
3. **Fase 2 — Conversão e performance (~1–2 mensagens):** o problema 5, se os CWV reais o justificarem, e uma decisão sobre o problema 4 com números de clientes únicos.
4. **Fase 3 — SEO (~1 mensagem):** problemas 6 e 7, só com dados de queries por página.

Total estimado: entre 4 e 7 mensagens de construção. A publicação só acontece se a pedires.

## (C) Testes antes/depois e rollback
- **Medição:** GTM Preview e GA4 DebugView numa reserva de teste (pré-visualização, modo de teste do Stripe). Antes: contar quantos hits recebe cada `checkout_started` e `purchase`. Depois: tem de ser exatamente 1.
- **Atribuição:** visita com `?utm_source=test` e saída aos 2s, com consentimento recusado e depois aceite. Depois da correção, a sessão deve aparecer com origem e não como Unassigned.
- **Funil:** forçar um erro de criação de sessão. Depois da correção, não deve haver `checkout_started` e deve aparecer `checkout_session_failed`.
- **Regressão:** testes existentes de checkout, analytics e SEO, mais o percurso mobile a 393px até ao Stripe (€366, Arrábida).
- **Performance:** p75 real de LCP/INP/CLS antes, e de novo 7 dias depois.
- **Negócio:** reservas pagas (`cs_live_`) e checkouts expiradas por cliente único, 14 dias antes e depois.
- **Rollback:** cada fase é uma alteração pequena e isolada, e pode ser revertida pelo histórico do Lovable. As flags de analytics voltam ao valor anterior numa linha.

## (D) O que falta testar para confirmar as hipóteses
1. GTM Preview: saber se o contentor tem uma tag GA4 Event a escutar eventos personalizados do dataLayer e se a Google tag também processa os `gtag('event')`. Esta é a prova do problema 1.
2. GA4: verificar se o enhanced measurement "history changes" está ligado (o flag SPA depende disso) e ver o relatório Unassigned por página de entrada.
3. GSC: cliques e posição mobile por página, e queries de /regions-of-portugal e de "travel designer portugal" por URL.
4. Web vitals reais por página (podem ser lidos daqui).
5. BD: checkouts expiradas agrupadas por cliente único e por data, separando live e teste (podem ser lidos daqui).
6. Lista das URLs do domínio antigo, para testar os redirects.
7. Confirmar se existe algum projeto Vercel associado ao domínio. Os pontos 1, 2 e 7 precisam de acesso teu ao GTM/GA4/Vercel ou de capturas.

## Detalhes técnicos
- Stub do Consent Mode em `__root.tsx`: `window.gtag=window.gtag||gtag`. Por isso, a condição `typeof w.gtag === "function"` em `analytics.ts` é sempre verdadeira.
- `booking-confirmed.tsx` envia `gaPurchase` (ecommerce no dataLayer) e também `checkout_completed` por `trackEvent` (dois canais). Se o GTM mapear ambos para conversões, há risco de conversão dupla no Google Ads.
- Não serão tocados: preços, regras de reserva, Stripe, locks de marca/motion/conversão, títulos aprovados, arquitetura de rotas.
