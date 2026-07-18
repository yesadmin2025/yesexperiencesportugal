## Objetivo

Remover as tiras estáticas de 3 fotos ambientais que ficaram no fundo de **Corporate**, **Propose in Portugal** (Moments) e **Multi-day** (Travel Designer) — hoje parecem uma grelha de stock e quebram o ritmo editorial — e substituí-las por um único painel cinemático que mostra **uma paisagem de cada vez**, em alta qualidade, com movimento restrito e legenda que dá contexto.

Ao mesmo tempo, promover as melhores fotos reais do stock existente e aposentar as de menor qualidade das três tiras.

---

## 1. Novo componente `AmbientLandscapeReveal`

Ficheiro: `src/components/ui/AmbientLandscapeReveal.tsx`. Substitui `AmbientLandscapeStrip` nas três rotas (o ficheiro antigo mantém-se por agora só para preservar `CORPORATE_LANDSCAPES` / `PROPOSAL_LANDSCAPES` / `MULTIDAY_LANDSCAPES` como fonte de dados e não partir `registry.ts`; o export do componente é removido dos routes).

Comportamento:

- **Uma foto de cada vez**, em card editorial largo (aspect 16:9 desktop, 4:5 mobile), com legenda Fraunces + eyebrow de lugar.
- **Auto-avanço a cada 6s** com crossfade suave (400ms), mesmo motor `editorial-photo-motion` (settle + micro-zoom 1.00 → 1.03 ao longo de 8s por foto — cinematic, não Ken Burns agressivo).
- **Indicadores minimalistas**: bullets ivory/gold no rodapé + setas subtis (só desktop) para avanço manual.
- **Pausa on-hover** e quando a secção sai do viewport (`IntersectionObserver`).
- `**prefers-reduced-motion**`: desactiva auto-avanço e zoom; utilizadora navega manualmente.
- **Preload**: imagem N carrega `eager` + `fetchpriority="high"`, N+1 pré-carregada em background.
- **Mantém integração com admin overrides** via `useEditorialOverrides(moduleKey, photos)` — mesma API que o strip actual, para o painel `/admin/image-swap` continuar a funcionar sem alterações.

Contentor da secção: fundo `--ivory`, `py-14 md:py-24`, alinhamento igual ao actual (Eyebrow + gold-rule + SectionTitle + intro à esquerda, painel abaixo).

## 2. Curadoria de qualidade — substituir as fracas

Auditar as fotos hoje listadas em `CORPORATE_LANDSCAPES`, `PROPOSAL_LANDSCAPES`, `MULTIDAY_LANDSCAPES` e substituir apenas as de menor impacto por candidatas premium já existentes no stock (`src/assets/owner-photos/*` e `src/assets/ambient/*`), respeitando:

- **Regra de unicidade**: cobertura mantida por `src/__tests__/editorial-image-uniqueness.test.ts` — nenhuma foto pode aparecer em duas rotas.
- **Contexto por rota**:
  - Corporate → paisagem + ofício (cork, potter, cliffs).
  - Propose → paisagem íntima ao pôr-do-sol, coves.
  - Multi-day → paisagem + prova de vinho + costa.
- **Sem inventar** fotos novas nem gerar IA. Apenas re-ordenar/substituir a partir do pool real.
- Selecção final é feita lendo `src/lib/image-swap/quality.ts` (`estimateQuality`) e o `rankCandidates` já existentes, escolhendo `alta` sempre que possível; onde só houver `desconhecida` (assets estáticos sem `width/height`), manter a foto actual se o contexto for forte.

O ficheiro `AmbientLandscapeStrip.tsx` fica apenas com as três constantes exportadas (fonte de dados). Se preferires, movemos as constantes para `src/content/ambient-landscapes.ts` e apagamos o componente antigo por completo.

## 3. Motion premium (scoped)

Novas keyframes/utilities no `src/styles.css`, todas dentro de `@media (prefers-reduced-motion: no-preference)`:

- `.ambient-reveal-fade` — crossfade opacity 0 → 1 (400ms ease-out).
- `.ambient-reveal-zoom` — `transform: scale(1) → scale(1.03)` ao longo de 8s linear, reset no swap.
- Sem parallax, sem sheen, sem glow — respeita as guardrails de rotas não-homepage (só fade + zoom subtil).

## 4. Remoção dos strips no fundo das rotas

Editar:

- `src/routes/corporate.tsx` (linha ~194): substituir `<AmbientLandscapeStrip … moduleKey="corporate_ambient" />` por `<AmbientLandscapeReveal … moduleKey="corporate_ambient" photos={CORPORATE_LANDSCAPES} />`.
- `src/routes/proposal-in-portugal.tsx` (linha ~192): idem com `proposal_ambient` + `PROPOSAL_LANDSCAPES`.
- `src/routes/multi-day.tsx` (linha ~448): idem com `multi_day_ambient` + `MULTIDAY_LANDSCAPES`.

Nenhuma outra secção destas rotas é tocada.

## 5. Testes

- `src/__tests__/ambient-landscape-strip.test.tsx` → renomear/reescrever como `ambient-landscape-reveal.test.tsx`. Verifica:
  - Renderiza apenas uma imagem visível (opacity 1) por vez.
  - Avança para o próximo slot quando o timer dispara (fake timers).
  - Pausa em hover.
  - Com `prefers-reduced-motion: reduce`, não auto-avança.
- `src/__tests__/editorial-image-uniqueness.test.ts` → continua a passar com as substituições novas (é o guarda de duplicados).

## Fora de âmbito

- `AmbientLandscapeStrip` e `admin/image-swap` — só troco o consumidor, não mexo no registry nem no pool.
- Guest Moments strips (homepage/about) — não são o que a utilizadora chamou "no fundo" destas três rotas.
- Novas fotos, uploads, ou geração por IA.
- Alterações a `registry.ts` / `pool.ts` / módulos do admin.

---

## Confirmação rápida antes de implementar

- **Homepage , "Travel designer" = Multi-day (`/multi-day`)** e **"Moments" = Propose in Portugal (`/proposal-in-portugal`)** — se te referires a outra rota (por exemplo o Builder / Studio), diz e eu ajusto.
- **Auto-avanço 6s + crossfade** vs **avanço só ao scroll** (uma imagem por viewport, sem timer) — o plano acima usa auto-avanço; se preferires scroll-driven, mudo antes de codar.