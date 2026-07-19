## Motion v4 — Cinematic Parallax Site-Wide

Objetivo: sensação editorial high-end genuína (Black Tomato / Aesop / Kinfolk digital), com parallax controlado em **todo** o site (não só hero), imagens que "respiram", texto que entra em camadas com peso — sem bounce, sem spring, sem overshoot, sem gimmicks.

### O que muda na filosofia

- Autorização de parallax site-wide (revogo a regra "parallax = homepage-only"). Aplicado a: heroes, imagens editoriais, capas de tour, chapter leads, backgrounds de secção. Mantém-se OFF em Studio V3, Checkout, Auth, Admin (conversão/foco).
- Curva única site-wide: `cubic-bezier(.2,.7,.1,1)` (ease-out longo, zero overshoot). Nunca `spring`, nunca `elastic`, nunca `back`.
- Motion sempre GPU-only: `transform`, `opacity`, `filter`, `clip-path`. Guardrail `check-motion-budget.mjs` mantém-se verde.
- `prefers-reduced-motion` desliga tudo (estático).

### 1. Parallax multi-camada (o que faltava)

Substituir o `ParallaxLayer` atual (single-layer, cap 20px) por sistema de **3 camadas com profundidades diferentes** — é isto que dá a sensação "high-end", não translations maiores.

`<ParallaxScene>` — container que expõe `--scroll-progress` (-1 → 1) via rAF partilhado (um único listener global, não um por instância — crítico para performance com N cenas).

`<ParallaxLayer depth="back|mid|fore">` — cada camada translada por múltiplo do progresso:
- `back` (imagem/background): 40px, blur 0→0
- `mid` (overlay/gradient): 20px em direção oposta
- `fore` (texto/eyebrow/CTA): 8px, ligeira contra-direção
- Cap absoluto: 48px. Em mobile <768px: reduzido a 60% (não desligado — o utilizador quer ver movimento no mobile também).

### 2. Novos primitives cinematográficos

Adicionar a `src/components/motion/`:

- **`<ParallaxScene>` / `<ParallaxLayer depth>`** — substitui o atual `ParallaxLayer`.
- **`<ImageReveal>`** — clip-path inset diagonal 0→100% (900ms) + `scale(1.08→1)` + `filter: blur(6px)→0` sincronizados. Substitui o `MaskReveal` atual em imagens grandes. Faz sentir "câmara a focar".
- **`<TextRise stagger>`** — versão upgraded de `SplitLines`: cada linha entra com `translateY(120%)→0` + `opacity 0→1` + máscara vertical, stagger configurável 40/60/80ms. Também aceita `words` mode (palavra a palavra) para eyebrows/lead paragraphs.
- **`<GoldRule>`** — filete gold que "desenha" da esquerda (scaleX 0→1, 720ms, origem left). Marca abertura de secção editorial.
- **`<AmbientDrift>`** — micro-movimento contínuo (loop 18-24s, translate ±4px + scale 1.00→1.02) para imagens de "atmosphere" em backgrounds. Só quando a imagem está em viewport. Substitui o `ken-burns-slow` genérico atual.
- **`<StickyCaption>`** — legenda/número que fica sticky durante o scroll do bloco e faz cross-fade entre estados (para capítulos Signature).

### 3. Aplicação por família de rota

**Heroes (todas as rotas exceto excluídas):**
- `<ParallaxScene>` com 3 camadas: imagem back, gradient scrim mid, título+CTA fore.
- Título via `<TextRise>` linha a linha.
- Eyebrow com `<GoldRule>` a preceder.

**Home:** manter vídeo hero. Aplicar Parallax multi-camada nas secções seguintes (Occasions cards com depth back/fore separadas, FourWaysIn com gold rule + text rise, Guest Moments com AmbientDrift nas imagens).

**Experiences (Signature index):** cada card de tour com `<ImageReveal>` diagonal + parallax `back` na capa + `fore` no título; entrada em stagger diagonal (não vertical linear).

**Tour detail:** hero com scene multi-camada; cada "capítulo do dia" abre com GoldRule + TextRise; imagens do dia com ImageReveal alternando direção; mapa mantém-se.

**Local Stories:** cover com ImageReveal + AmbientDrift; drop-cap Fraunces no primeiro parágrafo; imagens inline com ImageReveal.

**Editorial (About, Corporate, Moments, Press, Reviews, Travel Designer):** cada secção major abre com GoldRule + TextRise; uma imagem hero por página com ParallaxScene; imagens de suporte com AmbientDrift subtil.

**Portugal Travel Designer:** mesmo tratamento editorial.

**Excluídos (zero motion novo, só RouteFade):** Studio V3, Builder, Checkout, Tailor, Auth, Admin, API.

### 4. Performance — não negociável

- Um único `requestAnimationFrame` global (`src/lib/motion/scroll-driver.ts`) que notifica todas as `ParallaxScene` registadas. Evita N listeners.
- `IntersectionObserver` gate: parallax só corre quando a cena está em viewport (± 20% rootMargin).
- `will-change: transform` aplicado no `enter`, removido no `leave`.
- Imagens hero mantêm `fetchpriority="high"` + preload; blur-in só após `img.decode()` resolver (não empurra LCP).
- Budget: LCP ≤ 2.5s / CLS < 0.05 / INP < 200ms em mobile mid-tier. Medido antes/depois.

### 5. Tokens CSS a adicionar

```
--motion-ease-cine: cubic-bezier(.2,.7,.1,1);
--motion-dur-reveal: 900ms;
--motion-dur-rise: 720ms;
--motion-dur-rule: 720ms;
--motion-drift-loop: 22s;
--parallax-cap-desktop: 48px;
--parallax-cap-mobile: 28px;
```

### 6. Verificação obrigatória antes de "done"

1. `check-motion-budget.mjs` verde + `check-css-braces.mjs` verde.
2. Playwright em 393×706: screenshots a 3 depths de scroll (0/50/100%) em `/`, `/experiences`, `/tours/:id`, `/local-stories/:slug`, `/about`, `/corporate`, `/portugal-travel-designer`. Verificar que camadas se movem a velocidades diferentes.
3. Lighthouse mobile em `/` e `/experiences` — LCP/CLS/INP dentro do budget.
4. Teste `prefers-reduced-motion: reduce` — nada anima, tudo visível estático.
5. FPS check via Playwright trace em scroll rápido de `/` — sem long tasks >50ms atribuíveis a scroll handlers.

### 7. Rollout em 3 batches

- **B1 — Foundation (sem visual change ainda):** scroll-driver global, `<ParallaxScene>`/`<ParallaxLayer depth>`, `<ImageReveal>`, `<TextRise>` upgraded, `<GoldRule>`, `<AmbientDrift>`, `<StickyCaption>`, tokens CSS, deprecar `ParallaxLayer` v3 sem remover (mantém compat).
- **B2 — Heroes + Home + Experiences + Tour detail:** rotas de maior visita. Medir LCP/INP antes/depois.
- **B3 — Editorial pages (About, Corporate, Moments, Press, Reviews, Travel Designer, Local Stories, Portugal Travel Designer):** mesmo sistema.

### Fora de scope

- Studio V3, Builder, Checkout, Tailor, Auth, Admin (excluídos por conversão/foco).
- GSAP/Lenis/Locomotive/Framer Motion novo (tudo custom com IO + rAF partilhado).
- Vídeo/WebGL/canvas.
- Reescrever `CinematicHero` da home (aprovado, mantém-se).

### Deliverable

Relatório em `docs/motion-v4-report.md` com métricas Lighthouse antes/depois por rota + screenshots parallax a 3 depths + confirmação budget verde.
