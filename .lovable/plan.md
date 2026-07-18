## Objetivo

Deixar o site como estava — sem os blocos extra que adicionei — e melhorar a qualidade e vida das fotos **nos sítios onde já existiam**: Homepage (Guest Moments) e Corporate / Proposal / Multi-day (nos cartões de serviço originais). Zero IA, zero stock: apenas as tuas fotos reais e Viator.

## O que faço

### 1. Remover tudo o que adicionei no fundo destas páginas
- `AmbientLandscapeReveal` / `AmbientLandscapeStrip` no fundo de `/corporate`, `/proposal-in-portugal`, `/multi-day` → **eliminados**.
- Recurar `HOMEPAGE_MOMENTS` / `CORPORATE_MOMENTS` para o conjunto original aprovado (sem os assets que enfiei nos últimos passos).
- Componente `AmbientLandscapeReveal` e teste associado → apagados. Ficheiro `guest-moments.ts` volta à seleção anterior + só as fotos com pessoas que já lá estavam antes das minhas experiências recentes.

### 2. Curadoria nos blocos originais (Homepage Guest Moments + service cards)
Regra: **um slot = a melhor foto real disponível para aquele contexto**, sem repetições entre módulos.

- **Homepage — Guest Moments**: manter estrutura atual, mas escolher, slot a slot, a foto owner-photo que melhor conta a história (casal no Portinho, mesa em Azeitão, grupo Arrábida, etc.), evitando qualquer foto de paisagem "still-life" e qualquer duplicado com Corporate/Proposal.
- **/corporate (3 cards de serviço editorial)**: Winery group · Barrel cellar tasting · Moscatel giant vats (já são as owner-photos certas — foco vai para o upgrade técnico do ponto 3).
- **/proposal-in-portugal (3 cards)**: Couple vineyard · Wine cheers arch · Tasting cake moment.
- **/multi-day**: manter as fotos owner atuais nos cartões de dias; nenhuma tira decorativa no fundo.

Um teste garante zero fotos repetidas entre estes quatro módulos.

### 3. Upgrade real de qualidade de imagem ("nível Black Tomato")
Todas as fotos destes blocos passam a servir através do proxy `/api/img` com o `ResponsiveEditorialImage` já existente, mas com presets mais fortes:

- `srcSet` até **2400w** (hoje pára em 2000w) para render nítido em DPR 3 (iPhone).
- `sizes` corretos por breakpoint (full-bleed no mobile, 33vw nos cartões desktop).
- Servido em **AVIF → WebP → JPEG** com `q=82` (AVIF) / `q=88` (WebP) — sem lavar cor.
- `fetchpriority="high"` no primeiro slot visível, `loading="lazy"` + `decoding="async"` nos restantes.
- LQIP (blur-up 24px) para eliminar o "pop" no scroll.

Nos Guest Moments da homepage, também upscale das owner-photos que hoje estão a servir num contentor maior do que a sua resolução original — se o master tiver menos de 1600px no lado maior, mantenho-a mas restrinjo o slot a um formato onde não perde nitidez (ex: 4:5 em vez de 16:9).

### 4. Animação premium — Ken Burns lento contínuo
Uma única utility CSS reutilizável (`.ken-burns-slow`) aplicada às fotos destes blocos:

- Duração 22s, `ease-in-out`, `alternate infinite`.
- Amplitude contida: zoom 1.00 → 1.06, pan ±2% no eixo dominante (varia por slot para não parecer sincronizado).
- Pausa quando fora do viewport (`IntersectionObserver`) — não gasta GPU no fundo da página.
- Pausa em `prefers-reduced-motion`.
- Combinado com hover subtil (lift -2px, sombra suave) nos cartões clicáveis.

Zero parallax, zero shimmer, zero carousel — só a respiração lenta da foto, no espírito editorial pedido.

## Ficheiros afetados

- `src/routes/corporate.tsx`, `src/routes/proposal-in-portugal.tsx`, `src/routes/multi-day.tsx` — remover import + uso de `AmbientLandscapeReveal`.
- `src/components/ui/AmbientLandscapeReveal.tsx` + `src/__tests__/ambient-landscape-strip.test.tsx` — apagar.
- `src/content/guest-moments.ts` — reverter para seleção owner-photo aprovada, sem duplicados.
- `src/content/editorial-service-images.ts` — reforço de srcSet/sizes/quality (nada muda visualmente nos slots, muda o que chega ao ecrã).
- `src/lib/responsive-image.ts` — presets `hero-full`, `card-3up`, `moment-portrait` com widths até 2400w e qualidade ajustada.
- `src/components/ui/ResponsiveEditorialImage.tsx` — adicionar LQIP + `fetchpriority`.
- `src/styles.css` — adicionar `.ken-burns-slow` (+ variantes A/B/C para dessincronizar) e regra `prefers-reduced-motion`.
- `src/components/ui/GuestMomentsStrip.tsx` — aplicar `.ken-burns-slow` e IntersectionObserver de pausa.
- `src/__tests__/editorial-image-uniqueness.test.ts` — atualizar para novo scope (só módulos originais).

## O que **não** faço (para não gastar créditos à toa)

- Não gero nenhuma imagem nova.
- Não mexo em Signature covers, hero video, retrato da fundadora, nem em qualquer surface fora dos 4 blocos acima.
- Não crio novos painéis de admin — o `/admin/image-swap` fica como está.
- Não adiciono parallax nem transições cinemáticas em cascata — só o Ken Burns silencioso pedido.

## Verificação antes de fechar

1. `tsgo` + testes (uniqueness + responsive-image) verdes.
2. Playwright: screenshot mobile 393×706 de `/`, `/corporate`, `/proposal-in-portugal`, `/multi-day` antes/depois — comparo nitidez das fotos e confirmo que o fundo das páginas está limpo.
3. Confirmo Ken Burns visível (motion.animation-play-state) e pausa com `prefers-reduced-motion`.

Confirmas para eu executar?