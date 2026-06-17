# Studio V3 vs Studio Bible — gap analysis and improvement plan

## What was just shipped (this turn)

- `dateExact` agora atravessa `resolveStudioV3Route` → `curateJourney` (antes só chegava via `MapAwakens`). Os 3 consumidores foram atualizados: `MapAwakens`, `ComposerMap`, `LivingJourneyPanel`.
- Nova suite `src/components/studio-v3/__tests__/curation-operational.test.ts` (8 testes, todos verdes):
  - Mercado do Livramento removido às 2ª feiras (Arrábida wine day).
  - Volta a aparecer numa 3ª feira com os mesmos inputs.
  - `dateExact` malformado é ignorado sem crash.
  - Cap de **3 adegas** validado em Arrábida (immersive + bespoke), via `curateJourney` e via `resolveStudioV3Route`.
  - Sintra romance day ≤ 1 adega (Adega Regional de Colares).
  - Alentejo wine day ≤ 3 adegas.

> Nota sobre o pedido original: a Studio bible nunca formalizou caps regionais (3 Arrábida / 1 Sintra / 2 Alentejo). O que existe hoje no código é **um cap global de 3 wineries por dia**, aplicado dentro do skeleton já contido por região. Os testes confirmam que esse cap, na prática, produz exatamente os números que o utilizador descreveu — sem precisar de novas regras regionais. Se quiseres caps explícitos por região, está na Fase 2 abaixo.

---

## Comparação com Studio Bible (north star + canonical rules)

| Pilar da bible | Estado em V3 | Gap |
|---|---|---|
| "Cinematic discovery, not configurator" | Forte: atmosphere → mapa antecipado → reveal | Reveal final ainda parece um card; falta o momento de "longing" cinematográfico |
| "Guided not asked" | Médio: ainda há 7 fases explícitas | Algumas (occasion, considerations) podem ser inferidas; ver Fase 3 |
| "Portugal felt early through atmosphere" | Bom: silhueta + gold pulse na Fase 4 | Falta som ambiente opcional + ritmo de fade entre atmosphere clips |
| "AI orchestrates, never invents" | Bom: route containment + closures | Falta telemetria de "stops rejeitados" para auditoria |
| "Restraint > features" | Risco: 8 fases + investment + considerations | Considerar fundir guests+companions, ou inferir mais agressivo |
| Brand guardrails (palette, motion, ≤220ms) | OK no shell | `studioV3AnticipationBreath` precisa de auditoria de duração em low-end |
| No-invention + Signature truth | OK (route containment hardened) | Falta integrar `regionRules` (horários reais) com `STOP_CLOSURES` |

---

## Plano de melhorias (priorizado)

### Fase 1 — Operational truth registry (P0, 1 ficheiro)
Mover `STOP_CLOSURES` (hoje hardcoded dentro de `curateJourney`) para `src/data/stopOperational.ts` com schema explícito:
```ts
type StopRule = {
  match: RegExp;
  closedOn?: number[];     // weekdays
  closedDates?: string[];  // yyyy-mm-dd (feriados)
  seasonal?: { from: string; to: string };
  source: string;          // link Viator/site oficial
};
```
Permite adicionar Quinta da Regaleira (último horário 18h inverno), Capela dos Ossos (Évora — fechada certas datas), etc., **sempre com fonte**. Suite de testes paramétrica.

### Fase 2 — Caps regionais explícitos (P1, opcional)
Substituir `MAX_WINERY_STOPS = 3` global por:
```ts
const WINERY_CAP_BY_REGION: Record<RegionId, number> = {
  arrabida: 3, sintra: 1, alentejo: 2, centro: 1, ...
};
```
Resolve o caso "Sintra com 3 adegas" mesmo se um dia o pool crescer. Testes já existem (operational suite) — basta apertar os limites.

### Fase 3 — Reduzir fases via inferência (P1)
- `occasion` opcional quando `companions=couple` + `feeling=romance` → "romantic escape" implícito.
- `considerations` só pergunta se `companions ∈ {family, celebration, corporate}`.
- Meta: 8 fases → 5–6 para o caso comum, mantendo opt-in para refinement.

### Fase 4 — Reveal final cinematográfico (P1)
Hoje o reveal entrega um Journey Card estático. Bible pede "longing". Proposta:
- 1ª batida (0–800ms): fade do mapa para imagem hero do anchor stop, com filme curto (3s loop) se existir.
- 2ª batida (800–1600ms): título manuscrito-ish (Georgia italic) + 1 linha de "why it fits".
- 3ª batida (>1600ms): route points aparecem em sequência (stagger 120ms), com sub-line "We confirm everything before you book".

### Fase 5 — Telemetria de curation (P2)
Já temos `[studio-v3.phase4]`. Adicionar:
- `studio-v3:curation.decision` (tour escolhido, score, closures aplicados, swaps por wine signal).
- Painel `/admin.studio-v3-audit` para ver últimas 100 decisões e rejeições.
- Permite detectar "wine pedido mas 0 wineries" em produção.

### Fase 6 — Preço indicativo (decisão pendente)
Bible em TEST MODE adia preço real. Banda discreta "Investment forming · indicative" que escala com `interests.length × rhythm × investment` sem número absoluto. Texto: "We'll confirm the exact figure with your tailored proposal." Implementação leve, 1 componente, 0 lógica de pagamento.

---

## Próximos passos sugeridos

Recomendo arrancar pela **Fase 1** (registry de horários) — desbloqueia adicionar Regaleira, Évora, mercados sem mexer em `curation.ts` outra vez. Confirma e implemento já a seguir.
