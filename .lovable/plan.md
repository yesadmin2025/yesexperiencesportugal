## Objectivo

Trazer da versão `customwebsitedesigns.org` os ganhos reais de UX/clareza/conversão, **mantendo o nosso hero, paleta, tipografia, motion e regra de não-invenção**. Tudo é só frontend/conteúdo — sem mexer em business logic, sem inventar tours, stops, preços ou parceiros.

---

## 1. Homepage — "Três formas de começar" (01 / 02 / 03 / 04)

Logo a seguir ao hero, antes do bloco actual de caminhos, adicionar uma secção editorial numerada que torna os 4 caminhos legíveis em 5 segundos.

- Layout: 4 cards em coluna (mobile) / grid 2×2 (≥md), cada um com:
  - Numeral grande em Georgia italic gold (01 · 02 · 03 · 04)
  - Eyebrow (Signature · Tailored · Studio · Proposals)
  - Frase curta funcional + CTA ghost
- Sem imagens novas (usa só tipografia + linha gold) — zero risco de stock.
- Substitui (não duplica) a actual introdução dos caminhos se existir versão fraca.

## 2. Homepage — FAQ operacional

Adicionar 4 perguntas reais de compra ao bloco FAQ existente (não substituir as actuais):

1. Posso reservar directamente sem formulários?
2. O que acontece depois de confirmar?
3. Posso ajustar a experiência depois de reservar?
4. E se mudar de planos?

Respostas em sentence case, curtas, alinhadas com TEST MODE ("Reserva instantânea, confirmação imediata. Ajustes feitos com o teu local host antes do dia."). Sem inventar políticas — fraseado conservador.

## 3. Homepage — "What we handle" nos cards de Moments

Nos 4 cards (Proposals / Celebrations / Corporate / Multi-day), adicionar uma mini-lista de 3 bullets ✓ concretos do que está incluído (planeamento, host local, logística no dia). Texto factual, sem superlativos.

## 4. StudioDrift — toggle persistente `story · timeline · map`

No topo do StudioDrift, segmented control minimalista (3 estados), scoped à v3:
- `story` (default) — vista actual cinematográfica
- `timeline` — mostra o `ItineraryRibbon` em modo expandido
- `map` — força o `LivingMap` a aparecer cedo (sem esperar reveal)

Estado guardado em `useStudioState` ou local. Respeita reduced-motion. Não altera o engine — só lentes de visualização do mesmo estado.

## 5. StudioDrift — estimativa de preço quando confidence ≥ 0.6

Mostrar discretamente, no `StickyBar` ou abaixo do ChapterLine, "≈ €X / pessoa" assim que `revealConfidence` do drift atinge 0.6. Antes disso fica escondido (preserva o ritmo cinematográfico). Cálculo já existe no `StickyBar` — só precisa de gating por confiança.

## 6. StudioDrift — chips de tema emergentes

Pequena fila de chips (Wine · Coast · Heritage · Ease …) derivada do `sceneWeighting` actual, abaixo do `EncouragementBar`. Aparecem quando o peso ultrapassa threshold; somem se baixa. Liga o motor preditivo à percepção do utilizador sem expor números.

---

## O que NÃO se faz

- Não toca no hero (copy, vídeo, CTAs, microcopy, brand line — todos locked).
- Não adiciona barra "Step 1 of 11 / 9% Complete" (configurator feel, contra studio-philosophy).
- Não adiciona "Experience Quality Score 92%" (número inventado — viola truth pass).
- Não usa imagens Unsplash nem stock.
- Não introduz superlativos ("elite", "premium class", "architected for").
- Não muda paleta, tipografia v3, motion contract.

---

## Ficheiros previstos

- `src/routes/index.tsx` (ou componente de homepage) — secção 01/02/03/04, FAQ, bullets Moments
- `src/components/builder/v3/StudioDrift.tsx` — toggle de vista, gating de preço, chips de tema
- `src/components/builder/v3/ViewToggle.tsx` (novo) — segmented control
- `src/components/builder/v3/EmergingThemes.tsx` (novo) — chips
- `src/components/builder/StickyBar.tsx` — prop opcional `showPrice` controlada por confidence
- Testes regressão: `studio-contract.test.ts` (verificar que toggle não quebra drift)

---

## Ordem sugerida de execução

1. Homepage 01/02/03/04 + FAQ + bullets Moments (1 PR mental — só conteúdo/layout)
2. Studio toggle de vista (estrutural mas isolado)
3. Studio price-when-confident + chips de tema (liga ao engine que já existe)

Avanço por esta ordem e paro entre cada um se preferires rever?
