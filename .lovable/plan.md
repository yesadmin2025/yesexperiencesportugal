# SEO Phase 2b — Target: American travelers + US travel trade

## Contexto verificado

- Semrush baseline: 3 keywords orgânicas, ~39 visitas/mês (PT database). US database ainda a zeros.
- Signature pages (11) já com `seoTitle`/`seoDescription` únicos (Phase 1).
- 2 Local Stories novas ao vivo (Phase 2).
- Sem afiliações trade formais (Virtuoso/Signature/Serandipians) — página trade posiciona-se como "open to partnerships", sem inventar logos.
- Public routes já indexáveis; `/admin`, `/builder`, `/checkout` bloqueados no robots.

## Objectivo

Duas frentes em paralelo, ambas ancoradas no mercado US:

1. **B2C americano** — capturar "private tour from Lisbon", "portugal wine tour", etc.
2. **B2B travel trade** — hub `/trade` para advisors/designers, com commission model, FAM trip inquiry, sem afiliações fictícias.

## Phase A — B2C americano (US database)

### A1. Realinhar copy dos Signature + Local Stories para voz US

- Trocar spelling PT-EN por US-EN em `seoTitle`/`seoDescription` (`travellers` → `travelers`, `favourite` → `favorite`, `personalised` → `personalized`) nos 11 Signatures em `src/data/signatureTours.ts` e nos artigos existentes de `src/content/local-stories-articles.ts`.
- Adicionar "from Lisbon" / "day trip from Lisbon" a titles onde faz sentido (Sintra, Évora, Arrábida, Tróia, Óbidos).
- Currency hint na description das top Signatures ("from $XXX per person") só quando o `pricing.ts` já expõe USD — não inventar.

### A2. Duas Local Stories novas (validadas por Semrush)

Só criar quando o volume US justifica. Alvos confirmados:

- `**/local-stories/sintra-day-tour-from-lisbon**` — 320/mês, KDI ~25. Já existe redirect top-level; falta o artigo real.
- `**/local-stories/evora-day-trip-from-lisbon**` — 40/mês, KDI 0. Redirect + artigo.

Cada artigo:

- H1 único, standfirst, 800–1200 palavras factuais (sem inventar stops/preços).
- BlogPosting JSON-LD + BreadcrumbList.
- Cross-link para a Signature tour real correspondente.
- Sitemap entry (auto).

### A3. Homepage + `/experiences` — sinais US

- &nbsp;
- Adicionar `hreflang="en-US"` self-referencing na `<head>` das rotas públicas via helper em `src/lib/seo.ts` (não alterar `__root.tsx` global).
- JSON-LD `Organization` já existe: adicionar `areaServed: "Portugal"` e `audience: { audienceType: "US travelers, travel advisors" }`.

## Phase B — Travel Trade hub `/trade`

### B1. Nova rota `src/routes/trade.tsx`

Página única, editorial, mobile-first. Sem afiliações fictícias.

**Estrutura (secções):**

1. Hero — "Portugal, designed with your clients in mind." Sub: "A direct partner for US travel advisors, designers, and agencies."
2. Why partner — 3 cards: *Real operator on the ground · Bookable in real time · One point of contact for your client*.
3. &nbsp;
4. What we design for your clients — link para Signature, Studio, Multi-day. Moments , corporate, travel designer full journeys 
5. FAM trip inquiry — bloco com formulário curto (nome, agência, email, país, mensagem) → Supabase `trade_inquiries` (ou reutilizar tabela existente de leads se houver — verificar em build mode).
6. FAQ (5 perguntas trade-focused).
7. Final CTA — "Request trade access" → mesmo formulário.

### B2. Metadata SEO trade

- `seoTitle`: "Portugal for travel advisors | YES Experiences trade partner"
- `seoDescription`: "Direct trade partner in Portugal for US travel advisors, designers and agencies. Private Signature experiences, custom multi-day journeys, one contact on the ground."
- JSON-LD `TravelAgency` + `Service` (audience: TravelAgent).

### B3. Descoberta interna

- Link discreto no footer sob "For partners" (o `/partners` hub actual é para OTAs/plataformas — manter separado).
- Link no `/about` ("Working with a travel advisor? See our trade page.").

### B4. Sitemap + robots

- `/trade` entra no sitemap com `priority=0.7`.
- Formulário de submissão POSTa para server function protegida por rate-limit + honeypot (não indexar `/trade/thanks` — adicionar ao robots).

## Phase C — Tracking baseline

- Registar snapshot Semrush **US database** hoje (0 keywords) como baseline oficial em `docs/seo/us-baseline-2026-07.md`.
- Adicionar linha no `/admin/seo-dashboard` (já existe) para `database=us` além de `pt`.
- Rescan agendado 30/60/90 dias.

## Fora de scope (não fazer agora)

- Não criar `/virtuoso`, `/signature-travel-network`, `/serandipians` — user confirmou que não há afiliação.
- Não inventar % de comissão específica.
- Não criar Douro Signature (não existe produto real).
- Não mexer no hero copy aprovado.

## Detalhes técnicos

- Ficheiros a criar: `src/routes/trade.tsx`, `src/routes/sintra-day-tour-from-lisbon` article body em `src/content/local-stories-articles.ts` (novo entry), idem `evora-day-trip-from-lisbon`, `docs/seo/us-baseline-2026-07.md`.
- Ficheiros a editar: `src/data/signatureTours.ts` (US spelling + "from Lisbon"), `src/content/local-stories-articles.ts` (US spelling passe), `src/lib/seo.ts` (helper hreflang), `src/routes/__root.tsx` JSON-LD Organization (audience/areaServed), `public/robots.txt` (bloquear `/trade/thanks`).
- Supabase: verificar em build mode se já existe tabela de leads reutilizável antes de criar `trade_inquiries`. Se criar: RLS + GRANTs + policy só-insert para `anon`, só-select para `admin`.
- Tests: adicionar assertion no `e2e/sitemap-robots-canonical.spec.ts` que `/trade` está no sitemap e que `/trade/thanks` está no `Disallow`.

## Métricas de sucesso (90 dias)

- US database Semrush: 0 → ≥15 keywords orgânicas.
- `/trade` indexada + ≥1 inquiry real submetida.
- `/local-stories/sintra-day-tour-from-lisbon` a rankar top-50 US para "sintra day tour from lisbon".
- Zero findings SEO no scanner.

## Pergunta antes de implementar

Confirmas que na trade page **não** queres pôr percentagem de comissão apenas "on request"? Percentagem visível ajuda advisors a decidir mais depressa, mas requer que fixes o número real primeiro. Não se menciona percentagem, isso é negociável 