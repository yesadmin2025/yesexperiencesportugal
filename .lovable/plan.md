# Fotos responsivas nas páginas de conversão

## Contexto

O turn anterior deixou o pipeline responsivo pronto para fotos **admin** (Supabase transforms) e para o hero/gallery de `/tours/$tourId`. Falta o mesmo tratamento nas restantes páginas onde a imagem influencia a decisão de reservar — hoje muitas ainda servem 1 única URL (Viator ou asset local) sem `srcSet` nem `sizes`, o que penaliza LCP em mobile e desperdiça banda.

## Páginas no âmbito (impacto direto em conversão)

1. `/experiences` — grelha Signature (cartão editorial + rating pill).
2. `/day-tours` — cartões de tours.
3. `/tours/$tourId` — hero + galeria (já feito) + secção "outras experiências".
4. `/tours/$tourId/tailor` — hero + resumo visual.
5. `/multi-day` — cartões de itinerário.
6. `/corporate` — hero + prova social visual.
7. `/proposal-in-portugal` — hero editorial.
8. `/` (homepage) — RecentJourney, SignatureCarousel, EditorialCard, GuestMomentsStrip (CinematicHero já usa `<picture>` com `srcSet`).
9. `/about` — retratos editoriais.

Fora do âmbito: `/admin/*`, `-brand-qa.test`, `local-stories` (leitura, não conversão) — ficam para segunda fase se necessário.

## O que vai mudar

### 1. Novo helper `src/lib/responsive-image.ts`

Função pura `buildResponsiveSrc(url, { widths?, quality? })` que devolve `{ src, srcSet, sizes }` reconhecendo três origens:

- **Viator** (`media.tacdn.com/...`): reescreve o path para variantes de largura via segmento `-w{W}` já suportado pelo CDN Viator; fallback ao original quando o padrão não bate.
- **Supabase Storage transform** (fotos admin — já coberto no hook, expõe utilitário partilhado).
- **Asset local Lovable CDN / `public/***`: devolve o `src` original + `sizes` (o CDN Lovable já entrega AVIF/WebP negociado).

Uma única fonte de verdade — o hook `useAdminTourPhotos` passa a chamá-la.

### 2. Sizes presets em `src/lib/responsive-image.ts`

- `SIZES.card` = `"(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"`
- `SIZES.hero` = `"100vw"`
- `SIZES.gallery` = `"(min-width: 1024px) 50vw, 100vw"`
- `SIZES.portrait` = `"(min-width: 1024px) 33vw, 100vw"`

### 3. Substituição dos `<img>` crus por `TourImage`

Em cada página do âmbito, trocar `<img src=... />` por `<TourImage>` com o preset `sizes` correcto e `srcSet` derivado do helper. Componentes tocados:

- `src/components/ui/EditorialCard.tsx` (usado no homepage)
- `src/components/SignatureCarousel.tsx`
- `src/components/home/RecentJourney.tsx` (4 `<img>`)
- `src/components/ui/GuestMomentsStrip.tsx`
- `src/routes/multi-day.tsx` (3 `<img>`)
- `src/routes/corporate.tsx`
- `src/routes/proposal-in-portugal.tsx`
- `src/routes/about.tsx` (2 `<img>`)
- `src/routes/index.tsx` (1 `<img>` remanescente)

`experiences.tsx` e `day-tours.tsx` já usam `TourImage` — só falta passar `sizes` + `srcSet` do helper.

### 4. Cover art priorização (LCP)

Em cada página, marcar apenas o primeiro cartão acima da dobra com `priority` — hoje várias marcam múltiplos (ou nenhum). O helper de LCP fica no próprio ficheiro, sem componente novo.

### 5. Fotos a substituir (curadoria)

Passagem manual pelas páginas para trocar fotos "fracas" pelas melhores do banco atual (fotos admin uploadadas nas últimas rondas + Viator originais). Regras:

- `/experiences` cartões: usar cover admin quando existir; senão Viator hero.
- `/multi-day`, `/corporate`, `/proposal-in-portugal`: substituir stock/genéricos por fotos reais das galerias equivalentes (ex.: Comporta, Cabo Espichel, Sesimbra).
- `/about`: manter retratos actuais (não são de operação).

Lista concreta de substituições para aprovar antes de aplicar (é a única parte com decisão editorial):


| Página                                      | Bloco        | Foto atual       | Proposta                                        |
| ------------------------------------------- | ------------ | ---------------- | ----------------------------------------------- |
| `/multi-day` hero                           | topo         | genérica costa   | cover admin Comporta (IMG_5241)                 |
| `/multi-day` card "Rota Sul"                | &nbsp;       | Viator genérica  | Cabo Espichel farol (admin)                     |
| `/corporate` hero                           | topo         | vinha stock      | terraço-vinhedo Setúbal (Viator)                |
| `/corporate` "prova social"                 | 3 miniaturas | mistas           | 3 melhores momentos de grupo (guest moments)    |
| `/proposal-in-portugal` hero                | topo         | pôr-do-sol stock | pôr-do-sol Cabo Espichel (admin)                |
| `/experiences` cartão "Southwest Vicentine" | cover        | Viator           | IMG_5241 (já aplicada) — confirmar renderização |


Se preferires manter as fotos actuais e só melhorar tamanho/entrega, digo e saltamos o ponto 5 — os pontos 1-4 já resolvem performance sozinhos.

### 6. Testes

- Estender `src/__tests__/image-alt-coverage.test.ts` para exigir que `<TourImage>` ou `<img>` em rotas de conversão declarem `sizes` OU `srcSet`.
- Adicionar teste unitário para `buildResponsiveSrc` (Viator, Supabase, passthrough).

## Detalhes técnicos

- **Sem sharp / sem worker resize custom**: Viator serve variantes por URL (`-w800`, `-w1200`), Supabase serve via `?width=&quality=`, Lovable CDN já negoceia formato. Zero dependências novas.
- `**fetchPriority**`: só o primeiro hero de cada página; restantes ficam `lazy` + `decoding=async` (já é o default do `TourImage`).
- **A11y**: `alt` fallback `"<título> — <região>"` mantém-se; `TourImage` continua a receber `alt` obrigatório (tipado).
- **Zero mudanças de layout**: `TourImage` mantém rácio 3:2 / 16:9 / 4:5 conforme o slot.

## Fora do âmbito

- Optimizar imagens de admin/interno (`/admin/*`).
- Substituir a lógica de `CinematicHero` (já usa `<picture>` responsivo).
- Introduzir CDN de terceiros.
- Rondas adicionais de curadoria fotográfica além da tabela acima.

## Entregáveis

- 1 helper + presets (`src/lib/responsive-image.ts`)
- ~9 ficheiros de componentes/rotas migrados para `TourImage` + `sizes/srcSet`
- 1 teste novo + expansão do teste existente
- 6 substituições fotográficas (se aprovado o ponto 5)

Utiliza de preferência fotos de boa qualidade e que incluam pessoas felizes. Só se for possivel 