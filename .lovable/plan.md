# Plano de Otimização de Performance (sem alterar identidade/animações/vídeo)

Objetivo: LCP ≤ 2,5 s · INP < 200 ms · CLS < 0,1 em mobile e desktop, mantendo vídeo hero, cinematografia, tipografia Fraunces/Inter, paleta e motion system (com `prefers-reduced-motion` respeitado).

## 1. Baseline (medir antes de tocar)

Correr Lighthouse CI (já configurado em `.lighthouserc.json` + `.lighthouserc.mobile.json`) em:
- `/` (home)
- `/experiences`
- `/tours/$tourId` (uma Signature representativa, ex. Arrábida)
- `/studio-v3`
- `/portugal-travel-designer`
- `/about`

Registar por página, mobile e desktop, num relatório em `docs/perf/baseline-2026-07.md`:
- LCP, INP (proxy: TBT + max-potential-FID), CLS
- Peso total transferido, JS total, CSS total, imagens totais, vídeo
- Elemento LCP identificado (screenshot + selector)
- Long tasks > 50 ms no boot
- Fontes carregadas vs. usadas (via coverage)

Sem este baseline não avanço para as correções — é o "antes" da entrega antes/depois.

## 2. Quick wins (ordem de execução)

### Fontes (impacto imediato em LCP + CLS)
- `__root.tsx` carrega Montserrat + Newsreader + Cormorant Garamond + Inter + Kaushan Script. Memória confirma: **só Fraunces + Inter estão em uso** (Montserrat/Cormorant/Newsreader/Kaushan foram retiradas). Remover famílias mortas do `<link>` do Google Fonts.
- Reduzir Inter e Fraunces aos pesos realmente usados (auditar via coverage; provável Inter 400/500/600 e Fraunces 400/500/600 + italic).
- Adicionar `font-display: swap` (garantir na query string do Google Fonts com `&display=swap` — já presente, confirmar após poda).
- `<link rel="preload" as="font" ... crossorigin>` **apenas** para o peso/estilo usado no H1 do hero e no corpo above-the-fold.

### Vídeo hero (LCP-critical)
- Manter o hero cinematográfico.
- Servir sempre um **poster leve** (AVIF/WebP, ~40–80 KB, dimensões exatas) com `fetchpriority="high"` e `<link rel="preload" as="image">` na rota home.
- `<video>` com `preload="none"` + `poster=...`, começar o carregamento só depois de `app:ready` (ou em `requestIdleCallback`); manter autoplay/muted/inline como está mas atrasado.
- Confirmar `width`/`height` no `<video>` e no poster para eliminar CLS.
- Auditar codecs disponíveis em `public/video/` (já existem variantes 720 av1/hevc/mp4 + 1080) — servir a mais leve compatível via `<source type="video/...; codecs=...">` por ordem av1 → hevc → h264, e limitar a 720p em mobile por media query.

### Imagens
- O pipeline `editorial-premium` + `ResponsiveEditorialImage` já emite AVIF/WebP com `srcset`/`sizes`. Auditar cada `<img>` restante (grep) e migrar as que ainda usam JPG único.
- Todas as `<img>` e `<video>` precisam de `width`/`height` explícitos (ou `aspect-ratio` no CSS) — varrer e corrigir onde faltar.
- `loading="lazy"` + `decoding="async"` em **tudo abaixo da dobra**; `loading="eager"` + `fetchpriority="high"` **apenas** no LCP de cada rota (hero image ou primeiro card visível quando não há hero).
- Nunca `lazy` no elemento LCP.

### JS / bundles
- Auditar `src/routes/studio-v3.tsx` e sub-componentes: garantir que o bundle do Studio (composer, map, add-ons, checkout drawer) só carrega quando o utilizador entra em `/studio-v3` — usar `React.lazy` + `Suspense` para os painéis pesados; o TanStack code-splitter já divide por rota, verificar que nenhum `import` estático do Studio vaza para a home (`rg` em `src/components/home/*`).
- Idem Leaflet/Mapbox: só carregar dentro de `<ClientOnly>` + `React.lazy` nos routes que usam mapa; confirmar que `SignatureRouteMap`/`PremiumMap` não são importados por rotas sem mapa.
- Remover imports mortos (typografias antigas em `styles.css`, componentes órfãos revelados por `knip`/`ts-prune`).

### Terceiros
- GTM continua no `<head>` (necessário para consent-mode gating). Manter, mas garantir que qualquer tag pesada (Meta Pixel, hotjar, etc.) só dispara após consentimento e via GTM — não injetar no bundle.
- Adiar Toaster (`sonner`) e `WhatsAppSupportButton` para depois do primeiro paint (já são client-only; confirmar que não bloqueiam hydrate).

### CLS
- Skeletons/placeholders com dimensões fixas em: `SignaturePriceCard` (preço async), `TourReviews`, `SignatureRouteMap` (altura mínima), sliders/carousels, `AmbientLandscapeReveal`.
- Reservar espaço para o `RouteFade` overlay e para a barra de progresso de leitura.

### Motion
- Manter `.home-energy` e todas as animações. Confirmar que continuam gated por `prefers-reduced-motion` (memória já regista) — não mexer no conteúdo.

## 3. Guardrails

- Nada de remover vídeo hero, animações, parallax homepage, ou trocar tipografia/paleta.
- Nenhuma imagem visivelmente degradada — só formato/dimensão.
- Sem novos testes visuais a falhar (`hero-visual-regression`, `homepage-structure`, `homepage-typography-spacing-regression` têm de passar).
- CI Lighthouse (`.lighthouserc*.json`) tem de manter ou melhorar scores atuais.

## 4. Entregável final

`docs/perf/comparativo-antes-depois.md` com, por página e device:

| Página | Device | LCP antes | LCP depois | INP/TBT antes | depois | CLS antes | depois | JS transferido antes | depois |
|---|---|---|---|---|---|---|---|---|---|

Mais: elemento LCP identificado, lista de otimizações aplicadas por página, e confirmação de zero regressões visuais (screenshots Playwright antes/depois em `docs/perf/screenshots/`).

## Detalhes técnicos

- Poda de Google Fonts no `head.links` de `src/routes/__root.tsx`.
- `vite-imagetools` já disponível (ver knowledge `perf`) — usar para novas conversões AVIF/WebP em build.
- Preload do LCP via `head().links` da rota que o possui, não em `__root`.
- Vídeo: adiar `.load()` com `requestIdleCallback` (fallback `setTimeout(…, 1500)`).
- Studio lazy: `const StudioComposer = React.lazy(() => import('...'))` dentro de `src/routes/studio-v3.tsx`; Suspense fallback = skeleton com dimensões do stage.
- Mapa lazy: mesmo padrão para `SignatureRouteMap`.
- Após cada batch, correr `bun run build` + Lighthouse CI local antes de seguir.
