# Experience Studio v2 — Fullscreen, AI-Assisted, Conversational

Aprofunda o plano original (já em curso, Fase 1 entregue) com três eixos que escolheste: **fullscreen imersivo total**, **IA com recomendações silenciosas** e **fluxo conversacional narrado**. Tudo respeita as regras canónicas: zero stops/preços inventados, mobile-first, tokens da marca, motion ≤220ms fora da home.

---

## Eixo A — Fullscreen Cinematic Shell (evolui Fase 1+2)

Objetivo: o builder deixa de viver dentro de `SiteLayout` e passa a ser um palco contínuo.

- Novo `BuilderStage` (100dvh, ivory base, sem header/footer do site dentro do flow). Navbar minimal flutua por cima, fundo transparente, dissolve no topo.
- **Mapa persistente como camada de fundo** (40vh mobile sticky, split 50/50 tablet+). Já não fecha entre passos.
- Transições cena-a-cena: cross-fade + translateY 14px (≤220ms), com `TRANSITION_MICROCOPY` em Georgia italic entre cenas (600ms).
- Timeline editorial substitui o stepper numérico (tick gold + label do capítulo).
- Mapa narrativo: `flyTo` ≤700ms a cada escolha, pins editoriais (ivory + borda gold), route draw segmento-a-segmento, ghost da sugestão AI em gold tracejado.
- Mobile: mapa colapsa para 32vh com handle drag até 70vh (substitui modal atual).

Ficheiros: novo `src/components/builder/BuilderStage.tsx`, evoluir `BuilderMap.tsx`, `BuilderProgressMeter.tsx`, `StickyBar.tsx`.

---

## Eixo B — IA Silenciosa Aplicada a Tudo

A IA já existe para `intent` (`builderIntent.functions.ts`). Estendemos sem nova UI ruidosa.

- Nova server fn `suggestPacing` (Lovable AI Gateway, `google/gemini-3-flash-preview`, tool-calling): recebe stops escolhidos + pace + who → devolve ordem ótima e aviso editorial se o ritmo está apertado (≤90 chars). Nunca inventa stops.
- Nova server fn `suggestNextStops`: 2–3 sugestões reais da base `builder_stops` filtradas por região/tags/`compatible_with`, com micro-rationale.
- UI silenciosa:
  - chip "Sugestão" acima do `ElementsShelf` (ivory + borda gold, 1 linha).
  - Banner discreto no topo do itinerário com aviso de pacing ("ritmo apertado — considera tirar uma paragem").
- Telemetria reutiliza `builder_events` (`ai_suggest_shown`, `ai_suggest_accepted`, `ai_pacing_warning_shown`).
- Rate limit via `builder_rate_limits` (já existe). Fallback determinístico se a IA falhar.

Sem nova tabela. Sem chat. Sem inventar.

---

## Eixo C — Fluxo Conversacional Narrado (camada opcional sobre o stepper)

Mantém o stepper técnico mas adiciona um modo "narrativa" — o utilizador descreve em texto livre e o builder pré-preenche escolhas.

- Novo passo inicial opcional: **"Conta-me em uma frase"** (textarea ivory, placeholder editorial). O utilizador escreve "fim-de-semana romântico, vinho e mar, sem pressa".
- Server fn `parseNarrative` (nova, em `src/server/builderNarrative.functions.ts`):
  - Input: texto livre (≤500 chars).
  - Chama Lovable AI com tool-calling estruturado → devolve `{mood, pace, who, intentions, regionHint}` (apenas valores válidos dos enums).
  - Output validado por Zod, nunca aceita valores fora dos enums.
- UI: depois de parse, o builder salta para o passo Region/Stops com tudo pré-selecionado e um chip "Ajustado a partir da tua história" (gold, dismissible).
- Skip permitido: utilizador pode ignorar e ir direto ao stepper clássico.
- A narrativa também alimenta `suggestFromIntent` (já existe) para ranking inicial dos stops.

Sem chat contínuo. É um único momento de input narrativo que acelera o stepper.

---

## Ordem de execução (faseada)

1. **Fase 2 (em curso) — Mapa narrativo + Stage fullscreen** (Eixo A). Maior impacto visual imediato.
2. **Fase 3 — IA silenciosa estendida** (Eixo B). Backend + chips discretos.
3. **Fase 4 — Modo narrativa** (Eixo C). Passo opcional + parse server fn.
4. **Fase 5 — Storytelling progression + refactor `useBuilderFlow`** (já no plano original).

Cada fase é mergível isoladamente. Confirma para arrancar a Fase 2.

---

## Fora de scope (mantém-se)

- Homepage / hero / navbar — não tocar.
- Chat AI visível ou copiloto conversacional contínuo.
- Novos stops, regiões, preços, parceiros.
- Substituir Mapbox/Leaflet.
- Mudar checkout ou booking truth model.
