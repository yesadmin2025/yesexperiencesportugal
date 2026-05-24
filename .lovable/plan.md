## Objectivo

Adicionar página `/journal` (histórias reais) e adoptar 4 padrões do site alternativo no Studio — sem violar guardrails (sem inventar factos, stock, superlativos, ou tornar o Studio num configurador).

---

## 1. `/journal` — Local Stories (página editorial)

**Rota nova:** `src/routes/journal.tsx` (lista) + `src/routes/journal.$slug.tsx` (post).

**Arquitectura:**
- Tabela Supabase `journal_posts` (slug, title, excerpt, body markdown, hero_image, region, signature_slug FK opcional, author_name, published_at, status). RLS: leitura pública só `status='published'`, escrita restrita.
- Loader via `createServerFn` + TanStack Query (`ensureQueryData` + `useSuspenseQuery`).
- `head()` próprio por post (title, description, og:image = hero do post).
- Card de "ligar a uma Signature" no fim de cada post (quando `signature_slug` definido) → CTA para a página da Signature real.

**Visual:** layout editorial em coluna única, Montserrat headlines + Georgia italic para pull-quotes + Inter body. Hero 16:9 real. Sem stock — começa **vazia com estado "Em breve"** até teres conteúdo a publicar. Eu não invento posts.

**SEO:** sitemap actualizado, JSON-LD `Article` por post.

**Nav:** entrada discreta no footer (não na nav principal, para não poluir até teres ≥3 posts).

---

## 2. Two-pace entry no Studio

**Ficheiro:** `src/components/builder/v3/EntryScreen.tsx`.

Adiciona terceiro CTA ghost: **"Mostra-me em 60 segundos"**. Quando escolhido, define um `pace='fast'` no contexto do Studio que:
- baixa threshold de revelação (`revealConfidence` 0.6 → 0.4),
- reduz duração de motion para 60%,
- mostra `EmergingThemes` e `PriceWhisper` mais cedo.

Respeita escolha do utilizador; não é imposição. Estado guardado em sessionStorage.

---

## 3. Lift-the-curtain no LivingMap

**Ficheiro:** `src/components/builder/v3/LivingMap.tsx` (+ `ItineraryRibbon.tsx`).

Pega subtil de 24px (linha gold-soft + chevron) na base do mapa. Drag/tap expande o `ItineraryRibbon` em overlay, sem nav persistente, sem step counters. Fecha por swipe-down ou tap fora. Respeita `prefers-reduced-motion` (sem drag, só toggle).

**Não vira configurador:** sem números de passo, sem "X of Y".

---

## 4. Smart Recommendation (Add in 1-Click) — **só dados Signature reais**

**Ficheiro novo:** `src/components/builder/v3/SmartSuggestion.tsx`.

Aparece **uma só vez** por sessão, quando `revealConfidence ≥ 0.5` e há match claro entre `sceneWeighting` e um upgrade **existente** numa Signature real (ex.: "tasting + scenic lunch" da Arrábida). 

**Regra dura:** o upgrade é puxado de `src/data/signature-upgrades.ts` (mapa real Signature→upgrade), nunca gerado. Se não houver match real, componente não renderiza. Sem "Most couples add" (invenção estatística) — copy factual: *"Inside the Arrábida day, you can add: …"*.

CTA "Add" liga ao tailored flow real da Signature correspondente.

---

## 5. Estimated Experience Investment — bloco no reveal

**Ficheiro:** `src/components/builder/v3/RevealInvestment.tsx` (substitui `PriceWhisper` **só na fase convergence**; PriceWhisper continua como sussurro intermédio).

Mostra na convergência final:
- **Indicative range €X–€Y / guest** (não número fechado),
- **Party total** (range × guests),
- **What this includes** (3 bullets factuais: private host, vehicle logistics, selected tastings),
- **What it doesn't include** (1 linha: gratuities, optional extras),
- Nota: *"Final price confirmed at booking based on date and partner availability."*

**Sem** "Quality Score 92%", **sem** "Premium Class", **sem** "Total Experience Value" inflacionado. Range derivado do mapa Signature→price-range real (`src/data/signature-pricing.ts`).

---

## Ordem de execução (proponho fazer por fases, paro entre cada)

1. **Fase A** — `/journal` (migration + rotas + estado vazio + footer link). Pausa para review.
2. **Fase B** — Two-pace entry + Lift-the-curtain (só UI no Studio, sem dados novos). Pausa.
3. **Fase C** — Smart Recommendation + RevealInvestment (requerem ficheiros de dados reais `signature-upgrades.ts` e `signature-pricing.ts` que tens de validar antes de eu publicar).

## Decisões que preciso de ti antes da Fase C

- Confirmas que posso criar os ficheiros `signature-upgrades.ts` e `signature-pricing.ts` a partir das Signatures actuais (Arrábida, Sintra, etc.) e tu revês antes de irem live? Ou preferes preencher tu?
- O `/journal` fica como rota com estado "Em breve" até teres ≥1 post, ou só crio a infra e adiciono a rota quando tiveres o primeiro post escrito?

Se concordas com tudo, começo pela Fase A.