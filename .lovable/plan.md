- Goal

Finish the last item from the /experiences delivery warning: four `signatureTours[].intro` strings still promise things the canonical record does not include. Only `intro` changes; one file.

## File changed

`src/data/signatureTours.ts` — 4 `intro` values only (lines ~464, ~762, ~870, ~982). No blurbs, titles, stops, pricing, SoT, routes or design.

## 1. `arrabida-boat`

Current (contradicts: guaranteed coves, guaranteed swim, lunch included):

> "A day told by the sea. We cross into the Arrábida Natural Park and trade the coast road for a boat into its quiet coves — swim or simply drift — then lunch in Portinho with sand still on your feet before easing into Sesimbra at golden hour."

Replacement:

> "A day told by the sea. It begins at Livramento Market, then follows the coast into the Arrábida Natural Park, past Lapa de Santa Margarida and out on the Sesimbra Coastal Boat Tour. The afternoon eases into Sesimbra and the cliffs of Cabo Espichel. Lunch can be added when you tailor the day."

## 2. `troia-comporta`

Current (contradicts: lunch included):

> "A quiet day in the Alentejo most visitors miss. We board the ferry across the Sado to Tróia's Roman ruins, then drift down to Comporta — long Atlantic beaches, rice paddies, white-and-blue villages — and finish with a slow lunch in the country."

Replacement:

> "A quiet day in the Alentejo most visitors miss. We board the ferry across the Sado to the Roman Ruins of Tróia, pause at the Carrasqueira stilt pier, then drift down to Comporta — long Atlantic beaches, rice paddies, white-and-blue villages — with a wine tasting at Herdade da Comporta. Lunch is not included, so the pace stays yours."

## 3. `evora-alentejo`

Current (vague single winery, no wineries/cork named, implies a long winery day):

> "Alentejo unwinds you. Plains of cork oaks, white-washed villages, and a city — Évora — that's quietly held two thousand years of history together. We walk it slowly, then disappear into the wineries that have been quietly making some of Portugal's best reds."

Replacement:

> "Alentejo unwinds you. We walk Évora's historic centre slowly — the Roman Temple, the Chapel of Bones — then head into two selected Alentejo wineries and a traditional cork-production visit. Lunch is not included, so the day keeps its own rhythm."

## 4. `sintra-cascais`

Current (contradicts: queue-free guarantee, wine always included, no package logic):

> "Sintra without the queues. We slip into the smaller estates, walk the forest paths most visitors never find, then chase the cliffs to Cabo da Roca — the western edge of Europe — before easing into Cascais and a glass of wine in a quiet courtyard."

Replacement:

> "Sintra, chosen your way: one palace visit plus a Colares wine visit, or two palace visits. From there the day heads to Azenhas do Mar, the cliffs of Cabo da Roca — the western edge of Europe — and a slow finish in Cascais."

## Validation

- Re-read each new intro against the canonical SoT inclusions: no excluded lunch described as included, no palace/winery/boat feature or wildlife sighting presented as guaranteed, no pricing mentioned.
- `tsgo --noEmit`.
- Full vitest suite (copy/parity and signature tests included).
- price matching stripe 
- Reservation details sent to clients and supplier  matching and with uptaded prices

Once passes all tests, publish 