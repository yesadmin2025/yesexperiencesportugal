## Objetivo

Concluir a versão pt-PT do funil comercial prioritário com copy editorial escrita à mão (não traduzida por máquina), URLs estáveis, canonicals corretos e hreflang recíproco. Sem alterações visuais — apenas conteúdo, rotas e head tags.

## Estado atual (auditado)

Já em pt-PT: `/pt`, `/pt/experiences`, `/pt/contact`, `/pt/corporate`, `/pt/about`, `/pt/day-tours`, `/pt/reviews`, `/pt/privacy`, `/pt/terms`, `/pt/cookies`.

**Ainda em falta do funil prioritário:**
- Studio (`/studio-v3`) — sem PT
- Moments (`/pt/moments` faz 301 → `/pt/contact`, tem de virar página real)
- Travel Designer (`/multi-day` e/ou `/portugal-travel-designer`) — sem PT
- Páginas de detalhe dos três Signatures pedidos: Arrábida Wine (`arrabida-wine-allinclusive`), Arrábida Boat (`arrabida-boat`), Tile Workshop (`tiles-workshop`)

Homepage, Experiences, Corporate, Contact já cumprem os requisitos — vão receber apenas um passe de revisão editorial + verificação de hreflang/x-default.

## Trabalho por rota

### A. Novas rotas PT

1. `src/routes/pt.studio-v3.tsx` — página PT que monta `<StudioV3 locale="pt" />`. Vou estender `StudioV3` para aceitar prop `locale` e trocar as strings da intro, instruções passo-a-passo, resumo final e ecrã de checkout via um dicionário `studio.pt.ts`. Copy nova em português europeu, mantendo a voz editorial (não traduzir literalmente os headlines EN — reescrever). Restantes microtextos técnicos do componente ficam em EN até a próxima fase (documentado no ficheiro).
2. `src/routes/pt.moments.tsx` — substituir o 301 por página real (equivalente PT do `proposal-in-portugal` / Moments). Copy editorial nova.
3. `src/routes/pt.multi-day.tsx` — página PT do Travel Designer (equivalente a `/multi-day`).
4. `src/routes/pt.portugal-travel-designer.tsx` — variante SEO PT (equivalente a `/portugal-travel-designer`) com canonical próprio.
5. `src/routes/pt.tours.arrabida-wine-allinclusive.tsx`, `pt.tours.arrabida-boat.tsx`, `pt.tours.tiles-workshop.tsx` — três rotas dedicadas que renderizam o template de detalhe existente com um bloco de copy PT (título, subtítulo, blurb, itinerário-outlook, inclui/exclui, o que trazer, ponto de encontro). O preço, reviews Viator e mapa mantêm-se (são dados). Adicionar campos PT opcionais em `signatureTours.ts` só para estes três IDs, com fallback ao EN.

### B. Ajustes transversais

- `src/i18n/pt-ready.ts` — adicionar `/studio-v3`, `/multi-day`, `/portugal-travel-designer`, `/moments`, e os três paths `/tours/<id>` alvo. Assim o `LanguageSwitcher` passa a oferecer PT nessas rotas em vez de "coming soon".
- `src/routes/sitemap[.]xml.ts` — emitir versões PT para todos os PT-ready paths.
- `src/routes/__root.tsx` — garantir que quando o utilizador troca idioma o `LanguageSwitcher` preserva a rota equivalente (já funciona via `parseLocaleFromPath`); confirmar que também funciona para as novas rotas.
- Confirmar que **não** há redirect automático por IP em lado nenhum (auditado; a cookie `yes_locale` só é escrita em clique — manter).

### C. Head tags por rota

Cada nova rota emite via helper `buildI18nHead` (já existe em `src/i18n/seo.ts`):
- `<title>` e `<meta description>` únicos em PT
- `og:title`, `og:description`, `og:locale=pt_PT`, `og:locale:alternate=en_US`, `og:url` self
- `<link rel="canonical">` self (URL PT)
- `<link rel="alternate" hreflang="en">` → URL EN equivalente
- `<link rel="alternate" hreflang="pt-PT">` → URL PT self
- `<link rel="alternate" hreflang="x-default">` → URL EN

Também vou adicionar o par recíproco no lado EN das rotas equivalentes que ainda não o emitem (Studio, Multi-day, Moments, os três tours) — sem isto o Google ignora o alternate PT.

## Copy — princípios

