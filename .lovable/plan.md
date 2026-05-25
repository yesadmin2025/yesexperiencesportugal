# Plano — O Melhor Builder de Sempre (YES Studio v4)

## Objetivo 

Unir o **Studio Drift** atual (cinematic, emocional, narrativo) com os elementos fortes do **configurador do site de referência** (`yesexperiences.customwebsitedesigns.org/#builder`) — story/timeline/map, Smart Recommendations, Quality Score, Estimated Investment, Step X of 11, Continue — num só produto que **converte**, é **único**, **dinâmico** e **faz sentido**.

Substituir o copy demasiado poético (e por vezes vazio) por linguagem **clara, sensorial, decisiva**, sem perder a alma cinemática.

## Diagnóstico cruzado


| Eixo              | Studio Drift (nosso)                      | Configurador (referência)                                      | O que fica no v4                    |
| ----------------- | ----------------------------------------- | -------------------------------------------------------------- | ----------------------------------- |
| Emoção            | ★★★★★ cinematic, scenes, vídeo            | ★★ frio, plano                                                 | **Cinematic mantém-se**             |
| Clareza/progresso | ★★ HUD fininho recente                    | ★★★★★ "Step 1 of 11", Continue, %                              | **Progresso visível adopt.**        |
| Trust/prova       | ★ ausente                                 | ★★★★ Quality Score, "700+ 5★"                                  | **Trust band adopt.**               |
| Conversão $$      | ★ whisper de preço                        | ★★★★ "€145/guest · Party of 2"                                 | **Investment chip live**            |
| Recomendação      | ★ Smart Reco no reveal                    | ★★★★ "Most couples add: …" inline                              | **Reco contextual em cada chapter** |
| Mapa real         | ★ só no reveal                            | ★★★ tabs story/timeline/map                                    | **Live preview: 3 vistas**          |
| Copy              | ★★ poético demais ("a quietness arrives") | ★★★ funcional ("YES — outline your basic traveler statistics") | **Híbrido: sensorial mas concreto** |
| Velocidade        | ★ 11 chapters longos                      | ★★★★ "60 Sec Fast" mode                                        | **Dual pace mantém-se + reforço**   |


## Princípio-mestre

> Cada chapter é um **micro-momento cinematic** que **resolve uma decisão concreta** e **mostra imediatamente o que mudou** no quote, no mapa e na confiança. O utilizador nunca se pergunta "porquê estou a responder isto?".

## Arquitetura v4

```text
┌────────────────────────────────────────────────────────────┐
│  TOP HUD (sempre visível, ~36px)                           │
│  Drift ●●●●○○○○○○○  4/11  ·  Match 62%  ·  €145/guest ▴   │
│                                                  Reserve → │
├────────────────────────────────────────────────────────────┤
│                                                            │
│   CINEMATIC STAGE  (scene + question)                      │
│   — single sensorial line (max 12 words)                   │
│   — 2–3 choice cards com benefit concreto                  │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  LIVE PREVIEW DRAWER  (collapsible, default peek)          │
│  [story] [timeline] [map]                                  │
│  ★ Smart Reco: "Most couples add boutique tasting +€38"   │
│                                            [Add 1-click]   │
├────────────────────────────────────────────────────────────┤
│  BOTTOM BAR                                                │
│  ◀ Back        ●●●●○○○○○○○        Continue ▶              │
└────────────────────────────────────────────────────────────┘
```

Três camadas vivem em **simultâneo** e respondem a cada escolha em <300ms.

## Fases de execução

### Fase 1 — Copy reset (o que mais dói hoje)

- Auditar `src/lib/drift/i18n.ts` + scenes em `StudioDrift.tsx`: substituir frases poéticas vazias ("a quietness arrives", "the road remembers you") por **sensoriais-concretas** ("Slow morning in Arrábida — 3 vineyards, no queues") em PT/EN/ES/FR.
- Regra de copy v4: cada linha tem **1 sensação + 1 facto + 1 verbo**. Sem metáforas órfãs.
- Manter Georgia italic para emoção, mas reduzir ratio italic/sans de 60/40 para 30/70.
- Lock: escrever `src/content/studio-v4-copy.ts` como single source-of-truth, com testes que falham se reaparecer vocab banido ("whisper", "drift", "arrives", "remembers", "linger").

### Fase 2 — Live Preview Drawer (story / timeline / map)

