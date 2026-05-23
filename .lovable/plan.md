# Plano — Drift Fase 1 (revisto)

Três correcções aplicadas: **hybrid inference** (não tudo inferido), **whispers mínimos e operacionais**, **scoring ponderado simples** (sem bandit ainda).

---

## 1. Modelo híbrido de inputs

O profile do utilizador é construído por **três fontes combinadas**, com prioridade clara:

| Fonte | O que captura | Quando |
|---|---|---|
| **Explicit whispers** (4 fixos) | pickup, companions, duration (day/multi), radius | Pontos-chave do flow, embutidos como cenas — não formulário |
| **Behavioral signals** | style, energy, social, mood (tap em fragmentos, tempo em cena, swipe, hover) | Contínuo, em background |
| **Interaction analysis** | confidence boosts, hesitação, re-watch, skip | Contínuo, ajusta scoring |

**Regra:** os 4 dados operacionais **nunca são inferidos** — são sempre perguntados (de forma natural). Tudo o resto é inferido por comportamento.

### Os 4 whispers fixos (locked copy)
1. *"Where does this story begin?"* → pickup (lisbon / centro / alentejo)
2. *"Who's coming with you?"* → companions (solo / couple / family / group)
3. *"One day, or several?"* → duration (day / multi)
4. *"How far would you follow the feeling today?"* → radius (near / far)

Aparecem como cenas inteiras (full-screen, Georgia italic, 2–4 tiles), não como inputs num formulário. Sem labels, sem progress bar, sem "Step 2/4".

---

## 2. Arquitectura simplificada

```text
   Drift UI ──► /drift/session/start   ──► sessionId + first scene
              ──► /drift/scene/next    ──► próxima cena (ou whisper, ou reveal)
              ──► /drift/scene/answer  ──► grava resposta + signals → devolve próxima
              ──► /drift/reveal        ──► compose day + story + DNA
```

Só 4 endpoints. Tudo síncrono, sem filas, sem bandit.

---

## 3. Bible-as-data (mantido, enxuto)

Tabelas Supabase (Fase 1):

- `drift_scenes` — biblioteca (id, type: `atmosphere` | `fragment` | `whisper` | `reveal`, media_url, eligible_when JSONB, signals_emitted JSONB, copy_key)
- `drift_voice` — copy editável por chave (welcome, midway, reveal_lines, whisper prompts, completion CTAs) com slots `{name}`, `{region}`
- `drift_dna_tokens` — tokens visuais + regra de activação simples (threshold por dimensão)
- `drift_session_events` — telemetria (scene shown, signal, answer, drop-off, conversion) — **só grava**, ainda não re-pondera

**Não criamos** ainda: `drift_scene_rules` (regras ficam em código Fase 1), `drift_tiers` (tier inferido por composer), `drift_quality_rules` (continua em `regionRules.ts`).

Migração para DB acontece na Fase 2, quando houver tráfego.

---

## 4. Motor (server) — simples e legível

`src/server/driftEngine.functions.ts`:

### 4.1 `startSession()` → `{ sessionId, firstScene }`
Cria sessão. Primeira cena = atmosfera (vídeo Portugal cinemático, sem texto), 6–8s.

### 4.2 `nextScene({ sessionId })` → `Scene`
Decide próxima cena por **regras determinísticas** (sem AI, sem bandit):

```text
Routing rules (Fase 1):
1. Se pickup ainda desconhecido E já passaram ≥2 cenas → whisper "pickup"
2. Se companions desconhecido E pickup conhecido → whisper "companions"
3. Se duration desconhecido E companions conhecido → whisper "duration"
4. Se radius desconhecido E duration conhecido → whisper "radius"
5. Senão → atmosphere ou fragment com maior score (ver §5)
6. Após 4 whispers + ≥3 fragments → reveal disponível
```

### 4.3 `answerScene({ sessionId, sceneId, answer })` → `{ profile, nextScene }`
Aplica answer (whisper) ou signal (fragment tap/hover) ao profile, devolve próxima cena.

