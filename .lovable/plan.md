# Experience Studio → Cinematic Journey OS

Evolução faseada do `/builder`. **Homepage não é tocada.** Mantemos o stepper atual e elevamos a sua qualidade emocional, cinemática e operacional. AI corre em background (sugestões silenciosas), respeitando a regra canónica: nunca inventa stops, preços ou itinerários.

---

## Princípios não-negociáveis

- **Sem novos stops fictícios.** AI só reordena/sugere a partir de `builder_stops` reais e respeita `builder_compatibility_rules` + `builder_routing_rules`.
- **Mobile-first** (viewport 393 é o canvas principal). Desktop adapta depois.
- **Tokens da marca** (teal/gold/ivory/sand/charcoal). Sem novos hex.
- **Motion permitido fora da home**: fade + translateY 12–16px, hover lift -2px, route draw, accordion — tudo ≤220ms. Sem parallax, sem glass.
- **Reutilizar primitivos**: `<Eyebrow>`, `<SectionTitle>`, `<CtaButton>`, `BuilderMap`, `JourneyPanel`. Não criar duplicados.
- **Reduced-motion sempre respeitado.**

---

## Fase 1 — Fullscreen Cinematic Shell

Eleva o stepper atual a uma experiência imersiva, sem reescrever o flow.

- Novo wrapper `BuilderStage` (fullscreen, 100dvh, ivory base, sem SiteLayout chrome dentro do builder — navbar fica minimal/transparente sobre o stage).
- Transições entre steps: cross-fade + translateY 14px (≤220ms). Cada step entra como uma "cena".
- Mapa promovido a **camada de fundo persistente** no mobile (40vh top, sticky), e split 50/50 no tablet+. Já não fecha entre steps.
- Header do step: eyebrow ("Capítulo 02 — Ritmo"), título Montserrat, sub-linha Georgia italic. Cria sensação de capítulos.
- Progress meter atual repensado como **timeline editorial** discreta (gold tick + label), substituindo o stepper numérico.
- Sticky bar mantém-se mas com fundo `--ivory`/blur leve e CTA primário com arrow ramp.

Ficheiros: novo `BuilderStage.tsx`, refactor leve de `builder.tsx`, evolução de `BuilderProgressMeter.tsx`, `StickyBar.tsx`.

---

## Fase 2 — Mapa como Motor Narrativo

O `BuilderMap` deixa de ser componente de apoio e passa a contar a história.

- **Reveal progressivo**: a cada step, o mapa anima para a próxima escala (região → sub-zona → cluster de stops), com `flyTo` ≤700ms easing `easeInOutCubic`.
- **Pins emocionais**: substituir o teardrop genérico por marcador editorial (círculo ivory + borda gold + ícone do `tag` do stop). Pin selecionado pulsa gold uma vez.
- **Route draw cinemático**: já existe; melhorar para desenhar segmento a segmento (não tudo de uma vez) e adicionar "ghost" da próxima sugestão AI em gold tracejado.
- **Camadas opcionais** (toggle discreto, canto inferior): "mood overlay" (tinta quente em zonas costeiras / fria em interior, opacity 0.08) — só visual, sem dados inventados.
- **Mapa não some no mobile**: collapse para 32vh com handle para arrastar até 70vh. Substitui o atual "abrir mapa" modal.
- Per-region zoom memory mantém-se (regra existente).

Ficheiros: `BuilderMap.tsx` (evoluir, não substituir).

---

## Fase 3 — AI Silenciosa (Lovable AI Gateway)

Camada de inteligência que **nunca inventa**, apenas reordena e justifica.

- Nova server fn `suggestNextStops` (`src/server/builderAI.functions.ts`):
  - Input: estado atual do builder (mood, pace, who, intentions, região, stops escolhidos).
  - Lê de `builder_stops` filtrados pela região + tags + `compatible_with` + `builder_compatibility_rules`.
  - Chama Lovable AI (`google/gemini-3-flash-preview`) com tool-calling estruturado para escolher 2–3 stops da lista real e devolver um micro-rationale editorial (≤90 chars).
  - Output validado por Zod; descarta qualquer stop key que não exista em `builder_stops`.
- UI: bloco discreto "Sugestão silenciosa" acima do `ElementsShelf` — chip ivory com label do stop + 1 linha de rationale. Sem chat bubble.
- Telemetria: `builder_events` (já existe) com `event='ai_suggest_shown' | 'ai_suggest_accepted'`.
- Rate limit reutiliza `builder_rate_limits` (já existe).

Sem nova tabela. Sem chat. Sem inventar.

---

## Fase 4 — Storytelling Progression

Transforma o flow em "capítulos" emocionais sem mudar a ordem técnica.

- Catalogue (`catalogue.ts`) ganha campo `chapter` (Mood = "O tom", Pace = "O ritmo", Who = "Com quem", Intentions = "O que vos move", Region = "Onde", Stops = "Os momentos").
- Micro-copy de transição entre steps (já existe `TRANSITION_MICROCOPY`) refinada para Georgia italic curta (≤60 chars), aparece 600ms entre cenas.
- Itinerário (`JourneyPanel`) ganha estado "história a montar-se" — cada novo stop entra com fade + linha do mapa a desenhar-se em sincronia.
- Review screen ganha capa editorial (hero do stop principal + título do journey gerado pela AI em tom, não em factos).

---

## Fase 5 — Operacional & Reutilização

Limpeza e preparação para escalar.

- Auditar `builder.tsx` (1311 linhas) → extrair lógica de orquestração para hook `useBuilderFlow.ts`. Componente fica fino.
- Garantir que `JourneyPanel`, `BuilderMap`, `StickyBar`, `BuilderStage` são reutilizáveis no `MultiDayBuilder` sem duplicação.
- Supabase: zero mudanças de schema nesta fase. Todas as tabelas necessárias (`builder_stops`, `builder_regions`, `builder_routing_rules`, `builder_compatibility_rules`, `builder_journeys`, `builder_events`, `builder_rate_limits`) já existem.
- Adicionar índice em `builder_stops(region_key, is_active)` se ainda não existir (verificar antes).

---

## Fora de scope (explicitamente)

- Homepage / hero / navbar — **não tocar**.
- Chat AI visível, copiloto conversacional, fullscreen chat-like flow.
- Novos stops, regiões, preços, parceiros inventados.
- Substituir Mapbox/Leaflet por outro motor.
- Mudar checkout (Stripe sandbox) ou booking truth model.

---

## Ordem de execução

1. **Fase 1** (shell cinemático) — base visual, baixo risco.
2. **Fase 2** (mapa narrativo) — maior impacto emocional.
3. **Fase 3** (AI silenciosa) — backend + UI mínima.
4. **Fase 4** (storytelling) — copy + micro-transições.
5. **Fase 5** (refactor) — limpeza final.

Cada fase entrega valor isolado e é mergível independentemente. Confirma a Fase 1 para começar, ou diz-me se queres reordenar / cortar fases.
