## Objective

Auditar e endurecer o JSON-LD do site para cumprir estritamente as regras pedidas (sem alterar conteúdo visual). Foco em três correções P0 e em confirmar/documentar o que já cumpre a spec.

## Diagnóstico (estado atual)

Já cumpre:
- **Site-wide**: `organizationLd()` em `__root.tsx` já emite `TravelAgency`+`LocalBusiness` (o "mais adequado suportado" para operador turístico local); `websiteLd()` também sitewide; `breadcrumbLd()` em todas as leaf routes principais.
- **Signature (`/tours/$tourId`)**: `tourProductLd()` emite `Product`+`TouristTrip` com `name/description/image/url/brand/provider/priceCurrency: EUR`. Reviews por experiência via `withAggregateAndReviews()` já respeitam visible-parity (só emite se `topReviews` visíveis).
- **FAQPage**: emitido em `/tours/$id`, `/`, `/corporate`, `/proposal-in-portugal`, `/multi-day` — todos com blocos FAQ visíveis.
- **Travel Designer (`/multi-day`)**: `travelDesignerServiceLd()` (Service) — sem preços/datas inventadas.

Violações a corrigir:
1. **`src/lib/guest-quotes-jsonld.ts` + `src/components/home/GuestQuotes.tsx`** — emite `AggregateRating` **em `Organization`** na homepage, agregando reviews multi-plataforma (Viator/Tripadvisor/GetYourGuide/Google) num único bloco. Viola diretamente a regra 5 (bullets 1–3): "Não colocar AggregateRating em LocalBusiness/Organization" e "Não agregar automaticamente reviews do Google/Tripadvisor/Viator/Trustpilot". Também usa `FALLBACK_RATING/COUNT` quando as stats faltam — schema divergente do visível.
2. **`src/lib/jsonld.ts` `tourProductLd()`** — quando `priceFrom` existe, emite sempre `availability: InStock`. A regra 2 diz "availability apenas quando for verdadeira". A disponibilidade real depende da data escolhida no BookingForm, não é um estado permanente do Product → remover `availability` do Offer (ou torná-lo opcional só quando explicitamente confirmado).
3. **`src/routes/portugal-travel-designer.tsx`** — só emite Breadcrumb; falta `travelDesignerServiceLd()` (ou `TouristTrip`/`Trip` conforme conteúdo) para paridade com `/multi-day`. Confirmar semanticamente antes de escolher.

Ambíguo (verificar visibilidade antes de emitir):
- Homepage emite `faqPageLd(HOMEPAGE_FAQ)` e `studioServiceLd`. Vou confirmar que o bloco FAQ da homepage é realmente visível (ou remover o FAQPage se estiver escondido/collapsed sem visibilidade real).
- `/corporate`, `/proposal-in-portugal` — confirmar que o FAQ visível corresponde 1:1 a `CORPORATE_FAQ` / `PROPOSAL_FAQ`.

## Alterações (código, sem tocar em UI)

**1. Remover AggregateRating/Review em Organization (homepage)**
- `src/lib/guest-quotes-jsonld.ts`: apagar o nó `AggregateRating` sobre `Organization`. Manter apenas nós `Review` **individuais** que apontem para `itemReviewed = Product` (por Signature) quando o review for atribuível a uma experiência específica; se um review não tem ligação a experiência única, **não emitir**. Nenhum review multi-fonte fica agregado. Remover `FALLBACK_RATING`/`FALLBACK_COUNT` (nunca inventar valores).
- Se, após o filtro, não sobrar review atribuível: o helper devolve `{ "@graph": [] }` e o `<script>` não é renderizado.
- `src/components/home/GuestQuotes.tsx`: chamar o helper novo, e não emitir `<script>` quando o graph vier vazio. Nenhuma mudança visual.

**2. `tourProductLd()` — Offer conservadora**
- Em `src/lib/jsonld.ts`: remover `availability: InStock` do Offer padrão. Adicionar campo opcional `availability?: string` que só é preenchido quando o caller confirmar disponibilidade genuína (por enquanto, nenhum caller preenche → nunca é emitido).
- Confirmar que `price` corresponde ao `priceFrom` realmente visível na página (já é o caso via `signatureTours.ts`).
- Manter `priceCurrency: EUR` e `brand: YES Experiences Portugal` (já OK via `@id` do organization).

**3. Travel Designer (`/portugal-travel-designer`)**
- Emitir `travelDesignerServiceLd({ path: "/portugal-travel-designer" })` para paridade semântica com `/multi-day`. Não emitir `Trip`/`TouristTrip` porque a página não descreve uma viagem concreta com stops fixos — Service é o tipo correto.

**4. Signature (`tourProductLd`) — sem AggregateRating quando não visível**
- Já é o comportamento via `withAggregateAndReviews()`. Confirmar por leitura e adicionar comentário-guardrail.