### 4.4 `reveal({ sessionId })` → `{ composedDay, story, dna, cta }`
- `composedDay` = composer actual (já existe, lê profile)
- `story` = Lovable AI (gemini-3-flash-preview) em tool-calling mode com stops reais + voice templates → devolve `heroLine`, `microStory`, `completionLine`. **Nunca inventa stops.**
- `dna` = tokens activados por threshold (ex.: `intimate` se `social: intimate` confidence > 0.6)
- `cta` = único, contextual ("Reservar este dia" / "Guardar" / "Refinar com local")

---

## 5. Scoring ponderado (Fase 1)

Para cada cena candidata (fragment/atmosphere):

```text
score(scene) =
    affinity_match(scene.signals_target, profile) * 3
  + freshness_bonus(scene, history)              * 2
  + region_relevance(scene, profile.pickup)      * 2
  + priority(scene)                              * 1
  - already_shown_penalty                        * 5
```

Pesos hardcoded, ajustáveis num único ficheiro `src/server/driftEngine.weights.ts`. Sem learning, sem A/B automático na Fase 1.

---

## 6. Frontend (mudanças mínimas em StudioDrift)

`StudioDrift.tsx`:
1. Abre sessão no mount → `startSession()`
2. Renderiza cena devolvida (componente já existe por tipo: `Atmosphere`, `Fragment`, `Whisper`, `Reveal`)
3. Tap/swipe/timeout → `answerScene()` → renderiza próxima
4. Quando `scene.type === 'reveal'` → chama `reveal()` e mostra composed day + story

Reaproveita: `NameWhisper`, `NarrativeComposer` (só aparece no whisper aberto opcional pós-reveal), `WhisperLayer`.

**Sem nova UI.** Mesma estética.

---

## 7. Conversão (Fase 1)

CTA único no reveal:
- **primary:** "Reservar este dia" (test mode — confirma sem pagamento real)
- **secondary:** "Guardar para depois" (email opcional)
- **tertiary:** "Refinar com um local" (WhatsApp)

Copy vem de `drift_voice` (editável sem deploy). Sem upsell, sem tier selector — tier é inferido e reflectido na linguagem da story, não como botão.

---

## 8. Ficheiros (Fase 1)

**Novos**
- `supabase/migrations/<ts>_drift_engine_phase1.sql` — `drift_scenes`, `drift_voice`, `drift_dna_tokens`, `drift_session_events` + RLS (public read em scenes/voice/dna; insert-only em session_events anon)
- `src/server/driftEngine.functions.ts` — 4 server fns acima
- `src/server/driftEngine.server.ts` — scoring, routing rules, story prompt
- `src/server/driftEngine.weights.ts` — pesos isolados
- `src/lib/drift/signals.ts` — tipos partilhados

**Editados**
- `src/components/builder/v3/StudioDrift.tsx` — passa a consumir engine
- `src/lib/drift/composer.ts` — sem alteração funcional (só recebe profile do engine)

**Não toca**
- `regionStops.ts`, `regionRules.ts`, `signatureTours.ts`, homepage, outras rotas

---

## 9. O que **não** entra na Fase 1

- ❌ Bandit / RL / scene optimization automático
- ❌ Re-ponderação por telemetria
- ❌ A/B automático de cenas
- ❌ Admin UI para editar Bible (Fase 4)
- ❌ Bókun real / Stripe live (Fase 3)
- ❌ Drift scene rules em DB (ficam em código)

Telemetria **grava** (para a Fase 2 ter dados), mas não actua.

---

## 10. Critério de sucesso da Fase 1

Um utilizador chega ao `/studio-drift`, atravessa 4 whispers + 3–5 fragmentos atmosféricos em ~90s, recebe um dia real composto com story coerente e clica num CTA. Sem formulário, sem fricção, sem inventar nada.

---

## Confirmação antes de avançar

1. **Whispers locked?** Os 4 prompts acima ficam fixos para Fase 1 (sem variantes AI)?
2. **Seed de cenas:** uso apenas os vídeos que já existem em `/public/video/scene-*.mp4` para a biblioteca inicial, ou queres-me passar uma lista do que falta?

Se sim aos dois, avanço já com a migração + engine.
