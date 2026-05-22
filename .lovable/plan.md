# Experience Studio v3 — Living Atmosphere

Reescrita do `/builder` como uma **única cena cinematográfica contínua**, sem stepper, sem cards, sem noção de "passo". O utilizador narra, a IA interpreta, o mundo (imagery + mapa + rota) emerge organicamente. Stepper técnico, ElementsShelf, ChoicesGrid, RegionSelector, ReviewScreen — tudo desaparece como UI primária e é substituído por uma camada conversacional + overlays atmosféricos contextuais.

Stack: zero novas dependências. Reutiliza `parseNarrative`, `suggestFromIntent`, `suggestPacing`, `BuilderMap`, `useBuilderPersistence`, `builder_stops`, `createJourney`, `ShareExport`. Brand guardrails mantidos (Montserrat / Georgia italic / Inter, tokens ivory/teal/gold/charcoal, motion ≤220ms fora da home — aqui aplicamos o mesmo critério editorial: fades suaves, sem parallax/blob/spring).

---

## Estrutura nova (3 camadas sobrepostas, fullscreen 100dvh)

```text
┌─────────────────────────────────────────────────┐
│  Layer 0 — AMBIENT STAGE (cena de fundo)        │
│   imagem/vídeo real reativo a mood+region       │
│   crossfade 600ms quando contexto muda          │
│   ── ── ── ── ── ── ── ── ── ── ── ── ── ──    │
│  Layer 1 — LIVING MAP (revela-se)               │
│   começa hidden (opacity 0)                     │
│   fade-in + grow ao 1º stop confirmado          │
│   ocupa 55% direito em ≥md, 45vh bottom mobile  │
│   pins+rota desenham-se progressivamente        │
│   ── ── ── ── ── ── ── ── ── ── ── ── ── ──    │
│  Layer 2 — NARRATIVE VEIL (UI principal)        │
│   - chapter line (Georgia italic, top-left)     │
│   - composer (input narrativo, bottom)          │
│   - emerging chips (escolhas reais, inline)     │
│   - itinerary ribbon (lado, scroll vertical)    │
└─────────────────────────────────────────────────┘
```

Nada de "Step 1/2/3". Nada de cards. Nada de SiteLayout. Só uma cena que evolui.

---

## Fluxo emocional (sem passos visíveis)

1. **Abertura — Cena ambiente**
   Vídeo real (reutiliza `/video/real/scene-imagine.mp4` ou poster) em fullscreen, overlay charcoal 35%, frase Georgia italic centrada: *"Conta-me esta viagem…"*. Sub-linha Inter discreta: "narra em voz alta, escreve, ou deixa-me começar por ti". Sem botões salientes. Tap em qualquer sítio → composer aparece de baixo (slide-up 220ms).

2. **Narrativa livre**
   Composer ivory translúcido, textarea Georgia italic placeholder rotativo ("fim-de-semana romântico, vinho e mar…" / "um dia para celebrar com a família…"). Mic icon (Web Speech API se disponível, fallback silencioso). Enter → chama `parseNarrative`.

3. **O mundo desperta**
   Após parse: cena de fundo crossfade para imagem real da região sugerida. Chapter line aparece no topo: *"Uma história lenta no Douro, para dois."* (gerada da IA, tone-only). Composer encolhe para pill no canto.

4. **Stops emergem**
   `suggestFromIntent` devolve 2-3 stops reais. Em vez de cards numa shelf, aparecem como **emerging chips** flutuantes sobre a cena (ivory + borda gold, micro-rationale Georgia italic abaixo). Tap → chip "aterra" na itinerary ribbon (lateral direita, vertical, Georgia italic numbered) e o mapa **revela-se pela primeira vez** (fade-in 700ms + flyTo). Cada novo stop: pin desenha-se, rota anima segmento.

5. **Diálogo contínuo**
   Composer permanece sempre acessível como pill bottom-right. Cada nova frase do utilizador ("mais devagar", "adiciona algo ao pôr-do-sol", "tira o último") → IA re-interpreta, mundo reage: chips removidos com fade-out, novos chips emergem, mapa reanima. Sem confirmações modais.

6. **Sussurros da IA (pacing/sugestões)**
   `suggestPacing` corre em background a cada mudança. Se houver aviso → aparece como **whisper line** Georgia italic fade-in/out 4s no topo da ribbon ("o ritmo está apertado — queres respirar?"). Não é card, não é modal, não bloqueia.

7. **Fecho — Memória**
   Quando o utilizador disser "estou pronto" / "guarda" / clicar no pill discreto "Guardar esta história" → cena escurece, ribbon expande para centro como **carta editorial** (Georgia italic título, lista de stops, sussurro final). Ações: copiar link / PDF / WhatsApp (reutiliza `ShareExport`). Sem "review screen".

