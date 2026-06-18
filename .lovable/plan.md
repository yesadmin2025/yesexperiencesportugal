## Objetivo

Uma linguagem única de mapa em todo o produto — a silhueta editorial dourada do `LiveMapPreview` da homepage — e um Builder que se sente vivo (progressão clara, datas a funcionar, pins reativos, reveal premium com preços). Sem inventar paragens, tours, fotos ou preços (continua a obedecer ao bible: só dados resolvidos das Signatures + Viator).

---

## 1. Mapa unificado — `EditorialMap` (novo primitivo)

Criar `src/components/maps/EditorialMap.tsx` extraindo o look do `LiveMapPreview`:

- Silhueta de Portugal SVG + grid topográfico ténue (gold 0.18).
- Linha de rota dourada que se desenha (stroke-dashoffset, 2400ms).
- Pins gold com pulse suave, último pin com núcleo ivory.
- Indicador "Routing · Portugal · Live" topo, caption editorial em baixo.
- Props: `stops` (label, lat?, lng? ou x/y), `activeCount` (para reveal faseado), `caption`, `eyebrow`, `tone` ("dark" charcoal | "light" ivory).
- Respeita `prefers-reduced-motion`.
- Sem dependência de Leaflet/Mapbox — puro SVG, mobile-fast.

Mapear coordenadas reais (lat/lng de `src/data/stopCoords.ts`) para o viewBox 200×400 via bounding box Portugal continental (lat 36.9–42.2, lng −9.6/−6.2). Função pura `projectLatLng()` testada.

## 2. Substituir mapas existentes

| Onde | Hoje | Passa a ser |
|------|------|-------------|
| Studio V3 `MapAwakens` (fase 2) | silhueta própria + glow | `<EditorialMap tone="dark" stops={regionStops} activeCount={selectedCount} />` |
| Studio V3 `StudioV3SignatureMap` (reveal) | mapa custom com pins | `<EditorialMap tone="dark" stops={routePoints} activeCount={revealedStops} caption={journeyTitle} />` |
| Builder `LivingMap` | versão atual | `<EditorialMap tone="light" stops={selectedStops} activeCount={selectedStops.length} />` enquanto compõe; mantém zoom-by-region só no reveal final |
| Builder reveal final | igual ao composer | `<EditorialMap>` em modo `revealing` com pins sequenciados (220+i*320ms) — mesmo timing do Studio V3 |

Homepage `LiveMapPreview` continua intacta (já é a referência); refactor interno para reutilizar `EditorialMap` mas mesmas props/output visual byte-equivalente (snapshot test).

## 3. Builder — progressão, datas e reveal premium

### 3a. Engagement & progressão
- Stepper com 4 beats claros: **Região → Ritmo → Datas → Compor**. Cada beat com eyebrow ("— BEAT 02 · RITMO"), título Montserrat, micro-copy Georgia italic.
- Ao avançar, o mapa à direita (desktop) / topo sticky (mobile) acende mais um pin com a cadência do LiveMapPreview — feedback visual imediato de cada escolha.
- Persistência: hook `useBuilderPersistence` já existe; garantir que retomar a sessão restaura o beat e os pins.

### 3b. Datas a funcionar
Auditoria do `DatePhase`:
- Validar que o range picker emite `startDate`/`endDate` válidos para `useMultiDayBuilder`.
- Bloqueio de datas passadas + janela mínima 7 dias (regra operacional já no bible).
- Sincronizar com `studio-v3-telemetry` (`date.selected` event) para o audit.
- Estado vazio elegante quando o utilizador volta atrás.

### 3c. Reveal premium com preços
Novo componente `BuilderReveal.tsx` (substitui o handoff atual):

1. **Beat A (0–900ms)** — hero photo da Signature resolvida em fade.
2. **Beat B (900–1800ms)** — Georgia italic "why it fits" + `<EditorialMap>` com pins a aparecer 1-a-1.
3. **Beat C (1800–2600ms)** — card de preço: `from €X /pp` derivado de `signatureToursViator.priceFrom` (campo já existente — não inventamos). Inclui:
   - duração real
   - nº de paragens reais
   - 2-3 inclusões reais (do Viator data)
   - CTA primário "Reserve instantly" (TEST MODE permite) + ghost "Refine details".
4. **Validation guard** já implementado (`validateResolvedSignature`) — se falhar, fallback "needs a human touch" (mantém-se).

Preço apenas mostrado se `priceFrom` existir e validar; senão mostra "Price on request" + CTA WhatsApp.

## 4. Telemetria & testes

- Estender `studio-v3-telemetry` com `builder.beatAdvanced`, `builder.dateSelected`, `builder.revealShown` (com preço/sem preço).
- Adicionar tab "Builder" em `/admin/studio-v3-audit` reutilizando o mesmo layout (viewport · dpr · reducedMotion).
- Testes:
  - `editorial-map.test.tsx` — projeção lat/lng, activeCount staggering, reduced motion.
  - `builder-reveal.test.tsx` — mostra preço só quando válido, fallback caso contrário.
  - `date-phase.test.tsx` — bloqueia passado, emite range válido.
  - Snapshot do `LiveMapPreview` antes/depois do refactor (byte-equivalente).

## 5. Não-objetivos (não tocar)

- Homepage hero / copy / vídeos.
- Signature pages (continuam fonte de verdade Viator).
- Stack de pagamentos (Bokun final step só quando live).
- Tipografia / paleta — mantém canonical tokens.

---

## Ordem de execução

1. `EditorialMap` + testes + projeção lat/lng.
2. Refactor `LiveMapPreview` interno → `EditorialMap` (snapshot lock).
3. Swap em Studio V3 (MapAwakens + reveal).
4. Swap em Builder + novo stepper de progressão.
5. `DatePhase` audit + fix.
6. `BuilderReveal` com preço real do Viator.
7. Telemetria + tab admin.
8. Validação Playwright mobile (393×850) em todos os ecrãs.

Confirmas para avançar?