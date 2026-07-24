## Objetivo
Cobrir a query popular **"best wine tours lisbon"** (e variações "best wine tour lisbon", "best wine tasting lisbon") sem canibalizar as metas já otimizadas para "private wine tour lisbon" / "wine tasting near lisbon" / "alentejo wine tour from lisbon".

## Estratégia
Em vez de reescrever metas de Signatures individuais (que já estão a competir por queries mais específicas de maior intenção comercial), criar **um Local Story hub** dedicado a "best wine tours from Lisbon". Este formato ranqueia melhor para queries "best X" — que são comparativas/editoriais, não transacionais — e serve como página de entrada que distribui tráfego para as Signatures.

## Alterações

### 1. Novo Local Story: "Best Wine Tours from Lisbon"
Ficheiro: `src/content/local-stories-articles.ts`

- Slug: `best-wine-tours-from-lisbon`
- Title (H1): "The Best Wine Tours from Lisbon"
- SEO title (≤60): "Best Wine Tours from Lisbon — Private Day Trips 2026"
- SEO description (≤160): inclui "best wine tours from Lisbon", "private", "Arrábida", "Alentejo", "small-group"
- Conteúdo editorial curto (voz YES, sem inventar):
  - Intro: porque Lisboa é base ideal (proximidade a 3 regiões vinícolas reais: Setúbal/Arrábida, Alentejo, Colares)
  - 4 secções, uma por Signature real já existente, cada uma a ligar para a página da tour:
    - Arrábida All-Inclusive Day
    - Azeitão Cheese & Wine Day
    - Évora & Alentejo Wine Tour
    - Roman Heritage Wine Tour
  - Cada secção: 2–3 frases descritivas (baseadas no que já existe nas Signatures — sem inventar stops/inclusions)
  - Fecho: convite para Studio/Tailored
- JSON-LD: `Article` + `BreadcrumbList` (já usado no template dos Local Stories)

### 2. Redirect canónico
Ficheiro: `src/routes/best-wine-tours-lisbon.tsx` (novo)
- 301 → `/local-stories/best-wine-tours-from-lisbon`
- Mesmo padrão dos redirects já criados em Phase 2 (ex.: `wine-tasting-near-lisbon`, `arrabida-wine-tour`)

### 3. Sitemap
Ficheiro: `src/routes/sitemap[.]xml.ts`
- Adicionar `/local-stories/best-wine-tours-from-lisbon` (destino canónico, HTTP 200)
- NÃO adicionar `/best-wine-tours-lisbon` (é 301 — sitemap só destinos finais)

### 4. Internal linking
Ficheiro: `src/routes/local-stories.tsx` (ou index dos artigos, dependendo da estrutura actual)
- O novo artigo aparece automaticamente se a listagem lê de `local-stories-articles.ts` — verificar durante build.

## Fora de escopo
- Não mexer nas metas das 4 Signatures — já cobrem queries de maior intenção transacional.
- Não criar página "best wine tours portugal" (query dominada por Douro, produto que não temos).
- Não pedir Request Indexing por API (Google já bloqueou esse endpoint) — utilizador faz manualmente no Search Console após deploy.

## Detalhes técnicos
- Todo o conteúdo em US-EN (travelers, favorites, color) — consistente com pivot americano.
- Reutilizar o template/render existente dos Local Stories — sem novos componentes.
- Sem imagens novas geradas — reutilizar galleries das Signatures referenciadas.
