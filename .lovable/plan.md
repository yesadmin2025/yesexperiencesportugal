
## 1. Audit — Studio v2 vs. YES Brand Bible

Testei o flow completo no mobile (393×844). Confirmações principais:

### Críticas (quebram o bible)
| # | Problema | O que o bible exige |
|---|---|---|
| 1 | **Sem imagens reais em nenhum beat.** O "reward image" é apenas um gradient de cor com uma frase. Sente-se como questionário. | "Every major experience type ships with 1 hero + 3–5 supporting story images. Editorial, cinematic, candid. Soft fades on transitions." |
| 2 | **Sem painel de história viva.** Cada step substitui o anterior; não há story contínua a crescer com cada escolha. | "Live story updates with each selection. Editorial, skimmable, adapts to the user's name." |
| 3 | **Sem Experience DNA visível, sem Experience Investment, sem timeline.** | Painel direito DEVE mostrar story + imagery + timeline + Investment + DNA — todos atualizando live. |
| 4 | **Ordem de steps fora do bible.** Atual: Name → Atmosphere → Pace → Priorities → Group → Ops. Bible: Welcome → Name → Group type → Guests → Duration (1-day/multi-day) → Style → Highlights → Pace → Enhancements → Tier → Reveal. Falta Duration, Enhancements e Tier. | Step flow não-negociável. |
| 5 | **CTAs e voz fora da library.** "Begin", "Continue", "Design my day" em vez de "Design From Scratch", "Start Designing", "Secure Your Experience". O padrão `YES — …` está ausente nas confirmações intermédias. | CTA library §9. Voice §5. |
| 6 | **Reveal sem o moment YES.** Sem "YES — you have just created your Signature Portugal Experience", sem trio Secure / Save / Refine, sem "Experience Investment". | §8 §9 §10. |
| 7 | **Mobile-first sim, mas tap targets dos chips de Priorities < 44px.** | §14. |

### Pontos a manter
- A ideia intercalada Choice → Reward é correta na direção (matches "cinematic discovery, interface disappears").
- Atmosphere backdrop por intent é boa base.
- Persistent chat fab pequeno e teal cumpre "WhatsApp = optional support only".

---

## 2. Plano de correção (faseado, mobile-first)

### Fase A — Tornar visível e cinematográfico (corrige a queixa principal)

1. **Imagery real, editorial, por atmosphere.** Gerar 6 hero images (Relaxed & scenic, Elegant & cultural, Food-led & local, Social & celebratory, Romantic & intimate, Coastal & cinematic) — 4:5 mobile-first, golden hour, sem texto, sem logos. Substituir o gradient do `RewardImageBeat` por imagem real com overlay charcoal 35% e whisper em italic Georgia.
2. **Option cards fotográficos.** Cada `OptionCard` em Atmosphere e Priorities passa a ser um tile com micro-imagem 16:10 + label sobreposto. Soft crossfade ao seleccionar. Tap target 44px garantido.
3. **Backdrop com imagem (não só gradient).** O `atmosphere` global ganha uma camada `<img>` desaturated 18% opacity sob o gradient — diferente por intent.

### Fase B — Story viva + DNA + Investment (corrige sensação de "form")

4. **Living Story Strip (bottom sheet mobile).** Componente fixo no fundo, 64px collapsed → 60vh expanded. Mostra:
   - DNA pills a aparecer uma a uma (`Romantic · Slow · Coastal · Wine-led`)
   - Linha narrativa que cresce parágrafo a parágrafo (cada escolha adiciona uma frase, nunca apaga)
   - Mini-mapa com pins a cair em sequência
   - Experience Investment a contar visualmente (€X from)
   - Expansível com um swipe ↑
5. **Linha narrativa adaptativa.** Helper em `lib/studio-v2/content.ts` que devolve a frase incremental por (intent, pace, priorities, group). Phase 1 = rule-based; Phase 2 = chamada OpenAI (tone-only) numa server function.

### Fase C — Step flow alinhado ao bible

6. **Reordenar para:** Welcome → Name → **Group type → Guests** → **Duration (1-day / multi-day)** → Atmosphere/Style → Priorities/Highlights → Pace → **Enhancements** (sunset boat, private chef, helicopter — checkboxes com preço) → **Tier** (Curated · Signature · Bespoke) → Thinking → Reveal.
7. **Smart defaults.** Se Group = couple, saltar "guests" (default 2). Se intent = "coastal", pré-seleccionar 2 priorities relevantes (utilizador pode mudar).

### Fase D — Reveal de alta conversão