- Novo componente `src/components/builder/v3/StudioLivePreview.tsx` (collapsible bottom-sheet em mobile, side-rail em ≥lg).
- 3 tabs como na referência:
  - **story** — narrative paragraph gerada por `composeStudioMoment` + bullets (real stops já compostos).
  - **timeline** — chips hora-a-hora (09:30 Pickup · 10:30 Quinta · 13:00 Almoço…) a partir do `ComposedDay`.
  - **map** — `BuilderMap` real com stops pinados, draw da rota Mapbox; respeita zoom-per-region (já em memory).
- Atualiza em cada `bump()` de confiança, sem refetch full — usa deltas locais.
- Mobile: peek 84px com header "Your day is forming · 4 stops · €145/guest". Tap → expande full-height com swipe-down close.

### Fase 3 — Conversion HUD reforçado

- Evoluir `StudioConversionHud.tsx` para incluir:
  - Stepper `Step 4 of 11` em vez de `4/11` (mais legível, igual à referência).
  - **Investment chip live**: `€145/guest · party of 2` clicável → expande breakdown (host + vehicle + tastings + lunch, "no hidden fees").
  - **Match %** com tooltip "based on your last 4 answers".
  - **Reserve →** mantém-se como CTA gold (skip-to-stepper para agents/decisores).
- Esconder em `convergence` (já reveal final).

### Fase 4 — Smart Recommendations contextuais

- Hoje só aparecem no reveal. Levar para **dentro do drawer** após cada chapter onde haja upgrade plausível.
- Fonte: `src/data/signatureTours.ts` upgrades + co-occurrence real ("most couples who chose Arrábida added X").
- UI: card slim no topo do drawer, "★ Most couples add — boutique tasting +€38 · [Add in 1-click]".
- Add em 1 clique → bump confidence + atualiza Investment chip + flash gold no HUD (200ms).
- Nunca inventar upgrades fora do catálogo (regra YES).

### Fase 5 — Quality Score band (trust)

- Após chapter 6+ (≥50% confidence), mostrar **abaixo do drawer**:
  - "Experience Quality 92% — excellent flow & pacing" + 4 chips (Wine · Coast · Heritage · Ease) com barras de afinidade.
  - Cálculo real: pondera `confidence` map + cobertura de dimensões + balanço de stops.
  - Copy funcional, não inventado ("Pacing balances 2 active + 1 slow window").
- Componente: `src/components/builder/v3/StudioQualityBand.tsx`.

### Fase 6 — Trust strip permanente (mini)

- Linha de 18px abaixo do HUD: `700+ ★★★★★ · Google · Tripadvisor · Viator · GetYourGuide`.
- Aparece só quando o drawer está colapsado (não compete com o preview).
- Reaproveita assets `src/assets/platform-trustpilot.svg` + adicionar logos restantes (SVG inline, ivory 60% opacity).

### Fase 7 — Fast Mode (60 sec) reforçado

- O entry "Build my experience fast" da referência já existe via `studio.fastPace=1`.
- v4: badge persistente no HUD "⚡ Fast — 60s" + cortar de 11 → 5 chapters (Mood · Who · Region · Energy · Resolve) — saltar dimensões que adaptation marca como "implied".
- Preço/pax visível desde o chapter 1 (não só convergence) — já planeado em `.lovable/plan.md` Fase C, fazer agora.

### Fase 8 — Continue/Back explícitos

- A referência usa "Continue" como CTA. O Drift atual avança em tap-on-choice (bom) mas falta o **safety net** de Back.
- Bottom bar: `◀ Back` (subtil ivory 50%) + dots + `Continue ▶` que aparece quando a escolha já está feita mas o user fica parado >2s (nudge sem pressionar).
- Tap em qualquer dot já completado = jump back (mesmo padrão do `BuilderStepper.tsx`).

### Fase 9 — Reveal final upgrade

- Manter cinematic mas adicionar **stack convertente** estilo referência:
  1. Hero scene + headline ("Your Portugal — Arrábida, slow, for 2")
  2. Story paragraph (composeStudioMoment)
  3. Timeline real
  4. Map real com rota
  5. **Investment breakdown completo** + "*includes private host, premium vehicle, tastings, lunch — no hidden fees*"
  6. **Smart Reco final** (1-2 upgrades top)
  7. Trust band (4 platforms + "700+ 5★ reviews")
  8. CTAs duplos: **Reserve now** (gold, primary) + **Save / share proposal** (ghost, gera `builder_journeys` token → `/i/$token`)
  9. Whatsapp ghost link (suporte, nunca primário).

