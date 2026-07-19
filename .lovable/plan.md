# Motion v3 — Editorial Cinematic + Performance Budget

Objetivo: passar de reveals "contidos" para um sistema com **storytelling gráfico** (máscaras, split-text, parallax controlado, chapter leads, gold rule draw-in) mantendo LCP ≤ 2.5s, CLS < 0.05, INP < 200ms em mobile mid-tier.

## 1. Performance budget (guardrails, medidos antes e depois)

- LCP ≤ 2.5s / CLS < 0.05 / INP < 200ms (mobile, Moto G class, 4G throttled).
- JS por rota ≤ 180KB gzipped incremental.
- Nenhuma animação toca `top/left/width/height` — só `transform` + `opacity` + `filter` (composited).
- `will-change` só durante a animação, removido no `onEnd`.
- Todas as animações passam por `useHydrated()` + `IntersectionObserver` (rootMargin 15%), gated por `prefers-reduced-motion`.
- Imagens hero mantêm `fetchpriority="high"` + `<link rel="preload">` no route `head()`. Blur-in aplicado só depois de `decode()` resolver para não empurrar LCP.
- Novo script `scripts/check-motion-budget.mjs` corre no `prebuild`: falha se algum ficheiro adicionar `transition: all`, `animation: *` sobre propriedades não-composited, ou `will-change` permanente.

## 2. Motion primitives novos (src/components/motion/)

Todos SSR-safe, sem layout shift, com fallback estático se JS falhar.

- **`<MaskReveal>`** — clip-path inset 100%→0 diagonal (12deg), 720ms, cubic-bezier(.2,.7,.1,1). Usado em heroes e imagens editoriais chave. Substitui blur+translate genérico.
- **`<SplitLines>`** — divide h1/h2 em linhas via CSS `background-clip` + `translateY(110%)→0` stagger 60ms. Sem re-flow (mede uma vez). Aplicado só a headings de secção principais (1-2 por página).
- **`<ChapterLead>`** — eyebrow + gold rule que "desenha" (scaleX 0→1, transform-origin left, 640ms) + título com SplitLines. Marca início de secção editorial.
- **`<ParallaxLayer amount="sm|md">`** — translateY via `requestAnimationFrame` gated a IO, cap ±24px, off em mobile <390px e reduced-motion. Só em hero e 1 secção âncora por rota.
- **`<StickyChapter>`** — para Signature/Local Stories: título fica sticky durante scroll do bloco e faz cross-fade entre capítulos (opacity + 8px translate).
- **`<MagneticCTA>`** — botão primário atrai cursor ±6px em desktop, sheen dourado em hover. No-op mobile.
- **`<CountUp>`** — para números de trust (reviews, anos, guests). IO-gated, 900ms.

## 3. Storytelling por família de rota

### Home (`.home-energy` scope)
- Hero: MaskReveal na imagem + SplitLines no H1 + ChapterLead na secção seguinte.
- Occasions row: cards entram em stagger diagonal (não vertical) 80ms.
- CTA final: MagneticCTA + sheen já existente reforçada (opacity .35→.6).

### Signature index + tour detail
- Hero MaskReveal + SplitLines.
- Cada "capítulo" do dia usa ChapterLead + StickyChapter (o número do stop fica sticky enquanto scrolla).
- Mapa: pins entram um a um (60ms stagger) quando o mapa entra em viewport.
- Trust row: CountUp nos ratings/anos.

### Local Stories (article)
- Cover: MaskReveal + eyebrow draw-in.
- ReadingProgress mantém-se (já 3px gold).
- Primeiro parágrafo: drop-cap Fraunces 4.5rem, float left, fade+scale.
- Imagens inline: MaskReveal com direção alternada.

### Editorial (About, Corporate, Moments, Press, Reviews, Travel Designer)
- ChapterLead a abrir cada secção major.
- Uma imagem hero por página com ParallaxLayer amount="sm".
- Restante mantém `.reveal` atual (já em 20px/520ms).

### Studio V3
- **Não tocar.** Continua excluído por decisão prévia (studio-philosophy).

### Booking / Checkout / Auth / Admin
- Excluídos. Apenas RouteFade. Zero storytelling para não distrair de conversão.

## 4. Tokens & CSS

Adicionar em `src/styles.css`:

```
--motion-ease-editorial: cubic-bezier(.2,.7,.1,1);
--motion-dur-mask: 720ms;
--motion-dur-split: 560ms;
--motion-dur-rule: 640ms;
--motion-stagger: 60ms;
```

Refinar `.reveal` para 24px/560ms (subida ligeira do v2 atual) e manter blur-in.

## 5. Verificação (obrigatória antes de marcar done)

1. `bun run build` limpo + `check-motion-budget.mjs` verde.
2. Lighthouse mobile em `/`, `/experiences`, `/tours/:id`, `/local-stories/:slug`, `/about` — anexar métricas ao relatório.
3. Playwright: screenshot antes/depois em 393×706 de cada rota-âncora, gravando `performance.now()` do primeiro `is-visible`.
4. Teste `prefers-reduced-motion: reduce` — nenhum keyframe corre, conteúdo visível estático.
5. Regression tests atualizados (`animation-contract-regression.test.ts`) com os novos tokens.

## 6. Rollout em 4 batches (implementação após aprovação)

- **B1 — Foundation:** tokens, primitives novos, budget script, testes. Sem alteração visual ainda.
- **B2 — Home + Signature index:** MaskReveal hero, SplitLines H1, ChapterLead nas duas rotas mais visitadas. Medir LCP/INP.
- **B3 — Tour detail + Local Stories:** StickyChapter, drop-cap, mask alternada, pins staggered.
- **B4 — Editorial pages + polish:** ChapterLead + ParallaxLayer sm, CountUp em trust rows, MagneticCTA no CTA global.

## Fora de scope

- Studio V3 (excluído por design).
- Booking/Checkout (conversão primeiro).
- Bibliotecas pesadas (GSAP, Lenis, Locomotive) — tudo custom com IO + rAF para não estourar budget JS.
- Vídeo de fundo, WebGL, canvas.

## Deliverable final

Relatório em `docs/motion-v3-report.md` com métricas Lighthouse antes/depois por rota + checklist de budget verde.