8. **YES Moment headline:** `YES — you have just created your Signature Portugal Experience.`
9. **Layout reveal:**
   - Hero da viagem (imagem do stop principal) com nome personalizado: *"Maria's Coastal Portugal Story"*
   - Story escrita de ponta a ponta (3–4 parágrafos editoriais)
   - Mapa final com rota desenhada (Mapbox, reutiliza `BuilderMap`)
   - Timeline horizontal com timestamps reais
   - **Experience Investment** card: `from €X per person · all-inclusive · instant confirmation`
   - DNA pills finais
   - **Trust band micro:** 500+ travellers · Private only · Designed by locals
10. **CTA trio (ordem do bible):**
    1. `Secure Your Experience` (primary gold)
    2. `Save My Experience` (secondary ghost, gera link partilhável + email opt-in opcional)
    3. `Refine with a Local Designer` (tertiary text, abre o chat fab com contexto pré-preenchido)
11. **Conversion boosters:**
    - Scarcity real: query Supabase `availability` para a região nos próximos 30 dias → "3 dates available this month"
    - Badge "Instant confirmation" (test mode allowed)
    - Share story link → SSR OG card com o título personalizado

### Fase E — Diferenciadores únicos (o que ninguém mais faz)

12. **Memory deck.** No topo, uma pilha horizontal de "cards memória" — cada escolha que o utilizador faz vira um card 56×76px que se empilha à direita. Tocar num card volta àquele beat. Substitui o progress bar abstracto por algo tangível.
13. **Ambient mode toggle.** Pequeno ícone discreto no header: ondas do Atlântico / fado leve / silêncio. Off por default, respeita prefers-reduced-motion. Cria uma camada sensorial que nenhum operador português tem.
14. **Live route drawing.** No `RewardMapBeat` e no reveal, a linha do percurso desenha-se com `stroke-dasharray` animation (≤700ms, dentro das guardrails do homepage motion mas aqui justificado pela natureza do builder).
15. **AI tone layer (OpenAI gemini-2.5-flash via Lovable AI Gateway).** Server function `studioNarrative.functions.ts` recebe `TravelerProfile`, devolve 1 headline + 3 parágrafos editoriais no tom YES. Cache por hash do profile. Inputs/outputs validados com Zod. Nunca inventa stops/preços (esses vêm do `designExperience` engine).
16. **Save = link assinado.** `i.$token.tsx` já existe — gerar token Supabase, devolver URL curta `/i/abc123`. Abre o reveal exacto, retomável.

### Fase F — Polimento e A11y

17. Tap targets ≥44px em todos os chips e botões (Priorities atual ~32px).
18. Visible focus ring gold em todos os interactivos.
19. Contrast pass: texto sobre imagens com overlay charcoal mínimo de 35%.
20. `prefers-reduced-motion` desliga route draw + memory deck flip + ambient mode.

---

## 3. Sugestão estratégica

O builder deve deixar de parecer "uma sequência de perguntas com recompensas" e passar a parecer **um filme curto em que o utilizador é o protagonista e cada escolha estende a cena**. Os três pilares para o tornar único no mercado português:

- **Sensorial** (imagery editorial + ambient sound opcional + route drawing) → emoção.
- **Tangível** (memory deck + living story + DNA pills + investment counter) → sensação de estar a *desenhar* algo real.
- **Inteligente** (smart defaults + tone AI + scarcity real + share token) → conversão sem fricção.

---

## 4. Detalhes técnicos

- **Stack:** Supabase (availability, save tokens, narrative cache), Mapbox (route draw — reutiliza `BuilderMap`), Lovable AI Gateway (`google/gemini-2.5-flash` para tom), `createServerFn` para narrative + availability + save-token.
- **Imagens:** geradas com `imagegen` quality `standard`, importadas como ES6 em `src/assets/studio/`, alt text descritivo.
- **Componentes novos:** `LivingStoryStrip.tsx`, `MemoryDeck.tsx`, `PhotoOptionCard.tsx`, `AmbientToggle.tsx`, `RevealHero.tsx`, `InvestmentCard.tsx`.
- **Server fns novas:** `studioNarrative.functions.ts`, `studioAvailability.functions.ts`, `studioSaveToken.functions.ts`.
- **Tabelas Supabase novas:** `studio_saves (token, profile_json, created_at, expires_at)`, `studio_availability_cache (region, date, slots)`.
- **Sem alterações fora do `/studio-v2`**: o resto do site fica intacto.

## 5. Ordem de execução proposta

1. Fase A (imagens + photo option cards) — desbloqueia a queixa actual.
2. Fase B (living story + DNA + investment) — desfaz a sensação de form.
3. Fase C (step flow bible) — alinha estrutura.
4. Fase D (reveal de alta conversão) — fecha o funil.
5. Fase E (diferenciadores) — torna-o único.
6. Fase F (polish + a11y) — pronto a publicar.

Cada fase é entregável e testável isoladamente. Posso começar pela Fase A já se aprovares.