- Português europeu natural, voz editorial YES (mesma que já está em `/pt` e `/pt/experiences`).
- Não traduzir headlines EN palavra-a-palavra — reescrever para o ritmo PT.
- Zero termos brasileiros. Zero "você" — usamos tratamento neutro/formal ("consigo", "connosco", frase impessoal).
- Preservar o léxico já validado: "Signature", "Studio", "Roteiros à Medida", "Momentos", "Retiros & Empresas".
- Nunca inventar factos: inclusões, itinerários, preços e paragens dos três tours vêm 1:1 do EN / `signatureTours.ts` (fonte Viator).

## Detalhes técnicos

- Locale prop no `StudioV3`: adicionar `locale?: "en" | "pt"` na assinatura do componente e um pequeno dicionário `src/components/studio-v3/i18n.pt.ts` com as chaves visíveis do funil (intro, títulos de passo, CTAs, textos de resumo, labels do checkout). Todas as chaves em falta caem para o texto EN atual — sem strings partidas.
- Detalhe de tour: não vou duplicar o template. As três rotas PT importam o mesmo componente `TourDetail` e passam um objecto de overrides PT que é aplicado dentro do template com fallback ao campo EN. Isto mantém a fonte de verdade em `signatureTours.ts`.
- Sem alterações de design — apenas texto, `head()`, `beforeLoad`s e novas rotas de ficheiro.

## Verificação antes de publicar (a tabela pedida)

Vou gerar e apresentar uma tabela final com todas as rotas cobertas:

```text
Rota EN                              → Rota PT                              → Title (PT)                              → H1 (PT)                              → Canonical (PT)                              → hreflang emitidos
/                                    → /pt                                  → …                                       → …                                    → https://…/pt                                → en, pt-PT, x-default
/experiences                         → /pt/experiences                      → …                                       → …                                    → https://…/pt/experiences                    → en, pt-PT, x-default
/studio-v3                           → /pt/studio-v3                        → …                                       → …                                    → https://…/pt/studio-v3                      → en, pt-PT, x-default
/moments (=/proposal-in-portugal)    → /pt/moments                          → …                                       → …                                    → https://…/pt/moments                        → en, pt-PT, x-default
/corporate                           → /pt/corporate                        → …                                       → …                                    → https://…/pt/corporate                      → en, pt-PT, x-default
/contact                             → /pt/contact                          → …                                       → …                                    → https://…/pt/contact                        → en, pt-PT, x-default
/tours/arrabida-wine-allinclusive    → /pt/tours/arrabida-wine-allinclusive → …                                       → …                                    → https://…/pt/tours/arrabida-wine-allinclusive → en, pt-PT, x-default
/tours/arrabida-boat                 → /pt/tours/arrabida-boat              → …                                       → …                                    → https://…/pt/tours/arrabida-boat            → en, pt-PT, x-default
/tours/tiles-workshop                → /pt/tours/tiles-workshop             → …                                       → …                                    → https://…/pt/tours/tiles-workshop           → en, pt-PT, x-default
/multi-day                           → /pt/multi-day                        → …                                       → …                                    → https://…/pt/multi-day                      → en, pt-PT, x-default
/portugal-travel-designer            → /pt/portugal-travel-designer         → …                                       → …                                    → https://…/pt/portugal-travel-designer       → en, pt-PT, x-default
```

Preencho os valores reais depois de escrever a copy. Verifico também com uma spec de teste (`src/i18n/__tests__/pt-ready-coverage.test.ts`) que cada nova rota tem canonical self, hreflang recíproco e og:locale correto.

## Fora de âmbito (a confirmar depois)

- Detalhes PT dos restantes ~15 Signatures não pedidos nesta lista.
- `/day-tours`, `/reviews`, `/faq` — já em PT ou stub, sem trabalho novo.
- Studio: microtextos internos do composer (drift labels, tooltips secundários) ficam em EN nesta fase; documento isso no ficheiro do dicionário PT. Se quiseres cobertura 100% do Studio em PT, faço num segundo passe.

## Pergunta antes de avançar

Confirma só uma coisa antes de eu implementar: para as três páginas de tour (Arrábida Wine, Arrábida Boat, Tile Workshop), o **título do tour** deve ficar em português (ex.: "Arrábida — Vinho e Costa, dia privado") ou manter o nome comercial em inglês para consistência com Viator/reviews? A minha recomendação é **manter o nome comercial em EN no H1 e traduzir subtítulo + corpo** — preserva o reconhecimento de marca e o link com as reviews externas.