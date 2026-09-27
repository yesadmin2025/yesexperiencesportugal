# Reforço de conteúdo SEO + artigos de autoridade (público americano)

## Objetivo
Subir posições nas pesquisas genéricas dos EUA onde estamos entre 16–51 ("wine tours lisbon", "day trips from lisbon", "alentejo wine tours", "best wine tasting lisbon", "private tours portugal"), reforçando páginas existentes e acrescentando artigos de autoridade — sem inventar factos, preços, parceiros ou itinerários.

## Parte 1 — Reforço das páginas existentes (sem novas URLs)
Melhorar conteúdo nas páginas que já têm impressões mas posições fracas, mantendo títulos/meta aprovados:

1. **best-wine-tours-lisbon** (pos. 16 EUA) — expandir a secção de comparação com critérios concretos (duração, grupo privado vs partilhado, o que está incluído), ligando às Signature reais.
2. **wine-tours-lisbon / lisbon-wine-tours** — verificar canibalização entre as duas; consolidar sinais (internal links, copy distinta por intenção).
3. **day-trips-from-lisbon** — reforçar intro e secções por região com links para os guias Local Stories existentes.
4. **alentejo-wine-tour-from-lisbon / private-tours-alentejo-evora** (pos. 16/24) — reforçar copy editorial com factos reais dos tours Évora & Alentejo e Roman Heritage.
5. **private-tours-portugal** (hub nacional) — reforçar como página-pilar: qualquer duração, qualquer origem em Portugal, links para regiões.

Regras: só factos já publicados nos tours/guia; copy em inglês conciso (2–3 frases por bloco); sem novos superlativos nem comparações com concorrentes.

## Parte 2 — Novos artigos de autoridade (Local Stories)
Adicionar 3 artigos novos em `local-stories-articles.ts` + rota automática, com title/meta/H1 únicos, FAQ schema onde fizer sentido, e links para Signature relevantes:

1. **"How Many Days in Portugal? An Honest Itinerary Guide"** — responde a "portugal itinerary" (~1.300/mês EUA) e "portugal itinerary 10 days" (~880/mês); liga a Travel Designer e ao itinerário 10-day existente.
2. **"Private Tours in Portugal: What They Actually Cost"** — responde a "private tours portugal" (~170/mês) com transparência de preços reais (faixas das Signature publicadas); liga a private-tours-portugal e Signature.
3. **"Planning a Proposal in Portugal: Places, Timing, Privacy"** — reforça "portugal proposal" (pos. 3 PT) e "cabo da roca proposal" (pos. 9 EUA); liga a Proposals/Moments.

Cada artigo: slug novo, entrada no sitemap, og tags, BreadcrumbList, sem conteúdo duplicado dos guias existentes.

## Parte 3 — Verificação
- Testes SEO existentes + novos testes para os 3 artigos (title/meta/H1 únicos, sitemap, schema).
- Build + Vitest completos.
- Preview apenas — **não publicar sem pedido explícito**.

## Fora de scope
Preços, booking/Stripe, factos dos tours, rotas canónicas, hreflang, hero copy, paleta, motion locks.
