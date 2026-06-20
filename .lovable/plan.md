# Studio V3 — Hybrid Cinematic Builder (Plano Final)

Combina o cinemático do nosso Studio com a praticidade do reference (tier, add-ons, configurador Story/Timeline/Map), reordenado para **revelar cedo**, **converter melhor** e **medir cada passo**.

## 1. Princípios não-negociáveis

- Zero invenção: stops/preços/inclusions vêm de `signatureTours.ts`, `signatureAddOns.ts`, Viator meta (mem://constraints/yes-canonical-rules, mem://constraints/studio-v3-no-invented-stops).
- Studio philosophy mantém-se: guiado não perguntado, AI = voz, restraint > features.
- Editorial v2 + Typography v3 + Brand palette. Sem dark configurator copiado — traduzimos para charcoal-soft + gold rule + ivory cards.
- Mobile-first (393×588). A11y 4.5:1, touch 44×44, prefers-reduced-motion.

## 2. Nova ordem dos steps (10, não 11)

```text
1  Feeling                → atmosfera começa, mapa ganha 1ª cor
2  Companions             → 1ª imagem editorial fade-in
3  Rhythm + Pickup        → 1 step, 2 escolhas rápidas lado a lado
4  Destination            → REVEAL PARCIAL: hero da região + 2-3 stops fantasma
5  Investment tier        → MEIO — âncora alta, influencia curation real
6  Interests              → stops refinam (já filtrados pelo tier)
7  Add-ons                → catálogo filtrado pelo tier + companions
8  Date                   → quase a fechar, fricção temporal junto ao €
9  Configurator completo  → Story / Timeline / Map tabs + Quality + Affinity + €
10 Secure                 → modal deposit (50% Stripe) + opcional "Designer refine"
```

Por que esta ordem converte melhor:

- Reveal parcial no step 4 → utilizador imagina-se lá **antes** de ver preço.
- Investment no 5 → âncora alta (já está investido emocionalmente) + curation realmente filtra.
- Date só no 8 → não introduz "não tenho data" cedo (causa de abandono em booking funnels).

## 3. Visual mobile — anti-clutter

Cada step ocupa **um ecrã limpo** (393px largura, conteúdo ~360px), max 3 unidades de informação:

```text
┌─────────────────────────┐
│  STEP 5/10  ───────●··  │  ← stepper minimal, dot teal preenche
│                         │
│  EYEBROW GOLD           │  ← 10.5px tracking 0.26
│  H2 Montserrat 28px     │  ← 2 linhas max
│  Sub Inter 14px         │  ← 1 linha
│                         │
│  ┌───────────────────┐  │
│  │ CARD opção 1      │  │  ← ivory, border charcoal 10%
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │ CARD opção 2 ✓    │  │  ← selected: teal border, sand bg
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │ CARD opção 3      │  │
│  └───────────────────┘  │
│                         │
│  [< BACK]   [CONTINUE >]│  ← sticky bottom, 56px alto
└─────────────────────────┘
```

Regras:

- Máximo 4 cards por step. Mais que isso = overload (referência tinha 3, manter).
- Sem emojis dentro dos cards (referência usa 💎👑 — generic). Em vez disso, ícone Lucide pequeno teal ou letra capital Georgia.
- Card altura mínima 96px, padding 16/20, gap entre cards 12px.
- Botão CONTINUE sempre visível (sticky), gold sheen on hover (homepage scope), nunca espera scroll.
- Stepper: dot preenchido teal por step completo, linha gold subtil entre.

## 4. Reveal parcial no step 4 (Destination)

Quando o utilizador escolhe região:

1. Hero image da região (16:9, real Viator/operação) faz fade-in 320ms.
2. 2-3 stops "fantasma" aparecem com 50% opacity + microcopy italic "Stops will sharpen as you choose…"
3. 1ª linha de storyline aparece em Georgia italic teal.

Isto é o **momento "wow"** que falta hoje. Não revela tudo (ainda faltam Interests + Investment para o curation final).

## 5. Configurator step 9 — coração do hybrid

Surface única editorial (charcoal-soft surface, NÃO preto puro do reference):

```text
┌─────────────────────────┐
│  YOUR PORTUGAL DAY      │  ← H2 ivory sobre charcoal-soft
│  Architected for 2      │
│                         │
│  [STORY][TIMELINE][MAP] │  ← tabs pill, active = teal fill
│  ─────────────────────  │
│                         │
│  (conteúdo do tab)      │  ← min-height 480px, transição 220ms
│                         │
│  ─────────────────────  │
│  ★ SMART RECOMMENDATION │  ← ivory card sobre dark, 1 sugestão
│  Most couples add:      │
│  boutique tasting + …   │
│  [ADD IN 1-CLICK]       │
│  ─────────────────────  │
│  QUALITY 92%   ███████░ │  ← já existe, manter
│  ─────────────────────  │
│  Wine     ●●●●○         │  ← AffinityBars (4 axes, dots gold)
│  Coast    ●●●○○         │
│  Heritage ●●●●●         │
│  Ease     ●●○○○         │
│  ─────────────────────  │
│  ESTIMATED INVESTMENT   │
│  €145 /guest            │  ← Montserrat 36px ivory
│  Total €290 (party 2)   │
│  *includes private host…│  ← microcopy 11px charcoal-soft
│                         │
│  [RESHAPE DAY ↻]        │  ← gold rule, secondary CTA
│  [SECURE EXPERIENCE →]  │  ← primary, gold sheen
└─────────────────────────┘
```

**Story tab**: `JourneyStoryline` existente, prosa Georgia, hero region image.

**Tempo de distâncias entre paragens** 

**Map tab**: `PremiumMap` com rota Mapbox desenhada, markers, header "LISBON HUB · COORDINATE ROUTING" + "Length ~Xkm · Transfer ~Yh" (de `routeUI.totals`).

## 6. Analytics por step (Supabase)

**Nova tabela** `studio_v3_funnel_events`:

```sql
CREATE TABLE public.studio_v3_funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  step_number int NOT NULL,         -- 1..10
  step_key text NOT NULL,           -- 'feeling' | 'companions' | …
  event text NOT NULL,              -- 'enter' | 'select' | 'continue' | 'back' | 'abandon' | 'reshape' | 'tab_switch' | 'addon_toggle' | 'secure_open' | 'secure_confirm'
  value jsonb,                      -- { selection, tier, addon_id, tab, ms_on_step, … }
  variant text,                     -- A/B variant id (futuro)
  user_agent text,
  created_at timestamptz DEFAULT now()
);
GRANT INSERT ON public.studio_v3_funnel_events TO anon, authenticated;
GRANT ALL ON public.studio_v3_funnel_events TO service_role;
ALTER TABLE public.studio_v3_funnel_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can insert funnel events" ON public.studio_v3_funnel_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins read funnel" ON public.studio_v3_funnel_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_funnel_session ON public.studio_v3_funnel_events (session_id, created_at);
CREATE INDEX idx_funnel_step ON public.studio_v3_funnel_events (step_key, event, created_at);
```

**Client lib** `src/lib/studio-v3-funnel.ts`:

- `trackStep(stepNumber, stepKey, event, value?)` — batched, sendBeacon on `pagehide`/`visibilitychange=hidden` para capturar abandon.
- `useStepTimer(stepKey)` hook — emite `enter` on mount, `continue`/`back`/`abandon` on unmount com `ms_on_step`.
- Reuse `studioV3SessionId` já existente.

**Edge function** já não — escrita direta via publishable key (RLS INSERT permissivo, sem PII, OK).

**Admin dashboard** `src/routes/admin.studio-v3-funnel.tsx` (gated `has_role(admin)`):

- Funil visual: % chegou / completou cada step.
- Drop-off por step (highlight em vermelho > 25%).
- Tempo médio por step.
- Conversão por tier escolhido.
- Comparação antes/depois da mudança de ordem (filtro por data).

## 7. AI predictive coherence (reforço)

- `investmentTier` entra em `curation.pickPrimaryTour` score (ultimate prefere tours `premium`, standard prefere `accessibility`).
- Smart-recommendation derivada de `companions + interests + tier`:
  - couple+wine+premium → boutique tasting + scenic lunch
  - family+heritage+standard → palace visit + petiscos
  - friends+gastronomy+ultimate → barrel reserve + yacht transfer
- Guardrails FAMILY_ONLY_RE / ROMANTIC_ONLY_RE já existentes mantêm-se.
- Reshape day seeded + per-stop swap já existem.

## 8. Ficheiros

**Novos**

- `src/components/studio-v3/InvestmentTier.tsx`
- `src/components/studio-v3/AddOnsStep.tsx`
- `src/components/studio-v3/ConfiguratorTabs.tsx`
- `src/components/studio-v3/TimelineView.tsx`
- `src/components/studio-v3/SmartRecommendation.tsx`
- `src/components/studio-v3/AffinityBars.tsx`
- `src/components/studio-v3/PartialReveal.tsx` (hero + ghost stops no step 4)
- `src/components/studio-v3/StudioStepper.tsx` (10-step minimal)
- `src/lib/studio-v3-funnel.ts`
- `src/lib/studio-v3-funnel.functions.ts` (server fn helper, opcional)
- `src/routes/admin.studio-v3-funnel.tsx`
- Migration: `studio_v3_funnel_events` table
- Testes: `investment-tier.test.tsx`, `configurator-tabs.test.tsx`, `funnel-tracking.test.tsx`, `partial-reveal.test.tsx`

**Editados**

- `src/components/studio-v3/StudioV3.tsx` — nova ordem, novos steps, wire stepper + tracking
- `src/components/studio-v3/types.ts` — `investmentTier`, `addOns[]`, `configuratorTab`
- `src/hooks/useStudioState.ts` — persistir novos campos
- `src/components/studio-v3/curation.ts` — tier entra no score
- `src/components/studio-v3/SignaturePriceCard.tsx` — extrair add-ons, manter pricing source
- `src/components/studio-v3/MapAwakens.tsx` — integrar no novo Configurator
- `.lovable/plan.md` — atualizar

## 9. Fora de scope

- Homepage, navbar, footer, outras rotas.
- Tours data, edge functions de checkout (reusar).
- Bokun wiring (já existe).
- A/B testing real do step order (infra fica preparada via `variant` na tabela, mas não ativar agora).

## 10. Verificação

- `bunx vitest run` — 214 atuais + ~12 novos, todos verdes.
- Playwright mobile 393×588: screenshot de cada um dos 10 steps + 3 configurator tabs + secure modal.
- Funnel: dispara `enter` em cada step na nova sessão; tabela recebe insert.
- Build limpo, sem regressões nos guard workflows (hero, typography, homepage-structure).

## 11. Ordem de execução

1. Migration `studio_v3_funnel_events` + GRANTs + RLS.
2. `studio-v3-funnel.ts` + `useStepTimer` hook + testes.
3. Types + state (investmentTier, addOns, configuratorTab).
4. `StudioStepper` (10 steps, minimal).
5. `InvestmentTier` + `AddOnsStep` + `PartialReveal` componentes + testes.
6. `ConfiguratorTabs` + `TimelineView` + `SmartRecommendation` + `AffinityBars` + testes.
7. Reordenar `StudioV3.tsx` para nova sequência, wire stepper + tracking em cada transição.
8. Polir Secure modal + (opcional) Designer modal.
9. `admin.studio-v3-funnel` dashboard.
10. Full vitest + Playwright screenshots mobile + verify funnel inserts.

Aprovas?