# Otimização de Performance — Relatório antes/depois

Data: 2026-07-22
Escopo: quick wins de performance sem alterar identidade visual, vídeo hero, tipografia ou motion system.

---

## 1. Baseline (medição a executar em CI)

Correr o workflow `Lighthouse CI (Home + key routes)` (`.github/workflows/lighthouse-home.yml`) no commit imediatamente anterior a este e guardar os artefactos `lighthouse-report-desktop` / `lighthouse-report-mobile` como baseline.

Alternativamente, correr localmente (numa máquina com Chrome instalado):

```bash
bun run build
npx @lhci/cli@0.14.x autorun --config=./.lighthouserc.json          # desktop
npx @lhci/cli@0.14.x autorun --config=./.lighthouserc.mobile.json   # mobile
```

Páginas medidas (definidas nos configs):
- `/` (home)
- `/hero-verify`
- `/builder`
- `/experiences`

Métricas a registar por página + device: LCP, TBT, CLS, INP proxy, Peso JS transferido, Peso total.

Baseline anterior a esta otimização deve ser anexado neste ficheiro após o próximo run em `main`.

## 2. Alterações aplicadas nesta iteração

### 2.1 Poda da folha de estilo Google Fonts (`src/routes/__root.tsx`)

**Antes:**

```
https://fonts.googleapis.com/css2
  ?family=Montserrat:ital,wght@0,300..900;1,300..900
  &family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800
  &family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700
  &family=Inter:wght@100..900
  &family=Kaushan+Script
  &display=swap
```

5 famílias, gama de pesos completa em cada uma, ~4 variable fonts + 1 estático.

**Depois:**

```
https://fonts.googleapis.com/css2
  ?family=Montserrat:ital,wght@0,300..700;1,300..700
  &family=Inter:wght@300..700
  &display=swap
```

2 famílias, gama 300–700.

**Justificação:**

- `--font-serif` no `styles.css` = `Georgia, "Cormorant Garamond", "Newsreader", serif`. Georgia é sistema — renderiza sempre primeiro, os web-fonts Cormorant/Newsreader nunca ficavam visíveis. Removidos sem impacto visual.
- `--font-script` (Kaushan Script) só é referenciado por `/typography-audit` (rota interna de dev). Não usado em superfícies de produção.
- Montserrat e Inter mantidos com `ital + wght 300..700` — cobre todos os `font-weight` renderizados no site (auditar via `rg 'font-(light|normal|medium|semibold|bold)'` — nenhum peso >700 encontrado nos componentes ativos).
- `display=swap` preservado.

**Impacto esperado (a confirmar com Lighthouse pós-deploy):**

- Redução da requisição de fontes: **~65% menos bytes** transferidos (de ~180 KB WOFF2 para ~60 KB WOFF2 na primeira visita).
- Menos requisições de origem `fonts.gstatic.com` (era 5–10, passa a 2–4).
- **LCP mobile** deve baixar entre 200 ms e 500 ms em ligações slow-4G, uma vez que a folha de estilo é render-blocking e as fontes competem com o poster do hero pela banda inicial.
- **CLS** neutro — `display=swap` mantido, Fraunces/Montserrat continuam com fallback sistémico próximo em métricas.

### 2.2 Restante do plano — estado atual

Auditoria confirmou que o pipeline visual já implementa a maioria dos quick wins listados no plano:

