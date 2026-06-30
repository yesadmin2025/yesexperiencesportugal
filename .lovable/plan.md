
Boa — se o GBP e o Tripadvisor já apontam para `yesexperiencesportugal.com`, o sinal externo está corrigido. O que falta agora é forçar o Google a reconciliar isto. Hoje o `.pt` ainda responde com um 302 para `tututu.com` (controlado por DNS/WordPress antigo, fora do nosso projeto), por isso o nosso 410 nunca é entregue ao Googlebot — e enquanto isso não mudar, o Google continua a ver o `.pt` como "vivo mas estranho" e demora a transferir autoridade.

Proponho 4 ações, sem mexer em código de produto, Stripe, Bókun ou preços.

## 1. Decidir o destino do domínio `.pt` (precisa de ti)

Há três caminhos possíveis — só um resolve mesmo:

- **A. Ligar `yesexperiences.pt` a este projeto Lovable** (recomendado).
  Apontas o A record do `.pt` para `185.158.133.1` e adicionas o domínio em Settings → Domains. A partir daí o nosso middleware serve **HTTP 410 Gone + noindex** em todo o `.pt`, que é o sinal mais limpo para o Google desindexar.
- **B. Desligar completamente o `.pt`** (remover o registo no registrar, ou apagar todos os DNS records). O Google vai acabar por desindexar por DNS failure, mas demora mais semanas.
- **C. Não fazer nada.** O `.pt` continua a redirecionar para `tututu.com` e o Google continua confuso. Não recomendo.

Preciso que confirmes qual queres (A, B ou C) antes de avançar.

## 2. Limpar quaisquer referências residuais ao `.pt` no código

Auditoria rápida a:
- `src/lib/jsonld.ts`, `src/lib/seo.ts`, canonical tags, sitemap, robots
- emails, footer, press kit, About, Local Stories
- redirects e middleware

Garantir que nada no site novo menciona, linka ou faz canonical para `yesexperiences.pt`. Hoje já está quase limpo, mas faço um sweep final.

## 3. Reforçar sinais de canonicalização no `.com`

- Confirmar `<link rel="canonical">` absoluto em todas as rotas indexáveis
- `og:url` e `twitter:url` absolutos no `.com`
- `sitemap.xml` só com URLs `.com`
- `robots.txt` no `.com` aponta apenas o sitemap do `.com`
- JSON-LD (`LocalBusiness`, `Organization`, `WebSite`) com `url` e `sameAs` exclusivamente no `.com` (incluindo o link do novo GBP que já corrigiste)

## 4. Forçar reindexação no Google Search Console

Via API (já temos ligação ativa):
- Re-submeter `sitemap.xml` do `.com`
- URL Inspection + Request Indexing para: `/`, `/signature`, `/studio`, `/travel-designer`, `/about`, `/reviews`, e as 3-5 landing pages SEO de maior intenção
- Se confirmares opção **A** acima, adicionar também a propriedade `yesexperiences.pt` no GSC e pedir **Removals** (URL removal tool) para o domínio inteiro — só funciona se formos donos verificados da propriedade no GSC, o que requer A.

## O que NÃO faço neste passo
- Não mexo em Stripe, Bókun, preços, builder, Studio
- Não rebuild de páginas
- Não altero copy de produto
- Não toco em emails transacionais

## Decisão que preciso de ti
1. Caminho do `.pt`: **A** (ligar ao Lovable e servir 410), **B** (desligar DNS), ou **C** (deixar como está)?
2. Tens acesso ao registrar do `.pt` para mudar o A record / remover DNS, se for A ou B?

Assim que responderes, executo 2, 3 e 4 numa só passagem e mostro-te o resultado das inspections do GSC.