---

## Componentes novos

| Componente | Ficheiro | Função |
|---|---|---|
| `AmbientStage` | `src/components/builder/v3/AmbientStage.tsx` | Layer 0: vídeo/imagem fullscreen reativa a mood+region, crossfade 600ms |
| `NarrativeComposer` | `src/components/builder/v3/NarrativeComposer.tsx` | Layer 2: input narrativo, mic, placeholder rotativo, estados (idle/listening/parsing) |
| `ChapterLine` | `src/components/builder/v3/ChapterLine.tsx` | Georgia italic top-left, gerada da IA |
| `EmergingChips` | `src/components/builder/v3/EmergingChips.tsx` | Sugestões flutuantes (não cards), fade-in escalonado |
| `ItineraryRibbon` | `src/components/builder/v3/ItineraryRibbon.tsx` | Lista vertical lateral, Georgia italic numbered, drag-to-reorder, swipe-to-remove |
| `WhisperLayer` | `src/components/builder/v3/WhisperLayer.tsx` | Sussurros transitórios da IA (pacing, sugestões), fade in/out |
| `LivingMap` | `src/components/builder/v3/LivingMap.tsx` | Wrapper sobre `BuilderMap` com revelação progressiva (hidden → fade-in ao 1º stop) |
| `MemoryCard` | `src/components/builder/v3/MemoryCard.tsx` | Cena final editorial + share/export |
| `useStudioState` | `src/hooks/useStudioState.ts` | Estado unificado (mood/who/intention/pace/region/stops/narrative/chapter), substitui `useBuilderFlow` no v3 |

`BuilderMap`, `parseNarrative`, `suggestFromIntent`, `suggestPacing`, `createJourney`, `ShareExport`, `useBuilderPersistence` — **reutilizados sem alterações**.

---

## Server functions

Uma nova, leve, tone-only:

- `generateChapter` (`src/server/builderChapter.functions.ts`) — recebe `{mood, who, intention, region, stopLabels}` → devolve 1 linha Georgia italic ≤80 chars em PT-PT (chapter line + sussurro final). Lovable AI `google/gemini-3-flash-preview`. Fallback determinístico. Nunca inventa stops/regiões.

As outras (`parseNarrative`, `suggestFromIntent`, `suggestPacing`) já existem.

---

## Rota

`src/routes/builder.tsx` — substituído por shell mínimo que monta `<StudioStageV3 />`. Toda a árvore antiga (`ChoicesGrid`, `ElementsShelf`, `StickyBar`, `BuilderProgressMeter`, `ReviewScreen`, `NarrativeCompanion`, `NarrativeIntro`, `PacingChip`) deixa de ser montada — ficheiros preservados no repo por enquanto (não apagados) para permitir rollback rápido. Adicionamos flag `?legacy=1` que monta a versão antiga (escape hatch durante teste).

`/i/$token` (landing partilhável) — mantido como está.

---

## Motion & A11y

- Todas as transições ≤300ms (cena), ≤220ms (UI). Crossfade da Layer 0 = 600ms (atmosférico, permitido).
- `prefers-reduced-motion`: desliga crossfades, route draw, fade-in do mapa (aparece imediatamente). Tudo continua funcional.
- Contraste: overlay charcoal 35-45% sobre vídeo garante 4.5:1 para Georgia italic ivory.
- Teclado: composer focável por defeito; Tab navega chips → ribbon → composer; Esc fecha overlays.
- Screen reader: `aria-live="polite"` na chapter line e whisper layer; ribbon como `<ol>`.
- Mobile-first (393×587 viewport do utilizador): composer ocupa bottom 30vh expandível, ribbon vira drawer inferior arrastável, mapa 40vh quando revelado.

---

## Ordem de implementação

1. `useStudioState` + `builderChapter.functions.ts`
2. `AmbientStage` + `NarrativeComposer` + `ChapterLine` (cena de abertura funcional)
3. `EmergingChips` + `LivingMap` (mundo desperta)
4. `ItineraryRibbon` + `WhisperLayer` (diálogo contínuo)
5. `MemoryCard` + integração `ShareExport`
6. Substituir `builder.tsx` por `StudioStageV3` + flag `?legacy=1`

Cada passo mergível e testável isoladamente no viewport mobile.

---

## Fora de scope

- Apagar componentes v1/v2 (ficam dormentes, removemos só após validação).
- Mudar `parseNarrative`/`suggestFromIntent`/dados de `builder_stops`.
- Voice-to-text avançado além de Web Speech API nativa.
- Homepage, navbar, Signature, Tailored, Proposals — intocados.
- Inventar stops, preços, partners ou copy de marketing. IA = tone only.

Confirma para começar pelo passo 1.