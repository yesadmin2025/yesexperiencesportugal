# Pricing Table — Current vs Proposed (audit only)

**Basis (per your approved answers):**
- `platformPrice` = current site price for that tier (SSOT column to add).
- `directBookingPrice = round(platformPrice × 0.85)` — floor whichever rounding still yields ≥15% off.
- `minimumOperationalPrice = round(directBookingPrice × 0.70)`.
- `"From €X"` = lowest `directBookingPrice` across currently bookable tiers.

Tier data sourced from `public.tour_price_tiers` (runtime overrides, all 12 rows present) and `signatureTours[id].priceFrom` (fallback anchor). Nothing is edited in this pass.

Legend: `p` = platform (current site) price. `d` = proposed direct-booking price. `min` = proposed operational floor.

---

## 1 · arrabida-wine-allinclusive (Arrábida All-Inclusive)
Current `priceFrom` = **€138**. Tiers 1→8: 279 / 215 / 215 / 189 / 189 / 189 / 159 / 159.

| Tier | p (EUR) | d = p×0.85 | min = d×0.70 |
|---:|---:|---:|---:|
| 1 | 279 | **237** | 166 |
| 2 | 215 | **183** | 128 |
| 3 | 215 | **183** | 128 |
| 4 | 189 | **161** | 113 |
| 5 | 189 | **161** | 113 |
| 6 | 189 | **161** | 113 |
| 7 | 159 | **135** | 95 |
| 8+ | 159 | **135** | 95 |

Proposed **"From €135"** (was €138). Delta on 8+: −€24.

## 2 · wild-beaches-picnic (Coastal Arrábida + Beach Picnic)
Current `priceFrom` = **€190**. Tiers 2→8: 159 / 159 / 159 / 159 / 159 / 139 / 139.
⚠ **Card/product ≠ tier data**: card shows "From €190" but cheapest bookable tier is €139. Existing bug — cannot compute a truthful discount until reconciled.

| Tier | p | d | min |
|---:|---:|---:|---:|
| 2–6 | 159 | **135** | 95 |
| 7–8 | 139 | **118** | 83 |

Proposed **"From €118"**.

## 3 · arrabida-boat
`priceFrom` = **€159**. Tiers: 2/3=209, 4/5=199, 6/7/8=159.

| Tier | p | d | min |
|---:|---:|---:|---:|
| 2–3 | 209 | **178** | 125 |
| 4–5 | 199 | **169** | 118 |
| 6–8 | 159 | **135** | 95 |

Proposed **"From €135"**.

## 4 · tiles-workshop
`priceFrom` = **€145**. Tiers 1→8: 279 / 215 / 215 / 189 / 189 / 189 / 159 / 159.

Same table as row 1. Proposed **"From €135"**. Card mismatch: current €145 does not exist as a tier — likely stale.

## 5 · azeitao-cheese
`priceFrom` = **€135**. Tiers 2→8: 239 / 189 / 189 / 149 / 149 / 149 / 119.

| Tier | p | d | min |
|---:|---:|---:|---:|
| 2 | 239 | **203** | 142 |
| 3–4 | 189 | **161** | 113 |
| 5–7 | 149 | **127** | 89 |
| 8+ | 119 | **101** | 71 |

Proposed **"From €101"**.

## 6 · sintra-cascais
`priceFrom` = **€159**. Tiers 2→8: 215 / 215 / 199 / 199 / 199 / 189 / 189.

| Tier | p | d | min |
|---:|---:|---:|---:|
| 2–3 | 215 | **183** | 128 |
| 4–6 | 199 | **169** | 118 |
| 7–8 | 189 | **161** | 113 |

Proposed **"From €161"**. Card €159 is *below* the cheapest real tier — misleading "from".

## 7 · troia-comporta
`priceFrom` = **€165**. Tiers 2→8: 285 / 235 / 235 / 195 / 195 / 195 / 185.

| Tier | p | d | min |
|---:|---:|---:|---:|
| 2 | 285 | **242** | 169 |
| 3–4 | 235 | **200** | 140 |
| 5–7 | 195 | **166** | 116 |
| 8+ | 185 | **157** | 110 |

Proposed **"From €157"**.

## 8 · evora-alentejo
`priceFrom` = **€262**. Tiers 2→8: 279 / 249 / 249 / 199 / 199 / 199 / 199.

| Tier | p | d | min |
|---:|---:|---:|---:|
| 2 | 279 | **237** | 166 |
| 3–4 | 249 | **212** | 148 |
| 5–8 | 199 | **169** | 118 |

Proposed **"From €169"**.

## 9 · tomar-coimbra
`priceFrom` = **€220**. Tiers 2→8: 318 / 189 / 189 / 189 / 189 / 189 / 179.

| Tier | p | d | min |
|---:|---:|---:|---:|
| 2 | 318 | **270** | 189 |
| 3–7 | 189 | **161** | 113 |
| 8+ | 179 | **152** | 106 |

Proposed **"From €152"**.

## 10 · fatima-nazare-obidos
`priceFrom` = **€195**. Tiers 1→8: 359 / 229 / 229 / 179 / 179 / 179 / 179 / 159.

| Tier | p | d | min |
|---:|---:|---:|---:|
| 1 | 359 | **305** | 214 |
| 2–3 | 229 | **195** | 137 |
| 4–7 | 179 | **152** | 106 |
| 8+ | 159 | **135** | 95 |

Proposed **"From €135"**.

## 11 · roman-heritage-alentejo
`priceFrom` = **€260**. Tiers 2→8: 399 / 345 / 345 / 320 / 320 / 299 / 299.

| Tier | p | d | min |
|---:|---:|---:|---:|
| 2 | 399 | **339** | 237 |
| 3–4 | 345 | **293** | 205 |
| 5–6 | 320 | **272** | 190 |
| 7–8 | 299 | **254** | 178 |

Proposed **"From €254"**.

## 12 · southwest-vicentine-coast
`priceFrom` = **€239**. Tiers 2→8: 359 / 359 / 299 / 299 / 299 / 239 / 239.

| Tier | p | d | min |
|---:|---:|---:|---:|
| 2–3 | 359 | **305** | 214 |
| 4–6 | 299 | **254** | 178 |
| 7–8 | 239 | **203** | 142 |

Proposed **"From €203"**.

---

## Summary of "From €" adjustments

| Tour | Current | Proposed | Δ |
|---|---:|---:|---:|
| arrabida-wine-allinclusive | 138 | 135 | −3 |
| wild-beaches-picnic | 190 | 118 | **−72** ⚠ stale card |
| arrabida-boat | 159 | 135 | −24 |
| tiles-workshop | 145 | 135 | −10 |
| azeitao-cheese | 135 | 101 | −34 |
| sintra-cascais | 159 | 161 | **+2** (card was below real tier) |
| troia-comporta | 165 | 157 | −8 |
| evora-alentejo | 262 | 169 | −93 |
| tomar-coimbra | 220 | 152 | −68 |
| fatima-nazare-obidos | 195 | 135 | −60 |
| roman-heritage-alentejo | 260 | 254 | −6 |
| southwest-vicentine-coast | 239 | 203 | −36 |

Rows highlighted in bold are pre-existing card/tier mismatches independent of the 15% policy — they must be reconciled in Phase 2 before the discount is applied, otherwise the shown "From" would drop dramatically for reasons unrelated to the direct-booking policy.
