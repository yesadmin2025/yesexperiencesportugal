
# Studio v2 → Builder real de itinerário único

## Visão (norte)

O cliente desenha **o seu dia**, não escolhe uma Signature pronta. O itinerário final é só dele, composto por **paragens reais** que já existem nos nossos tours Viator (tabela `builder_stops`, com `source_tour_keys` a provar a origem). Continua cinematográfico (philosophy v6), mas no fim o cliente tem **controlo editorial total** antes de reservar.

Reverto a decisão da última tranche: a CTA "Secure your experience" **não vai para `/experiences`** — passa a reservar este itinerário específico.

## Fluxo final

```text
Imagine → Atmosphere → Pace → Group → Priorities → Duration
        ↓
[Living Reveal cinematográfico]  ← já existe
        ↓
[Refine — editor do itinerário]  ← NOVO, o coração desta tranche
   • mapa real com rota desenhada
   • cards de paragens (swap, remove, reorder, ver alternativas)
   • re-otimização automática quando muda algo
   • respeita max_stops, max_km, drive time, compatibilidade
        ↓
[Secure — booking do itinerário custom]
   • envia o conjunto exato de paragens reais para Bokun no fim
```

## O que muda

### 1. Engine real (em vez de `previewJourney` decorativo)

Novo `src/lib/studio-v2/itinerary.functions.ts` (server fn):

- Input: `TravelerProfile` (intent, pace, group, priorities, duration, region opcional).
- Lê `builder_stops` ativos da Supabase + `builder_compatibility_rules` + `builder_routing_rules`.
- **Scoring por paragem**:
  - `intent` ↔ `intention_tags` (peso alto)
  - `priorityWeights` (food/culture/coastal/wellness/social) ↔ `mood_tags`
  - `pace` ↔ `pace_tags` + `duration_minutes`
  - `group` ↔ `who_tags`
  - bonus de compatibilidade com paragens já selecionadas
  - penaliza paragens fora do raio de drive (haversine entre `lat/lng`)
- **Routing** respeitando `builder_routing_rules`: min/max stops, max km dia, max km entre stops, max hours, pace multiplier.
- Output: array ordenado de paragens reais (com `source_tour_keys` preservadas como prova).

### 2. Refine — editor editorial (a peça nova)

Novo `src/components/studio-v2/RefineStage.tsx`, inserido entre Reveal e Secure.

Por paragem (card mobile-first):
- imagem real (via `useBuilderRouteImages` que já temos)
- duração, micro-blurb, tags
- **3 ações**: `Swap` (drawer com alternativas top-scored compatíveis), `Remove`, `Reorder` (long-press / setinhas — sem libs pesadas).

Estado:
- "Refinements" passam pelo mesmo engine para recalcular drive time/feasibilidade.
- Banner discreto quando uma alteração quebra regras (`Drive time excede X min — sugerimos remover Y`).
- Botão "Reset to YES design" repõe a sugestão original (já temos `trackBuilderEvent("review_reset")`).

Mapa: `BuilderMap` no topo, sticky, redesenha rota a cada mudança (já temos `previewJourney` — vou trocar pelo novo engine).

### 3. Secure → booking real, não bounce

- Remove `window.location.href = "/experiences"`.
- Nova server fn `createCustomBookingDraft` grava o itinerário (paragens + perfil) numa tabela `studio_v2_bookings` (draft status), retorna `draftId`.
- CTA passa a abrir `/builder/checkout?draft=<id>` (página fina que mostra resumo + chama o endpoint Bokun/Stripe que já existe — `create-builder-checkout`).
- Mantém telemetria `studio_v2_secure_click`.

### 4. Persistência + voltar atrás

Já existe `studio_v2_sessions` + `/s/$token`. Estendo:
- Botões "Editar atmosfera / ritmo / grupo / prioridades" no topo do Refine — saltam ao beat correspondente mantendo as paragens já refinadas (merge, não reset).
- `MemoryDeck` já permite jump; adapto para incluir "Refine" como último card.

### 5. Limpeza / coerência

- Re-pontar telemetria: `studio_v2_refine_swap`, `studio_v2_refine_remove`, `studio_v2_refine_reorder`, `studio_v2_draft_created`.
- Remove o destino `/experiences` na CTA Secure (correção da tranche anterior).

## Detalhes técnicos

```text
src/lib/studio-v2/
  ├── itinerary.functions.ts   NEW  server fn: scoreStops + composeItinerary
  ├── itinerary.server.ts      NEW  pure scoring/feasibility helpers
  └── engine.ts                EDIT previewJourney delegates to itinerary engine

src/components/studio-v2/
  ├── RefineStage.tsx          NEW  editor cards + sticky map + warnings
  ├── StopSwapDrawer.tsx       NEW  alternative-stops bottom sheet
  └── StudioV2.tsx             EDIT inserir beat "refine" entre reveal e secure

supabase migrations
  └── studio_v2_bookings       NEW  draft itineraries (jsonb stops + profile)
```

Tabela nova (mínima, RLS estrita):

```sql
create table public.studio_v2_bookings (
  id uuid primary key default gen_random_uuid(),
  share_token text not null unique,
  profile jsonb not null,
  stops jsonb not null,        -- snapshot das paragens reais
  total_minutes int,
  total_km numeric,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);
grant insert, select on public.studio_v2_bookings to anon, authenticated;
grant all on public.studio_v2_bookings to service_role;
alter table public.studio_v2_bookings enable row level security;
-- só leitura por share_token (passado no path, não em PII)
create policy "read by token" on public.studio_v2_bookings
  for select using (true);  -- token é o segredo, como já fazemos em studio_v2_sessions
```

## Guardrails respeitados

- **Paragens reais apenas** (nada inventado — tudo de `builder_stops` com `source_tour_keys`).
- AI continua só para tom narrativo (já implementado), nunca inventa factos.
- Mobile-first (cards, drawers, long-press > drag libs).
- Sem libs novas pesadas — reuso `BuilderMap`, `useBuilderRouteImages`, motion já permitido (fade+translateY ≤220ms).
- Bokun/Stripe no fim — reusa `create-builder-checkout` existente.

## Plano de execução

| Tranche | Entrega |
|--------:|---------|
| **F.1** | Engine real (`itinerary.functions.ts` + `.server.ts`), `previewJourney` passa a usar dados reais. Reveal já mostra paragens reais no mapa. |
| **F.2** | `RefineStage` com swap/remove/reorder, drawer de alternativas, re-otimização live, warnings de feasibilidade. |
| **F.3** | Migração `studio_v2_bookings` + `createCustomBookingDraft` + CTA Secure passa a abrir checkout do draft (reverte `/experiences`). |
| **F.4** | Voltar-atrás merge (editar beats sem perder refinamentos), telemetria completa, polish copy + a11y. |

Confirma e arranco pela **F.1** (engine real). Se preferires que ataque primeiro a F.3 (corrigir já a CTA Secure que ficou errada), também posso inverter a ordem.
