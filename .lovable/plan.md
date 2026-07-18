## Objetivo

Garantir que Corporate, Adegas (tour), Moments (guest moments strip) e blocos da Homepage carreguem imagens nítidas em iPhone (DPR 3) e mostrem o crossfade/Ken Burns visível — sem borrão inicial nem atraso que "mate" a animação. Zero regressões com `prefers-reduced-motion`.

## Verificação (Playwright em mobile 393×852 @ DPR 3)

1. Rotas: `/`, `/corporate`, `/pt/corporate`, `/proposal-in-portugal`, `/multi-day`, uma página de tour de adegas (Azeitão) e o strip Guest Moments.
2. Capturas por rota:
  - Screenshot inicial (LCP) + screenshot aos 2s, 6s, 14s para confirmar Ken Burns e crossfade visíveis.
  - Console filtrado a `[font-fallback]` e erros.
  - Network: verificar que a 1ª imagem acima da dobra vem em AVIF, largura ≥ 1600w, `fetchpriority=high`, e que variantes 2400w existem para high-DPR.
3. Repetir com `context.emulate_media(reduced_motion="reduce")` — confirmar que animação é substituída por fade estático, sem layout shift.
4. Registar cada slot com problema (rota + índice) num pequeno relatório antes de tocar em código.

## Correções direcionadas (só o que a verificação apontar)

1. **LCP acima da dobra**
  - Adicionar `priority` + `fetchpriority="high"` + `decoding="sync"` no primeiro `CinematicEditorialImage` de cada rota (corporate EN/PT, proposal EN/PT, tour adegas hero).
  - Emitir `<link rel="preload" as="image" imagesrcset imagesizes>` no `head()` da rota, apontando ao mesmo srcSet AVIF do LCP (usa o helper `premiumEditorialImage`).
2. `**sizes` corretos para mobile DPR3**
  - Nos blocos service (`aspect-[4/5]` em mobile full-width): `sizes="100vw"` mobile, `50vw` ≥lg. Confirmar em `ResponsiveEditorialImage` e overrides.
  - Garantir que variantes 2000/2400w são realmente emitidas nos srcSet (hoje o helper faz sort — validar que os arquivos existem em `src/assets/editorial-premium/`).
3. **Movimento visível**
  - Confirmar `.ken-burns-slow` com amplitude ≥ scale 1.10 e duração 22–26s; se a verificação mostrar imperceptível em mobile, subir para scale 1.12 e adicionar translate ±2%.
  - Garantir que crossfade só arranca depois de `img.decode()` resolver da imagem primária (evita "flash" antes da animação). Fallback: `onLoad` da `<img>` primária dispara `data-ready=true` que a CSS usa para começar o loop.
  - Respeitar `@media (prefers-reduced-motion: reduce)`: pausar animação, mostrar imagem primária estática.
4. **Adegas (tour Azeitão / winery hero)**
  - Se o hero da tour usa `<img>` cru, trocar por `CinematicEditorialImage` com a mesma foto owner em variantes 2400w e `priority`.

## Fora de escopo

- Não adicionar novos slots.
- Não trocar fotos (a curadoria feita no turno anterior fica).
- Sem mudanças de copy, layout ou tokens de marca.

## Detalhes técnicos

- Arquivos que serão tocados apenas se a verificação identificar problema:
  - `src/components/ui/ResponsiveEditorialImage.tsx` (gate `data-ready`, `fetchpriority`, `decoding`).
  - `src/routes/corporate.tsx`, `src/routes/pt.corporate.tsx`, `src/routes/proposal-in-portugal.tsx` (preload no `head()`, `priority` no primeiro slot).
  - `src/routes/tours.$tourId.tsx` (hero das adegas — preload + priority se aplicável).
  - `src/styles.css` (`.ken-burns-slow` amplitude/duração; regra `prefers-reduced-motion`).
  - `src/content/editorial-premium-images.ts` (garantir variantes 2000/2400w listadas).
- Testes:
  - Playwright screenshots antes/depois em `/tmp/browser/mobile-motion/`.
  - `bunx vitest run src/__tests__/responsive-image.test.ts` continua verde.
  - Sem novas dependências.

## Entregável

Relatório curto com: rotas verificadas, evidência (screenshot + tamanho de imagem servido), ajustes aplicados, e resultado final com/sem reduced-motion. Especial atenção à qualidade gráfica das imagens 