# Plano: Studio V3 Builder — Conversão + Aparência Premium

Foco: remover fricção, aumentar confiança e elevar o "wow" sem inventar factos. Tudo medível via `studio_v3_funnel_events` (já existe).

---

## 1. Primeira impressão (Intro → Name → Pickup)

**Problema atual:** intro é forte mas os primeiros 3 passos têm rhythm desigual; em mobile o header ainda compete com o conteúdo.

- **Header invisível nos primeiros 2 beats** — só logo YES centrado + back discreto. Sem progress bar até ao 3º passo (reduz "form anxiety").
- **Micro-prova social subtil no Intro** — uma linha Georgia italic em gold-soft: "Designed today by 12 travellers" (real count via Supabase, fallback escondido). Aumenta urgência sem ser pushy.
- **Skeleton premium** durante hidratação (ivory shimmer 600ms) em vez do flash branco que ainda acontece em mobile lento.

## 2. Ritmo cinematográfico (entre passos)

**Problema:** vídeos por vezes não casam com a escolha, e algumas transições parecem repetitivas.

- **Beat audit**: mapear cada combinação (companions × style × pickup) a um clip único; criar matriz em `studio-scene-clips.ts` com fallback inteligente (nunca repetir o último clip).
- **Crossfade 280ms + Ken Burns lento (scale 1→1.04, 6s)** em todos os beats — sensação de filme, não slideshow.
- **Frase Georgia italic por beat** já existe mas tornar contextual ao input do user (ex: nome do user, região escolhida) — personalização = retenção.

## 3. Mapa que evolui (Creation Moments)

**Problema:** mapa ainda parece estático entre stops; em mobile a info compete com o mapa.

- **Pin sequencing** — cada novo stop entra com spring + gold pulse + camera pan suave (já meio implementado, falta refinar timing: 420ms entrance, 600ms pan).
- **Route polyline com gradient gold→teal** desenhada com `stroke-dasharray` animation (não apenas linha sólida).
- **Chips drive/dwell** colapsam para um único chip "~2h 40min · 3 stops" em mobile <430px; expandem on-tap.
- **Legend já tem aria** ✓ — adicionar tooltip "Real driving time" para reforçar confiança.

## 4. Lógica de add-ons e inclusões (CRÍTICO p/ conversão)

**Problema reportado:** add-ons sugerem picnic quando o tour já inclui almoço.

- **Conflict matrix** em `deriveInclusionTags`: lunch_included → esconde picnic/lunch add-ons; wine_tasting_included → esconde wine_pairing add-on; etc. (parcialmente feito, fazer audit completo).
- **Inclusion spine no Reveal** já existe ✓ — mostrar inclusões com ícone gold-soft + "Already included" badge.
- **Add-ons mostram delta de preço E delta de tempo** ("+45 min · +€80") — transparência reduz hesitação.

## 5. Reveal (momento da verdade)

**Problema:** o reveal é onde se decide a compra — precisa ser o ponto mais cinematográfico.

- **Sequência de revelação**: fade-in título 0ms → mapa 200ms → spine 400ms → preço 700ms → CTA 900ms. Stagger premium.
- **"Your day at a glance"** card sticky no topo em mobile com: duração total, drive total, idioma, guests.
- **Trust strip** discreto antes do CTA: "Real itinerary · Local designer review · Free cancellation 48h". Texto pequeno (11px), tracking wide, charcoal-soft.
- **Preço com âncora**: mostrar tier "Most chosen" com gold underline em vez de só listar 3 tiers iguais.

## 6. CTA & Checkout

- **"Say YES" button** com gold sheen sweep on hover (já existe nas home) — replicar no Studio.
- **Microcopy abaixo do CTA**: "Secure your day · Stripe-protected · Cancel free for 48h" (já em test mode).
- **Sticky CTA em mobile** após scroll do reveal — não perder o momento.
- **Exit-intent suave** (desktop) ou scroll-up no mobile → "Save this day" (email capture) em vez de deixar abandonar.

## 7. Acessibilidade & performance (afeta SEO + conversão)

- Auditar contraste de todos os chips gold-soft sobre ivory (alguns falham 4.5:1).
- Preload do clip do próximo beat assim que user faz seleção (reduzir buffering).
- Lighthouse mobile target: LCP <2.5s, CLS <0.05 no /studio-v3.

## 8. Telemetria & A/B

- Eventos novos: `beat_skip` (user clica continue <2s = beat não engaging), `addon_view_time`, `reveal_scroll_depth`.
- Dashboard `/admin/studio-v3-funnel` já existe — adicionar **drop-off heatmap por passo** + tempo médio por beat.
- A/B candidatos: (a) número de add-ons mostrados (3 vs 5), (b) ordem do tier picker (cheapest first vs "most chosen" first), (c) sticky CTA on/off.

---

## Ordem de execução proposta (3 batches)

**Batch A — Quick wins (alto impacto, baixo risco):**
1. Conflict matrix completa de add-ons (#4)
2. Trust strip + microcopy no CTA (#6)
3. Sticky CTA mobile (#6)
4. Stagger sequence no Reveal (#5)

**Batch B — Premium polish:**
5. Header invisível primeiros 2 beats (#1)
6. Beat audit + crossfade Ken Burns (#2)
7. Chips colapsáveis no mapa mobile (#3)
8. Inclusion spine com badges (#4)

**Batch C — Conversion machine:**
9. Preço com "Most chosen" anchor (#5)
10. Eventos novos + heatmap admin (#8)
11. Email capture exit-intent (#6)
12. Preload do próximo clip (#7)

Queres que arranque pelo **Batch A** já?