### Fase 10 — Telemetry + A/B

- Eventos novos: `studio_v4_drawer_open`, `studio_v4_reco_add`, `studio_v4_investment_expand`, `studio_v4_reserve_skip`.
- A/B: drawer aberto-por-default vs peek; copy poético-residual vs zero-poesia; HUD com €/guest vs sem.
- Tabela já existe (`hero_ab_assignments` pattern) — replicar para `studio_ab_assignments`.

## Detalhes técnicos

- Sem novas dependências. Tudo com Tailwind + Motion (já no projeto) + Mapbox/Leaflet existente.
- Tokens: ivory/charcoal/gold/teal — sem cores novas.
- Acessibilidade: HUD `role="region" aria-label`, drawer `aria-expanded`, Continue button focável com keyboard (Enter/Space), drawer fecha com Esc.
- Reduced-motion: drawer abre instantâneo, sem sheen sweep, sem parallax.
- Mobile 393px é o canvas primário; ≥lg adapta drawer para side-rail 380px à direita.
- Server: reusa `revealJourney`, `composeStudioMoment`, `composeDay` — adicionar `previewDay` server fn leve (sem AI, só composer) para updates rápidos no drawer a cada bump.
- Performance: drawer rerender memoized por `ComposedDay` hash; map só monta quando tab `map` ativa pela 1ª vez.

## Ordem de implementação recomendada

1. **Fase 1 (copy)** — sozinha, sem código novo, alta sensação de melhoria imediata.
2. **Fase 3 (HUD)** + **Fase 6 (trust strip)** — pequenas, alto sinal de conversão.
3. **Fase 2 (Live Preview Drawer)** — core, maior peça.
4. **Fase 4 (Smart Reco)** + **Fase 5 (Quality band)** — dentro do drawer, vivem juntas.
5. **Fase 7 (Fast)** + **Fase 8 (Back/Continue)** — polish de fluxo.
6. **Fase 9 (Reveal v2)** — fecha o ciclo de conversão.
7. **Fase 10 (Telemetry/AB)** — instrumenta tudo, valida.

## Princípios não-negociáveis

1. **Nunca inventar tours, stops, preços, inclusões** — tudo lê de `signatureTours.ts` / `regionStops.ts` / `signature-pricing`.
2. **Copy sensorial mas concreto** — banir poesia vazia; cada linha justifica-se com 1 facto.
3. **Cinematic preserved** — scenes, vídeo, encouragement, fade transitions ficam. Adicionamos clareza, não removemos alma.
4. **Mobile-first 393px** — todas as fases testadas neste viewport antes de desktop.
5. **Conversão visível sempre** — Step X/11, €/guest, Match %, Reserve → nunca escondidos.
6. **No competitor copy, no invented superlatives** — "Designed in real time, with you" tipo de linguagem.
7. **Skip-to-stepper sempre disponível** — para agents e decisores via Reserve no HUD.

## Métricas de sucesso

- Drawer open rate ≥ 65% por sessão Studio.
- Smart Reco add rate ≥ 18% (vs 0% atual — não existe).
- Tap em Investment chip ≥ 30% (sinal de intenção comercial).
- Reveal → Reserve CTR ≥ 12% (baseline atual ~4-6%).
- Fast mode conclusão ≤ 75 segundos média.

---

**Pronto para começar pela Fase 1 (copy reset) assim que aprovares.** Posso ir direto à Fase 1+3+6 num primeiro batch (alto impacto, baixo risco), depois Fase 2 num segundo batch (peça grande do drawer). 

&nbsp;

Approved direction.

Prioritize phased implementation to preserve clarity and emotional pacing.

Start with:

1. Copy reset
2. Persistent conversion HUD
3. Trust strip
4. Continue/back navigation

Then move into:

- Live Preview Drawer (story first)
- Smart Recommendations
- Timeline/map tabs

Preserve cinematic feel at all costs.  
Avoid dashboard overload.  
Every UI layer must feel effortless, premium and emotionally guided.

The system should feel like a luxury concierge shaping a journey in real-time — not a technical configurator.