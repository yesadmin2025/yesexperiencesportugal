# Auditoria e otimização Core Web Vitals (mobile-first)

O relatório AMP na Search Console é apenas informativo — AMP está descontinuado como fator de ranking desde 2021. O que o Google usa hoje são **Core Web Vitals** (LCP, CLS, INP). Vamos focar aí, sem tocar no design nem no Studio.

## Rotas prioritárias

Rotas que recebem tráfego orgânico e conversões:

1. `/` (homepage — hero vídeo)
2. `/experiences` (grid de tours)
3. `/tours/:tourId` (página de produto — LCP crítico)
4. `/tours/:tourId/tailor` (checkout entry)
5. `/portugal-travel-designer`

## Fase 1 — Medição (baseline)

- Script Playwright em `/tmp/browser/cwv/` que abre cada rota em viewport mobile (393×852, throttling 4G lento) e mede via `PerformanceObserver`:
  - **LCP** (elemento + tempo)
  - **CLS** (com layout shift attribution)
  - **INP** simulado (click em CTA primário)
  - Peso total transferido + número de requests
  - JS bloqueante no critical path
- Guardar resultados em `docs/cwv-baseline.json` (por rota, com screenshot do elemento LCP).
- Targets: LCP < 2.5s, CLS < 0.1, INP < 200ms, JS inicial < 200KB gzip.

## Fase 2 — Correções por categoria

Aplicar apenas o que a medição justificar. Categorias prováveis:

### LCP
- Adicionar `<link rel="preload" as="image" fetchpriority="high">` no `head()` de cada rota para a imagem hero (usar `responsive-image.ts` para variante AVIF certa).
- Homepage: garantir que o poster do vídeo hero é o LCP element (não o vídeo em si) e é servido em AVIF < 80KB.
- `/tours/:tourId`: preload da capa Viator resolvida no loader.
- Remover qualquer `loading="lazy"` acidental no LCP.

### CLS
- Auditar todas as `<img>` sem `width/height` ou `aspect-ratio` — ripgrep pelo padrão e corrigir via `CinematicEditorialImage` que já tem containers com ratio fixo.
- Reservar altura para o `CookieConsent` banner (aparece após hidration → shift na primeira visita).
- Reservar altura para `PriceCurrencyChip` (evitar salto quando o `useCurrency` hidrata).

### INP
- Auditar handlers pesados nos CTAs de reserva (Studio, tailor) — envolver setState em `startTransition` quando aplicável.
- Diferir mount de componentes não-críticos below-the-fold (`SignatureRouteMap` já é lazy; verificar `GuestMomentsStrip`, `AmbientLandscapeReveal`).

### JS / rede
- `bun run build` + analisar `dist/**/*.js`; identificar chunks > 100KB na rota inicial.
- Confirmar que Leaflet, Mapbox, editor Studio, admin routes estão em chunks separados e não entram no bundle da homepage.
- Verificar se GTM/GA4 carregam com `strategy=afterInteractive` (não bloquear LCP).

### Fontes
- Confirmar `font-display: swap` em Fraunces + Inter.
- Preload apenas dos weights realmente usados above-the-fold (Fraunces 400/500, Inter 400).

## Fase 3 — Verificação

- Re-correr o script de baseline → gerar `docs/cwv-after.json`.
- Comparar delta por rota; falhar se alguma métrica regrediu.
- Adicionar `e2e/core-web-vitals.spec.ts` (Playwright) que corre as 5 rotas prioritárias e falha se LCP > 2.5s ou CLS > 0.1 — corre no CI.

## Fora do âmbito

- Zero mudanças visuais, tipográficas ou de motion.
- Zero AMP.
- Zero alterações ao Studio, Builder, checkout Stripe, Mapbox.
- Zero mudanças ao design system, cores, spacing, componentes.

## Entregáveis

- `docs/cwv-baseline.json` + `docs/cwv-after.json`
- Preloads e correções cirúrgicas nos ficheiros afetados
- `e2e/core-web-vitals.spec.ts` no CI
- Resumo curto: métrica antes / depois por rota
