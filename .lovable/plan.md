## Próximo nível: Imagem premium + inteligência preditiva real

Comparei o estado atual do Studio Drift contra a Bible e contra os teus dois pedidos. Aqui está o plano focado.

---

### A — Camada visual premium (imagem + vídeo)

**Diagnóstico**
- 7 cenas em loop (`SCENES`) — algumas são fortes (Arrábida, candle table) mas o mix tem buracos: falta movimento humano íntimo, mão a verter vinho, pão a partir, mesa de família ao entardecer, cruzamento de rua com vapor de café, passos numa adega.
- Sem curadoria editorial por capítulo — qualquer chapter pode cair em qualquer cena, partindo o arco emocional.
- Sem fade cinematográfico forte: corte é abrupto entre scenes (apenas `<SceneVideo>` swap).
- Sem grain / film texture overlay → aspeto digital "stock travel".

**Execução**

1. **Curadoria por intenção (não por estilo)**
   Cada cena ganha tags semânticas (`mood: ["arrival","intimacy","celebration","slowness","discovery","temptation","ritual"]`) e um `intensity` 1-5. O scene router escolhe por `mood + intensity + confidence`, não por `style==coast`.

2. **Novas cenas (criadas via imagegen premium, cinemagraph-still)**
   8 imagens novas em src/assets/drift/ (não vídeo — fotografia editorial parada com Ken Burns subtil 1.02→1.05 over 7s). Mais barato e mais premium do que vídeo stock:
   - mão a verter vinho tinto em copo, luz lateral âmbar
   - pés descalços em mosaico português ao amanhecer
   - mesa partilhada vista de cima, pão rasgado e azeitonas
   - silhueta de pescador a recolher rede ao entardecer
   - reflexo de elétrico em vidro embaciado
   - vinha em silêncio, neblina baixa, sem pessoas
   - mão a acender vela em jantar íntimo
   - vista de janela com cortina de linho ao vento

3. **Composição de scene = vídeo OU imagem cinemática**
   `Scene` ganha `kind: "video" | "still"` + `still?: { src, ken: "pull" | "push" | "drift" }`. O `<SceneVideo>` torna-se `<SceneCanvas>` que faz fade entre dois layers (out: 1.4s, in: 1.6s, overlap 0.7s) — cross-dissolve cinematográfico, não cortes.

4. **Grain & filmstock overlay (sempre)**
   CSS único `.drift-filmgrain` (SVG noise 4% opacity + slight vignette + warm LUT via blend-mode) aplicado por cima de qualquer scene. Único toggle: `prefers-reduced-motion` desliga grain pulse.

5. **Image preference behavior signal (alimenta a inferência)**
   Tap-and-hold numa imagem (>500ms) ou double-tap = sinal forte ("attraction"). Hover/linger >2s = sinal médio. Skip rápido (<800ms) = sinal negativo (decay nesse mood). Liga à secção B.

---

### B — Motor preditivo real

**Diagnóstico do atual**
- `inference.ts` faz bump/decay limpo mas só recebe sinais discretos: `EXPLICIT` (1.0) em escolha, `SOFT*amount*0.45` em linger.
- Nada lê pacing global (utilizador rápido vs lento), nada conta skips, nada deteta padrão de atração visual (ex.: 3 imagens íntimas seguidas → colapsar todas as perguntas de social/companions).
- Sem "narrowing" — o utilizador rápido faz na mesma todos os capítulos.

**Execução**

1. **Behavior tracker (`src/lib/drift/behavior.ts`, novo)**
   Hook `useDriftBehavior()` regista, em memória + sessionStorage:
   - `decisionLatency[]` — ms entre scene-in e tap
   - `lingerEvents[]` — ms parado num scene sem ação
   - `skipEvents[]` — opções não escolhidas mas vistas
   - `attractionEvents[]` — long-press / double-tap / re-hover em scenes
   - `pacingClass` derivada: `decisive` (mediana <1.2s), `exploratory` (>4s), `balanced` (entre)
   - `intensityPreference` — média de `intensity` das scenes que ganharam attraction

