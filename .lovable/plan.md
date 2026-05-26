
# Studio v2 — "Adivinhar o pensamento"

Reescrever o Studio v2 para que o cliente sinta que o sistema lê o gosto dele em vez de o interrogar. Cumpre a Studio Bible: interface desaparece, guiado não perguntado, Portugal sentido cedo, AI orquestra, ritmo > features, revelação cria desejo.

## Princípio central

O cliente NUNCA escolhe região, ritmo, prioridades, intensidade ou tier. Só fornece o que é **logisticamente impossível adivinhar**: número de pessoas e cidade de pickup. Tudo o resto é inferido em silêncio através de comportamento em cenas atmosféricas reais.

## Fluxo (5 momentos, ~90s)

```text
1. ABERTURA (silêncio + Portugal a respirar)
   Full-bleed real (Arrábida ao amanhecer). Sem copy de boas-vindas.
   Uma frase aparece devagar: "Deixa o teu instinto guiar-te."
   Tap em qualquer sítio → entra.

2. TRÊS CENAS (mood reading invisível)
   Full-bleed, real Portugal. Sem perguntas, sem botões "escolher".
   Cada cena tem 2 micro-fragmentos sobreponíveis (ex: "mesa partilhada" vs
   "miradouro vazio"). O sistema lê: linger time, qual fragmento foi tocado,
   swipe direction, scroll velocity. Zero quizz framing.

   Cenas sorteadas dos 4 eixos da DB (mood/pace/intention/who) para cobrir
   espectro: gastronomia↔natureza, social↔íntimo, costa↔interior,
   cultural↔sensorial.

3. DOIS DADOS LOGÍSTICOS (única "pergunta" do flow)
   Card único, minimal, ivory:
   • Quantos vão? [stepper -/+, default 2]
   • De onde partem? [autocomplete: Lisboa, Cascais, Setúbal, Évora, Porto…]
   Continuar → fade.

4. MOMENTO DE CONVICÇÃO ("acertei")
   3-4s de processamento invisível, com frase que se monta:
   "Sente-se que procuras [mood inferido] perto de [região inferida].
    Vou desenhar um dia [pace] para [n] pessoas, a partir de [pickup]."
   Sem "queres confirmar?". Botão único: "Mostra-me".

5. REVELAÇÃO (Living Itinerary)
   Mapa Mapbox + paragens reais de builder_stops (combinadas dos
   source_tour_keys da mesma região). Tempo de drive real via builder_route_cache.
   Imagens reais. Drive time honesto. Refine discreto (long-press swap),
   nunca em cima. CTA "Reservar" só aparece após scroll do itinerário.
```

## Motor invisível — `inferStudioIntent`

Server fn nova `inferStudioIntent` (em `src/lib/studio-v2/intent.functions.ts`):

**Inputs:** array de signals capturados nas 3 cenas:
```ts
{ sceneId, lingerMs, tappedFragmentId, swipeDir, dwellBeforeAdvance }
```

**Output:**
```ts
{ region, mood, pace, intent, confidence,
  convictionLine: string  // "Sente-se que procuras…"
}
```

**Lógica:**
- Cada fragmento mapeia a `mood_tags + intention_tags` reais da DB.
- Mood vector = soma ponderada (linger × 1.0, tap × 1.5, swipe-toward × 0.7).
- Região = a que tem maior cobertura de stops com mood ∩ inferred_mood
  (query a `builder_stops` agregando por `region_key`).
- Pace inferido do ritmo de interacção: dwell rápido → "rich/full",
  contemplativo → "light/balanced".
- Intent derivado do par mood+pace dominante.

## Composição da itinerário (mantém realismo)

Reusar `composeRealItinerary` já existente, agora alimentado pelo perfil
inferido + `pax` e `pickup` reais:
- `pickup` define **stop 0** (ponto de partida) → reordena nearest-neighbour
  a partir daí, não do score-leader.
- Paragens só de `builder_stops` activas da região inferida, combinando
  `source_tour_keys` de vários Signature tours dessa região.
- Drive times via `builder_route_cache` (OSRM) — já implementado.
- Nada inventado.

## O que sai

Remove dos sequence de StudioV2.tsx: `choice-group`, `choice-duration`,
`choice-priorities`, `choice-pace`, `choice-enhancements`, `choice-tier`,
`choice-ops`, `MemoryDeck`, progress bar, eyebrows numerados, region picker.

## O que entra

- `OpeningScene.tsx` — full-bleed silêncio.
- `MoodScene.tsx` — cena cinematográfica com 2 fragmentos overlay + signal capture.
- `LogisticsCard.tsx` — único card de inputs (pax + pickup).
- `ConvictionMoment.tsx` — frase que se monta + botão único.
- `LivingItinerary.tsx` (já existe) — alimentado pelo perfil inferido.

## Telemetria (manter, expandir)

Novos eventos em `builder-analytics.ts`:
- `studio_v2_scene_signal` (sceneId, lingerMs, tappedFragmentId)
- `studio_v2_intent_inferred` (region, mood, pace, confidence)
- `studio_v2_logistics_submitted` (pax, pickupCity)
- `studio_v2_conviction_shown` (line, confidence)
- `studio_v2_reveal_shown` já existe (`studio_v2_map_reveal`).

## Realismo / guardrails

- Zero invenção: paragens, blurbs, durações e imagens vêm de `builder_stops`.
- Pickup é texto livre com autocomplete sobre cidades reais (lista curada
  de origens operacionais, não freeform sem validação).
- Frase de convicção é template com slots, nunca AI-generated marketing copy.
- Mood/intent inferidos têm fallback "balanced/scenic" quando confidence < 0.4.
- Reduce-motion: cross-fades em vez de parallax.
- A11y: cada cena tem alt + skip button discreto canto inferior.

## Out of scope (deste loop)

- Visual da checkout sheet (mantém actual).
- Multi-dia (apenas single day por agora).
- Pricing dinâmico (mostrar "from €X p/p" só na sheet, já existe).
- Tradução EN (PT primeiro, EN num loop seguinte).
- Builder clássico em `/builder` (intocado).
- Homepage e Signature pages (intocado).

## Ficheiros tocados

- `src/lib/studio-v2/intent.functions.ts` (NEW) — server fn de inferência.
- `src/lib/studio-v2/intent.server.ts` (NEW) — scoring puro, testável.
- `src/lib/studio-v2/content.ts` — adiciona `MOOD_SCENES` (3 cenas reais com 2 fragmentos cada, mapeados a tags da DB).
- `src/lib/studio-v2/itinerary.functions.ts` — aceita `pickup` para sequência.
- `src/components/studio-v2/StudioV2.tsx` — sequence reescrita (5 momentos).
- `src/components/studio-v2/OpeningScene.tsx` (NEW)
- `src/components/studio-v2/MoodScene.tsx` (NEW)
- `src/components/studio-v2/LogisticsCard.tsx` (NEW)
- `src/components/studio-v2/ConvictionMoment.tsx` (NEW)
- `src/components/studio-v2/LivingItinerary.tsx` — props ajustados ao perfil inferido.
- `src/lib/builder-analytics.ts` — novos eventos.

## Validação contra a Bible

✓ Interface desaparece (silêncio → cenas full-bleed → 1 card → revelação)
✓ Guiado, não perguntado (2 dados logísticos só, resto inferido)
✓ Portugal sentido cedo (3 cenas atmosféricas reais antes de qualquer input)
✓ AI orquestra (motor invisível, sem chat, sem decoração)
✓ Restraint (zero filtros, zero sliders, zero tier picker)
✓ Adivinhação genuína (momento de convicção mostra que o sistema "leu")
