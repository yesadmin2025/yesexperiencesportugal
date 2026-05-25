# Plano — Combinação Studio + Builder Clássico para Conversão Real

## Diagnóstico

**Studio v3 (cinematic):** converte *dreamers* e gera desejo, mas falha com decisores e travel agents que precisam de velocidade, transparência e controlo.

**Builder clássico /builder (1412 linhas):** rápido, transparente, mapa+stops+preço, mas genérico e sem percepção de luxo.

## Estratégia — 3 modos, 1 motor de dados

| Modo | Rota | Persona | CTA principal | Status |
|---|---|---|---|---|
| STUDIO (cinematic) | `/studio-drift` | Dreamer mobile | "Começar a sonhar" | ✅ Existe |
| FAST (60s) | `/studio-drift` + `studio.fastPace` | Decisor mobile | Continua no Studio mais rápido | ✅ Existe — falta reforçar (Phase C) |
| PRO MODE | `/builder?mode=pro` | Travel agent / power user | Constrói, partilha, cota | ⏳ Entry adicionado, lógica em fases |

## Fase A — Entry point (✅ feito agora)
- Adicionado link discreto "sou agente de viagens" no AmbientPrologue (PT/EN/ES/FR).
- Liga para `/builder?mode=pro`.
- Validação imediata: vemos no analytics quantos cliques recebe antes de investir em UI.

## Fase B — Pro Mode visual no /builder (próximo)
Quando `?mode=pro` está activo no /builder:
- **Skip narrativa:** entra direto em mapa + grid de stops (RegionStep + ElementsShelf visíveis lado a lado).
- **Preço por pax visível desde início** (não whisper) — usa `signature-pricing` real.
- **Multi-pax slider 1–8** no topo, recalcula em real-time.
- **Header com badge "Pro mode"** + toggle para sair para Studio normal.
- **Esconde:** PredictiveMoment, NarrativeCompanion, EncouragementBar emocional.

## Fase C — Shareable proposal + reforço Fast
1. **Shareable link** no /builder?mode=pro:
   - Botão "Gerar proposta partilhável" usa `builder_journeys` (tabela já existe com `share_token` + `owner_token_hash`).
   - Rota `/i/$token` (já existe) renderiza proposta read-only com branding YES + CTA "Reservar".
2. **Fast reforçado no Studio:** mostra preço/pax no estágio `resolved` (não só `convergence`) quando `studio.fastPace=1`.

## Fase D — Power features para agents (futuro)
- Toggle "Margem do agent" (slider 0–25%) que adiciona linha "comissão" no quote.
- Export PDF com co-branding (agent logo + YES).
- "Save & duplicate" para fazer múltiplas propostas para o mesmo cliente.
- Modo multi-cliente (lista de propostas geradas).

## Princípios não-negociáveis
1. **Studio nunca vira configurador.** Pro Mode é rota separada `/builder?mode=pro`, não polui `/studio-drift`.
2. **Dados reais sempre.** Pro Mode usa `builder_stops`, `signature-upgrades`, `signature-pricing` — nunca inventa.
3. **Sem comparações.** Copy do Pro Mode é function-led ("Constrói com transparência total"), não competitive.
4. **Entry discreta.** Link "sou agente de viagens" nunca compete visualmente com o Studio.
5. **Mobile first** sempre — Pro Mode tem layout mobile-first (mapa colapsável + lista scroll).

## Métricas de validação
- CTR no link "sou agente de viagens" (target: ≥3% dos visitantes do Studio).
- Taxa de geração de proposta partilhável em Pro Mode (target: ≥30% dos que entram).
- Booking rate Pro vs Studio (Pro deve ter 2–3× a taxa do Studio).

---

## Próximos passos imediatos (aguarda OK)
1. **Phase B** (visual Pro Mode em /builder) — 1 turn, requer ler builder.tsx completo.
2. **Phase C** original (Smart Reco + Investment detalhado no Studio reveal) — também pendente.

Recomendo: fazer Phase B **antes** da Phase C, porque Pro Mode tem ROI B2B imediato e validável.