2. **Predictive layer (`src/lib/drift/predict.ts`, novo)**
   Função pura `derivePrediction(confidence, behavior) → Prediction` que retorna:
   - `collapseNextChapters: string[]` — IDs de capítulos a saltar (quando `totalConfidence ≥ 0.78` OU pacingClass=`decisive` e ≥3 capítulos feitos)
   - `pacingHint: "compress" | "linger"` — usado pelo `holdMs` e densidade de whispers
   - `revealConfidence: 0–1` — gate para CTA final (`>0.6` = reservar direto, `<0.4` = "falar com um local")
   - `sceneWeighting: Record<mood, number>` — pesos passados ao scene router
   - `tonalRegister: "intimate" | "expansive" | "playful" | "ritual"` — passado ao revealJourney AI para a story final mudar de registo

3. **Integração no `StudioDrift`**
   - `holdMs` deixa de ser fixo: `chapter.holdMs * (pacingHint==="compress" ? 0.55 : pacingHint==="linger" ? 1.35 : 1)`
   - `advance()` consulta `collapseNextChapters` e salta para a próxima permitida
   - `ChoicePhase` ordena opções por `sceneWeighting[opt.scene.mood]` e esconde opções com peso <0.15 (quando ainda há ≥2 opções)
   - Whispers entre capítulos só aparecem se `pacingClass !== "decisive"` OU se `intensityPreference > 3.5` (utilizador atento)

4. **Server-side: `revealJourney` ganha `prediction`**
   - Aceita `tonalRegister` no input. System prompt da Lovable AI muda de registo conforme: "intimate" = candle/breath; "expansive" = horizonte/largueza; "ritual" = repetição/sagrado.
   - Recebe `intensityPreference` → influencia ordering dos stops no `composeDay` (mais íntimos primeiro para utilizadores `intimate`).
   - Devolve `story.arc[3-4]` em vez de `microStory` único, com cada linha amarrada a um stop real.

5. **Telemetria (`drift_behavior_events`, tabela nova)**
   Insere por sessão: `{ session_id, pacing_class, attraction_count, skip_count, revealed_confidence, collapsed_chapters }`. Permite afinar limiares mais tarde sem deploy.

---

### C — Reveal final cinematográfico (consequência de A+B)

- `BuilderMap` aparece full-bleed no topo (50vh) com polyline teal animada
- `story.arc[]` corre sobre o mapa, cada linha highlighta o pin correspondente
- CTA final é único, escolhido por `revealConfidence`: alto → "reservar este dia" (teal sólido), baixo → "falar com um local" (gold outline)
- Sem barras de progresso visíveis no reveal — o utilizador acabou de chegar, não vamos quebrar com UI

---

### Ficheiros

**Novos**
- `src/lib/drift/behavior.ts` — tracker + hook
- `src/lib/drift/predict.ts` — derivação pura da prediction
- `src/assets/drift/*.jpg` — 8 imagens editoriais geradas via `imagegen` premium
- `src/components/builder/v3/SceneCanvas.tsx` — cross-dissolve vídeo/still + grain
- migration: `drift_behavior_events` table

**Editados**
- `src/components/builder/v3/StudioDrift.tsx` — SCENES com tags mood/intensity/kind, ChoicePhase com weighting, holdMs dinâmico, Convergence com BuilderMap + arc
- `src/lib/drift/inference.ts` — extender com `pacingClass` e sinais attraction (mantém retrocompat)
- `src/server/driftEngine.functions.ts` + `.server.ts` — aceita prediction, devolve `story.arc`
- `src/styles.css` — `.drift-filmgrain`, `.drift-arc-line`, ken-burns keyframes

### Fora do scope (deliberadamente)
- i18n (próxima passada — disseste para focar nestes dois)
- mudar Stripe/Bokun
- mexer na homepage ou noutras rotas

### Riscos / decisões
- Gerar 8 imagens editoriais usa `imagegen premium` (≠ Lovable AI Gateway). Custa mais mas é único caminho para imagens premium reais — alternativa é parar e pedires upload de fotografia real licenciada. Recomendo gerar (premium tier) e tu validares antes de eu integrar.
- Behavior tracker mantém-se client-side; só envia agregados anonimizados para a tabela. Sem PII.
