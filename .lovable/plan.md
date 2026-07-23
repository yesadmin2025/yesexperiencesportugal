## Objetivo

Adicionar três peças transversais ao site, sem alterar o design editorial:

1. **Banner de consentimento de cookies** (RGPD) integrado com o Consent Mode v2 já ativo.
2. **Ícone de troca de idioma PT/EN** visível no header e footer (o componente `LanguageSwitcher` já existe mas não está montado em lado nenhum).
3. **Conversor de moeda EUR → USD** aplicado aos preços exibidos publicamente (Signature, Tailor, Studio V3, cards).

---

### 1. Cookie consent (RGPD + Consent Mode v2)

- Criar `src/components/CookieConsent.tsx` — cartão inferior discreto, ivory/charcoal, com três ações: **Aceitar tudo**, **Só essenciais**, **Personalizar** (modal com toggles: analytics, ads).
- Persistir escolha em `localStorage` (`yes.cookieConsent.v1`) + cookie 180 dias.
- Chamar `window.gtag('consent','update', {...})` com o mapeamento correto (`analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization`).
- Só renderiza se ainda não houver decisão; disparar evento GA4 `consent_choice`.
- Montar em `src/components/SiteLayout.tsx` (uma única vez, fora do Studio full-bleed).
- Adicionar link "Preferências de cookies" no footer que reabre o modal.
- Respeitar `prefers-reduced-motion` no fade-in.

### 2. Language switcher visível (PT · EN)

- Montar `<LanguageSwitcher variant="header" />` em `src/components/Navbar.tsx` (desktop: à direita antes do CTA; mobile: dentro do menu, topo).
- Montar `<LanguageSwitcher variant="footer" />` na linha legal do `Footer.tsx`.
- Manter o design chip existente (11–12px, tracking 0.22em, separador `·`, teal ativo). Adicionar um pequeno ícone globo (lucide `Globe`) apenas no header, à esquerda do par de chips, para reforçar affordance.
- Nada de auto-redirect por Accept-Language (Google penaliza) — comportamento atual mantém-se.

### 3. Conversor de preços EUR → USD

- Criar `src/lib/currency.ts`:
  - `SUPPORTED = ['EUR','USD']`, default `EUR`.
  - `useCurrency()` hook (Context) com persistência em `localStorage` (`yes.currency.v1`).
  - `formatPrice(amountEur, { currency, locale })` — devolve string formatada com `Intl.NumberFormat`.
  - Taxa EUR→USD carregada de `src/config/fx-rates.ts` (constante versionada, ex. `1 EUR = 1.08 USD`, com nota "Rates updated {date}. Charges processed in EUR."). Sem chamada externa em runtime — evita CLS, custo e falhas de edge.
- Adicionar `<CurrencyProvider>` em `SiteLayout.tsx`.
- Criar `<CurrencyToggle />` chip (EUR · USD) ao lado do `LanguageSwitcher` no header e footer, mesmo tratamento visual.
- Substituir os locais que hoje formatam preço à mão para usar `formatPrice(...)`:
  - `src/components/ui/PricePerPerson.tsx`
  - `src/components/studio-v3/SignaturePriceCard.tsx`
  - `src/components/studio-v3/CheckoutSummary.tsx`
  - `src/components/studio-v3/InvestmentTierPicker.tsx`
  - `src/components/SimpleBookingForm.tsx`
  - `src/routes/tours.$tourId.tailor.tsx` (linhas de tier)
- **Regra crítica (não alterar):** o *checkout* Stripe, cálculos server-side, PDFs (`signatureOnePagerPdf.tsx`) e emails permanecem em **EUR**. USD é apenas indicativo na UI pública. Adicionar micro-legenda "≈ USD · Charged in EUR" junto ao preço quando `currency === 'USD'`.
- Não tocar em `src/lib/studio-v3/composerPricing.ts` nem em `supabase/functions/**` (SSOT de preço).

### Testes

- `e2e/cookie-consent.spec.ts`: banner aparece na primeira visita, desaparece após escolha, `gtag('consent','update')` é chamado.
- `e2e/language-switcher.spec.ts`: ambos os chips visíveis no header e footer em `/` e `/tours/arrabida-wine-allinclusive`, PT desativado com tooltip nas rotas sem PT.
- `src/lib/__tests__/currency.test.ts`: `formatPrice(100,'EUR','en')` → `€100`, `formatPrice(100,'USD','en')` com taxa configurada.
- Estender `e2e/checkout-price-parity.spec.ts` para assegurar que o checkout permanece em EUR mesmo com toggle em USD.

### Fora do âmbito

- Tradução real de conteúdo PT (fluxo separado, já existe `pt-ready.ts`).
- FX ao vivo (fica para v2 se o negócio quiser).
- Alterar identidade visual ou tipografia.

---

### Detalhes técnicos

- Cookie consent: componente client-only, gate `useHydrated()` para evitar mismatch SSR.
- Currency: Provider client-only; durante SSR renderiza EUR (default) — nenhum layout shift porque a taxa é síncrona.
- Ambos os toggles seguem o padrão `<Eyebrow>`-style (11px uppercase, tracking 0.22em) já canônico.
- Nenhum ficheiro auto-gerado é tocado (`routeTree.gen.ts`, `integrations/supabase/*`).