**5. FAQ**
- Confirmar por leitura que os arrays `HOMEPAGE_FAQ`, `SIGNATURE_FAQ`, `CORPORATE_FAQ`, `PROPOSAL_FAQ`, `TRAVEL_DESIGNER_FAQ` são renderizados 1:1 na página correspondente. Se algum não estiver visível, remover a chamada a `faqPageLd()` nesse ficheiro.

**6. Duplicados / validação**
- Manter `jsonLdScript()` como único wrapper (já é) e confirmar que cada rota não repete `organizationLd`/`websiteLd` (já ficam só em `__root.tsx`).
- Nada de mudanças em `src/routes/__root.tsx` para além de continuar sitewide.

## Fora do âmbito

- Não alterar `local-stories` review nodes (já cumprem visible-parity estrita por Product/Signature).
- Não tocar em `tourTailorProductLd()` (já usa `isVariantOf` sobre o Product parent).
- Sem alterações visuais em nenhum componente.

## Exemplos finais (payloads simplificados que este plano vai emitir)

**Homepage** — só o essencial, sem AggregateRating/Review em Organization:

```json
[
  {"@type":["TravelAgency","LocalBusiness"], "@id":"…/#organization", "name":"YES Experiences Portugal", "…":"…"},
  {"@type":"WebSite", "@id":"…/#website"},
  {"@type":"FAQPage", "mainEntity":[{"@type":"Question","name":"…","acceptedAnswer":{"@type":"Answer","text":"…"}}]},
  {"@type":"Service", "@id":"…/studio-v3#service", "name":"YES Experience Studio", "provider":{"@id":"…/#organization"}},
  {"@type":"ItemList", "itemListElement":[{"@type":"ListItem","position":1,"url":"…/tours/arrabida-wine-allinclusive","name":"…"}]}
]
```

**Signature** (`/tours/arrabida-wine-allinclusive`):

```json
[
  {"@type":"BreadcrumbList","itemListElement":[…]},
  {
    "@type":["Product","TouristTrip"],
    "@id":"…/tours/arrabida-wine-allinclusive#product",
    "name":"…","description":"…","image":"…","url":"…",
    "brand":{"@id":"…/#organization"},
    "provider":{"@id":"…/#organization"},
    "offers":{"@type":"Offer","priceCurrency":"EUR","price":220,"url":"…","seller":{"@id":"…/#organization"}},
    "aggregateRating":{"@type":"AggregateRating","ratingValue":4.9,"reviewCount":312,"bestRating":5,"worstRating":1},
    "review":[{"@type":"Review","author":{"@type":"Person","name":"…"},"reviewRating":{…},"reviewBody":"…","publisher":{"@type":"Organization","name":"Viator"}}]
  },
  {"@type":"FAQPage","mainEntity":[…]}
]
```
(AggregateRating + review só emitidos quando `topReviews` estão visíveis na página, via `withAggregateAndReviews`.)

**Moments** (`/proposal-in-portugal`) — sem Product (não há preço fixo visível), Service opcional futuro:

```json
[
  {"@type":"BreadcrumbList","itemListElement":[…]},
  {"@type":"FAQPage","mainEntity":[…]}
]
```

**Corporate** (`/corporate`):

```json
[
  {"@type":"BreadcrumbList","itemListElement":[…]},
  {"@type":"FAQPage","mainEntity":[…]}
]
```

**Travel Designer** (`/multi-day` e `/portugal-travel-designer`):

```json
[
  {"@type":"BreadcrumbList","itemListElement":[…]},
  {
    "@type":"Service","@id":"…/multi-day#service",
    "name":"YES Travel Designer — full Portugal journeys",
    "serviceType":"Bespoke multi-day Portugal travel design",
    "provider":{"@id":"…/#organization"},
    "areaServed":{"@type":"Country","name":"Portugal"},
    "potentialAction":{"@type":"PlanAction","target":{…}}
  },
  {"@type":"FAQPage","mainEntity":[…]}
]
```

## Validação

- `bunx vitest run src/lib/__tests__/guest-quotes-jsonld.test.ts src/lib/__tests__/aggregate-review-schema.test.ts` (adicionar/atualizar asserts para a nova regra).
- `scripts/check-required-status-context.mjs` já existe? correr também um Playwright smoke que faça fetch de `/`, `/tours/arrabida-wine-allinclusive`, `/corporate`, `/proposal-in-portugal`, `/multi-day`, `/portugal-travel-designer` e valide que cada `<script type="application/ld+json">` faz parse e não contém `AggregateRating` sobre `Organization`/`LocalBusiness`.
- Confirmar no Rich Results Test após publish (o utilizador executa, não é executável daqui).

## Deliverables

- Ficheiros editados: `src/lib/guest-quotes-jsonld.ts`, `src/components/home/GuestQuotes.tsx`, `src/lib/jsonld.ts`, `src/routes/portugal-travel-designer.tsx`, mais os testes correspondentes.
- Zero alterações visuais.
