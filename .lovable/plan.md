# Aplicar Source of Truth em todo o site

Objetivo: cada uma das 12 Signature tours passa a mostrar exatamente o que está na sua página Viator (as 12 URLs canónicas já registadas em `CANONICAL_VIATOR_URLS`). Sem inventar, sem duplicar, sem drift.

## Estado atual (verificado)

- `SIGNATURE_SOURCE_OF_TRUTH` está **vazio** — as 12 URLs canónicas estão registadas mas nenhum tour tem SoT populada.
- Infra pronta: extractor (`viatorSot.server.ts`), server fn admin (`viatorSot.functions.ts`), admin batch mode em `/admin/sot-refresh`.
- Campos duplicados vivos hoje em `src/data/signatureTours.ts` (linhas 299, 413, 510, 618, 710, 821, 930, 1042, 1132, 1223…) e em `src/data/signatureToursViator.ts`: `overview`, `highlights`, `included`, `notIncluded`, `itinerary`.
- Read sites principais confirmados: `src/routes/tours.$tourId.tsx`, `src/routes/tours.$tourId.tailor.tsx`, `src/lib/studio-v2/itinerary.*`.

## Decisões (do seu último input)

1. Eu extraio end-to-end (invoco `extractSignatureSotFn` server-side em build mode).
2. **Single source of truth estrito** — apago os campos duplicados de `signatureTours.ts` e `signatureToursViator.ts` no mesmo turno em que fizer o wiring.
3. Âmbito do wiring: página do tour + Tailor + Studio. (Signature map fica fora deste turno.)

## Fases

### Fase A — Popular SoT (uma vez)

1. Invocar `extractSignatureSotFn` para cada um dos 12 `tourId` em `CANONICAL_VIATOR_URLS` (com backoff idêntico ao batch mode do admin: 3 tentativas, delay 800/1600 ms).
2. Escrever os 12 blocos gerados dentro de `SIGNATURE_SOURCE_OF_TRUTH` em `src/data/signatureToursSourceOfTruth.ts` (ordem alfabética por `tourId`).
3. Se algum tour falhar as 3 tentativas → parar antes de qualquer delete. Reporto quais falharam e você decide (nova tentativa vs. adiar esse tour vs. fallback manual).

Regras do extractor já aplicadas: só conteúdo que aparece na página Viator, midpoint para ranges ("8–9h" → 510), `null` em minutos por capítulo quando Viator não imprime, nomes reais em PT correto.

### Fase B — Wiring dos read sites (SoT-only)

Novos helpers em `signatureToursSourceOfTruth.ts` (adicionar aos já existentes):

- `sotNotIncluded(tourId)`, `sotVariesByOption(tourId)`, `sotDurationText(tourId)`, `sotDurationMinutes(tourId)`, `sotChapterMinutes(tourId)` (retorna array alinhado com a ordem dos capítulos SoT).

Read sites:

- `**src/routes/tours.$tourId.tsx**` — Overview, Highlights, What's included, What's not included, Itinerary passam a vir de `sotOverview / sotHighlights / sotIncluded / sotNotIncluded / sotItinerary`. `tour.highlights` fallback (linha 464) removido — passa a `sotHighlights(tourId)`. Se por acaso a SoT vier vazia numa release futura, mostra estado vazio limpo (sem cair para legacy — decisão do single-source).
- `**src/routes/tours.$tourId.tailor.tsx**` — bloco de validação (linhas 1420-1424 hoje compara "included" contra Viator) passa a comparar contra SoT. Chapters editáveis usam `sotItinerary(tourId)` como base (ordem + labels reais). Inclusões e "not included" mostradas nas cards leem de SoT.
- `**src/lib/studio-v2/itinerary.functions.ts` / `itinerary.server.ts**` — quando um Signature está filtrado, a duração total do dia = `sotDurationMinutes` (midpoint) e cada capítulo usa `sotChapterMinutes[i]` quando não-null; capítulos com minutos `null` mantêm o cálculo atual do composer (não inventamos tempos).

### Fase C — Remover fontes duplicadas

Após B compilar limpo:

1. Em `src/data/signatureTours.ts`: apagar os campos `overview`, `highlights`, `included`, `notIncluded`, `itinerary` do tipo `SignatureTour` e de cada uma das 12 entradas. Manter tudo o resto (`stops[]`, pricing, imagens, slugs, `story`, `seoTitle`/`seoDescription` — não são SoT).
2. Em `src/data/signatureToursViator.ts`: apagar as mesmas 5 propriedades duplicadas; manter apenas o que é editorial/hero e não vive em Viator.
3. Corrigir cada import que leia esses campos (esperado: os ficheiros já editados em B, testes em `src/data/__tests__/*`, e `src/lib/viatorValidation.ts`). Onde um teste comparava `signatureTours` vs Viator, passa a comparar SoT vs `stops[]`.

### Fase D — Verificação

- `tsgo` deve passar após Fase C (todos os leitores atualizados).
- Correr os specs Playwright já existentes tocados: `signature-map-and-images`, `signature-a11y-axe`, `studio-v3-*` (composer/timings). Sem alterar baselines a menos que a copy real da Viator os force a mudar — nesse caso reporto e você decide.
- Não toco em `SignatureRouteMap`, `/experiences`, `/index`, cards de homepage (fora de âmbito hoje).

## Riscos e mitigações

- **Extração falha em 1-2 tours** (429 do gateway, ou Viator renderiza JS): parar antes da Fase C, manter registo parcial + apagar apenas os campos duplicados dos tours com SoT populada. Sem meia-mistura silenciosa.
- **Copy vira "estilo Viator" e perde tom YES**: SoT guarda o texto literal da Viator; o tom editorial YES vive nos campos que NÃO vão para SoT (`story`, hero, meta). Se algum overview Viator soar demasiado marketing, aviso e paramos. Manter copy yes mas a verdade do produto do viator 
- **Studio timings mudam**: passar a midpoint real (ex.: 8-9h → 510) pode alterar tempos hoje mostrados. É o objetivo — mas confirmo antes de mergir se algum tour ficar com >30 min de swing vs. actual.

## Fora deste âmbito (próxima ronda, se quiser)

- Signature route map (ordem dos stops vs SoT) e cards em `/experiences` a puxar duração da SoT.
- Um lint no CI que falha o build se algum destes campos reaparecer em `signatureTours.ts`.

## O que fica escrito

- `src/data/signatureToursSourceOfTruth.ts` (populado + novos helpers).
- `src/routes/tours.$tourId.tsx`, `src/routes/tours.$tourId.tailor.tsx`, `src/lib/studio-v2/itinerary.*` (leem só SoT).
- `src/data/signatureTours.ts`, `src/data/signatureToursViator.ts` (sem os 5 campos duplicados).
- Ajustes em `src/lib/viatorValidation.ts` + testes afetados.