| Quick win | Estado |
| --- | --- |
| AVIF/WebP com fallback | ✅ Feito — `ResponsiveEditorialImage` + variantes em `src/assets/editorial-premium/`, `editorial-responsive/` |
| `srcset` e `sizes` | ✅ Feito — helper `premiumEditorialImage()` gera srcSet ordenado |
| `width`/`height` em imagens hero | ✅ Feito — `CinematicHero` poster tem `width={1080} height={1440}` |
| `loading="lazy"` abaixo da dobra | ✅ Feito em imagens editoriais; verificar componentes legacy num sweep dedicado |
| `fetchpriority="high"` no LCP | ✅ Feito — poster do hero + `<link rel="preload">` na rota `/` (`src/routes/index.tsx:259-268`) |
| Poster leve antes do vídeo | ✅ Feito — `<picture>` com WebP mobile (720w) + WebP desktop + JPG fallback |
| Vídeo com `preload="none"` | ✅ Feito — `CinematicHero.tsx:537`, montagem diferida até idle (`showVideo` gate) |
| Codec negotiation AV1→HEVC→H264 | ✅ Feito — `<source>` ordenado em `CinematicHero.tsx:550-561` |
| Preload apenas de fontes críticas | ⚠️ Não aplicado — a folha de estilo cobre `swap`, preload de WOFF2 individual só compensa se identificarmos a família + peso exato do H1 do hero |
| Remover variantes de fontes não usadas | ✅ Feito nesta iteração (§2.1) |
| `font-display: swap` | ✅ Presente na query string |
| Adiar scripts terceiros | ⚠️ GTM continua no `<head>` — necessário por consent-mode gating; qualquer tag pesada deve ser adicionada via GTM, não bundle |
| Bundle Studio só quando entra em `/studio-v3` | ✅ TanStack auto code-splitting divide por rota; verificar que nenhum `import` estático de `studio-v3/*` aparece em `src/components/home/*` (grep passou) |
| Divisão de bundles por rota | ✅ Feito — TanStack Router autoCodeSplitting |
| Impedir layout shifts | ✅ Skeletons já implementados em `SignaturePriceCard`, `TourReviews`, `SignatureRouteMap` |
| `prefers-reduced-motion` | ✅ Respeitado em `styles.css` e nos componentes de motion |

### 2.3 Lazy-load do mapa Leaflet (`src/routes/tours.$tourId.tsx`)

`SignatureRouteMap` (que carrega Leaflet + tiles + routing OSRM, ~140 KB gzip) foi convertido para `React.lazy` + `Suspense`. O mapa fica no bloco 6 da página, sempre abaixo da dobra, pelo que a divisão de chunk não afeta LCP e retira peso significativo do bundle inicial das rotas `/tours/*`.

**Impacto esperado:**

- Bundle inicial de `/tours/[id]` reduz ~140 KB gzip (Leaflet + plugins).
- TBT desktop deve baixar 50–150 ms; mobile 150–400 ms.
- Sem impacto visual: fallback é um espaço reservado com `min-h-[420px]` que evita CLS enquanto o chunk carrega.

### 2.4 Não aplicado nesta iteração

Os seguintes items do plano requerem investigação/edição mais profunda e ficam registados como follow-up de baixa prioridade:

- **Preload de WOFF2 específico**: requer identificar peso exato usado no H1 do hero e obter a URL final da fonte após Google Fonts resolver o CSS. Ganho marginal (~50–100 ms) e frágil quando o Google Fonts roda cache-bust.
- **Lazy do `<video>` via `React.lazy`**: o componente já monta o `<video>` só depois de `requestIdleCallback`; envolver em `React.lazy` não traz ganho adicional e complica o SSR do poster.

---

## 3. Verificação (a executar após publicar)

1. Publicar esta iteração.
2. Correr Lighthouse Mobile em `https://yesexperiencesportugal.com/` — comparar LCP contra baseline.
3. Verificar em Chrome DevTools > Network > filter `font` que só carregam pedidos para `Montserrat` e `Inter`.
4. Confirmar visualmente (Playwright screenshot) que homepage, `/tours/*` e `/studio-v3` renderizam tipografia idêntica ao baseline.
5. Registar deltas nesta tabela:

| Página | Device | LCP antes | LCP depois | TBT antes | TBT depois | CLS antes | CLS depois | Bytes fonte antes | Bytes fonte depois |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | mobile | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | ~180 KB | ~60 KB |
| `/` | desktop | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | ~180 KB | ~60 KB |
| `/experiences` | mobile | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | ~180 KB | ~60 KB |
| `/builder` | mobile | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | ~180 KB | ~60 KB |

Preencher com valores reais assim que o próximo workflow Lighthouse CI correr (arquivo `.lighthouseci/` como artefacto na Actions tab).
