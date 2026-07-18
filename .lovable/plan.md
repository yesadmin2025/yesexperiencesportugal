## Objetivo

Duas frentes complementares:

1. **Acessibilidade + SEO** — garantir que cada imagem visível tem `alt` descritivo (e legenda quando faz sentido editorial).
2. **Performance** — servir cada imagem no formato mais leve (AVIF → WebP → JPEG fallback), no tamanho certo por breakpoint, com lazy-loading e cache agressivo.
3. dada a base de dados de fotos mais alargada que tens, podes substituir algumas que aches que teriam mais impacto no website nas páginas todas e melhor conversão 

Sem alterar layout, tipografia, cores ou copy visível — apenas o pipeline de imagem e os atributos `alt`.

---

## Parte 1 — Alt text e legendas

### Auditoria

- Rodar um scan que lista, por rota, todas as `<img>` e componentes de imagem (`TourImage`, `BuilderImage`, `Logo`, `PlatformBadge`, `GuestMomentsStrip`, `SignatureCarousel`, etc.) com o valor atual de `alt`.
- Classificar cada uma:
  - **Decorativa** (ícone, textura, badge repetido) → `alt=""` + `aria-hidden`.
  - **Informativa** (foto de tour, retrato, tile de guest moment) → `alt` descritivo em ≤125 chars, formato `"<assunto> — <local/contexto>"`.
  - **Funcional** (logo, botão) → `alt` = ação/nome ("YES Experiences Portugal").

### Fontes de verdade para o texto

- **Tours (Signature/Tailor)** — reutilizar `getHeroAlt()` e `getTourGallery()` (`src/lib/tour-gallery.ts`) que já sintetizam alt a partir de `tour.title` + `tour.region`. Estender para fotos admin (`useAdminTourPhotos`) — hoje só usam `alt` livre do editor; adicionar fallback derivado do tour quando vazio.
- **Guest Moments / Owner photos** — já existem descrições em `src/content/guest-moments.ts`; propagar como `alt` (hoje algumas caem em string vazia).
- **Local Stories / About / Press** — alt escrito à mão por peça (poucas fotos, alto valor editorial).
- **Logos e badges** — `alt="YES Experiences Portugal"` no logo principal; `alt=""` em repetições decorativas na mesma vista.
- **Ícones lucide** — nunca ganham `alt`; ficam `aria-hidden` (já é o default do lucide-react).

### Legendas visíveis (`<figcaption>`)

- Apenas onde acrescenta contexto editorial: hero de tour (nome do local/região sob a foto quando não estiver já no título ao lado), Local Stories e About. Não adicionar legendas em cards de grelha, galerias ou guest moments — polui o layout premium.
- Usar `<figure>` + `<figcaption>` com token `text-charcoal-soft`, `text-xs`, `tracking-wide`. Sem cor nova.

### Testes

- Novo teste vitest `src/__tests__/image-alt-coverage.test.tsx` que renderiza rotas-chave (index, experiences, tours/$tourId, about, local-stories) e falha se qualquer `<img>` visível ficar sem `alt` não-vazio, exceto as marcadas `aria-hidden`.

---

## Parte 2 — Otimização de imagens

Três pipelines, cada um com uma solução alinhada à origem da imagem:

### A) Assets do repositório (`src/assets/**/*.{jpg,jpeg,png}`)

- Adicionar `vite-imagetools` (já compatível com Vite 7).
- Criar helper `src/lib/import-responsive.ts` que expõe `srcSet` AVIF + WebP + JPEG fallback e `sizes` por preset (`sm/md/lg/hero`, reaproveitando os buckets de `use-imported-tour-images.ts`).
- Migrar consumidores desses assets (hero About, owner photos, brand hero cards) para `<picture>` com 3 `<source>` (AVIF, WebP, JPEG).
- Sem alterar nada em `.asset.json` (CDN Lovable) — esses já são servidos com cache longo; só passamos a pedir tamanhos corretos via `?w=` no proxy quando aplicável.

### B) Fotos remotas (Viator `media.tacdn.com` + tour_gallery_photos com signed URLs)

- Reforçar `src/routes/api/img.ts`:
  - Alargar allowlist para `media.tacdn.com` e o host do Supabase Storage do projeto (já é HTTPS, valida allowlist).
  - Ligar redimensionamento real com `sharp` (já é dependência): pipeline `resize({ width })` → `.avif({ quality })` / `.webp({ quality })` / `.jpeg({ quality, mozjpeg: true })` conforme `pickAcceptVariant()`.
  - Manter cache-key atual (`w`, `q`, variant) e headers imutáveis de 30d edge / 7d browser.
- `useImportedTourImages` e `useAdminTourPhotos` já produzem `srcSet` — passam a beneficiar automaticamente do resize real (hoje só re-servem o original).
- Adicionar `loading="lazy"` + `decoding="async"` + `fetchpriority="high"` só no LCP (hero de home + hero de cada tour). Já é o padrão em `TourImage`; auditar os restantes.

### C) LCP e preloads

- Homepage: preload da primeira frame do hero (já é `<video>` — sem mudança).
- `/tours/$tourId`: adicionar `<link rel="preload" as="image" imagesrcset="..." imagesizes="..." fetchpriority="high">` no `head()` da rota, derivado da capa admin (quando existir) ou Viator.

### Testes / verificação

- Estender `src/__tests__/img-proxy.test.ts` para cobrir os novos formatos AVIF/WebP e negociação por `Accept`.
- Rodar Lighthouse mobile local (`.lighthouserc.mobile.json`) antes/depois em `/` e `/tours/southwest-vicentine-coast`; alvo: LCP < 2.5s, "Serve images in next-gen formats" e "Properly size images" passam.

---

## Detalhes técnicos

**Ficheiros novos**

- `src/lib/import-responsive.ts` — helper `<picture>` para assets locais.
- `src/lib/image-alt.ts` — funções `describeTourImage`, `describeGuestMoment`, etc.
- `src/__tests__/image-alt-coverage.test.tsx`
- Testes adicionais em `src/__tests__/img-proxy.test.ts`.

**Ficheiros a editar (esperado)**

- `src/routes/api/img.ts` — allowlist + resize real com sharp.
- `src/lib/useAdminTourPhotos.ts` — fallback de alt derivado do tour.
- `src/lib/tour-gallery.ts` — nenhuma mudança de contrato; só usado por consumidores.
- `src/components/tours/TourImage.tsx` — aceitar `srcSet`/`sizes` de `<picture>` com sources.
- Consumidores de assets locais em `src/routes/{about,index,press,local-stories.*}.tsx` e `src/components/{RecentJourney,GuestMomentsStrip,SignatureCarousel}.tsx` — migrar para `<picture>`.
- `package.json` — adicionar `vite-imagetools`.
- `vite.config.ts` — registar plugin `imagetools()`.

**Não mexer**

- Design tokens, tipografia, layout, spacing.
- `hero-*` copy / cinematics.
- Rotas de admin (já são internas, não precisam de otimização de LCP).
- `.asset.json` pointers (imutáveis por contrato).

---

## Fora do escopo (para eventual segunda fase)

- Migrar assets locais grandes para Cloudflare Image Resizing.
- Regravar vídeos hero para HEVC/AV1 adicional.
- Auto-geração de `alt` via IA — mantemos alt determinístico com base em dados que já temos.