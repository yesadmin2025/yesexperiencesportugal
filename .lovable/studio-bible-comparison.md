# Studio V3 ↔ Studio Bible — Comparison Report
_Generated: 2026-06-17 · Scope: Fases 1–6 do `.lovable/plan.md`_

## 1. Executive summary

| Fase | Estado | Tests | Bible alignment |
|---|---|---|---|
| **Fase 1 — Operational truth registry** | ✅ Shipped | 8/8 pass | ✅ "AI orchestrates, never invents" reforçado |
| Fase 2 — Caps regionais explícitos | 🟡 Proposto (cap global 3 já cobre casos atuais) | n/a | Parcial |
| Fase 3 — Reduzir fases via inferência | ⛔ Não iniciado | n/a | Gap: "Guided not asked" |
| Fase 4 — Reveal cinematográfico final | ⛔ Não iniciado | n/a | Gap: "Longing / restraint" |
| Fase 5 — Telemetria de curation | 🟡 Parcial (`[studio-v3.phase4]` existe; falta `curation.decision`) | n/a | Parcial |
| Fase 6 — Banda de preço indicativo | ⛔ Pendente decisão (TEST MODE) | n/a | N/A |

---

## 2. Fase 1 em detalhe — Operational truth registry

### O que mudou
- **Novo ficheiro** `src/data/stopOperational.ts` com:
  - `interface StopOperationalRule` com `match` (RegExp), `closedOn` (weekdays 0–6), `closedDates` (ISO), `reason`, `source` obrigatório.
  - `STOP_OPERATIONAL_RULES` exportado — começa com Mercado do Livramento (closedOn: [1], source mun-setubal.pt).
  - `weekdayFromIso()` — anchored a 12:00 UTC para evitar bug de timezone.
  - `isStopClosedOn(haystack, dateExact)` — combina regex + weekday + closedDates.
- **`src/components/studio-v3/curation.ts`**: removeu o array `STOP_CLOSURES` inline e a função `weekdayFromIso` duplicada; agora importa de `@/data/stopOperational`.
- **3 call-sites alinhados** (`MapAwakens`, `ComposerMap`, `LivingJourneyPanel`) — `dateExact` atravessa `resolveStudioV3Route` → `curateJourney` sem ramos paralelos.

### Acceptance criteria vs plan.md
| Critério (plan.md §Fase 1) | Verificação | Resultado |
|---|---|---|
| Schema explícito com `match`, `closedOn`, `closedDates`, `source` | `code--view src/data/stopOperational.ts` linhas 11–22 | ✅ |
| Permite adicionar novos stops sem editar `curation.ts` | curation.ts só importa `isStopClosedOn` | ✅ |
| Suite paramétrica | `curation-operational.test.ts` (8 testes) | ✅ |
| Mercado do Livramento bloqueado às 2ª | teste "Arrábida wine day Monday" | ✅ pass |
| Volta a aparecer 3ª feira | teste de regressão | ✅ pass |
| `dateExact` malformado não crasha | teste defensivo | ✅ pass |
| `seasonal` field | declarado no plan, **não implementado** ainda | ⚠️ deferido (sem stop sazonal real para alimentar) |

### Gaps remanescentes da Fase 1
- `seasonal: { from, to }` foi previsto mas não está no schema final — adicionar quando entrar o 1º stop sazonal (Regaleira inverno, p.ex.).
- Registry tem só **1 regra**. Para entregar valor real, próxima onda deve incluir: Quinta da Regaleira (último horário sazonal), Capela dos Ossos (datas religiosas), Palácio da Pena (manutenção quinzenal).

---

## 3. Bible north-star scorecard (atualizado)

| Pilar da Bible | Pré-Fase 1 | Pós-Fase 1 | Comentário |
|---|---|---|---|
| Cinematic discovery, not configurator | 7/10 | 7/10 | Sem mudança — reveal final continua estático (Fase 4). |
| Guided not asked | 6/10 | 6/10 | 8 fases intactas. Fase 3 ainda pendente. |
| Portugal felt early | 8/10 | 8/10 | Silhueta + gold pulse mantidos. |
| **AI orchestrates, never invents** | 7/10 | **9/10** | Registry com `source` obrigatório fecha o ciclo de "verdade operacional". |
| Restraint > features | 6/10 | 6/10 | Sem regressão; sem melhoria. |
| Brand guardrails (motion ≤220ms) | 9/10 | 9/10 | Inalterado. |
| **No-invention + Signature truth** | 7/10 | **9/10** | Closures factuais + citáveis. |

---

## 4. Riscos / dívida técnica

1. **Registry com 1 regra só** — risco percebido baixo, mas valor real só aparece com ≥10 regras citadas. Owner: curation.
2. **`seasonal` no schema** — placeholder no plan; adicionar antes do 1º caso sazonal para evitar refactor.
3. **Telemetria de rejeição** (Fase 5) — sem ela, não conseguimos detectar em produção quando um closure derrubou o anchor stop e o curator silenciosamente fez fallback.

---

## 5. Recomendação

Avançar **Fase 5 (telemetria de decisão)** antes da Fase 2/3/4. Sem visibilidade do que o curator está a rejeitar/swapar, qualquer expansão do registry é cega. Implementação é leve (1 custom event + console log estruturado) e desbloqueia auditoria das Fases seguintes.

Diz se queres que avance para Fase 5, ou se preferes Fase 4 (reveal cinematográfico) primeiro.
