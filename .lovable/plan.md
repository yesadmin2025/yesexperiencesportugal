## Goal
- Header (desktop + mobile) e footer: manter **apenas** o `LanguageSwitcher`. Remover o `CurrencyToggle` desses locais.
- `CurrencyToggle` passa a aparecer **só nas páginas onde há preços em euros**, colocado inline junto ao bloco de preços principal.

## Changes

### 1. Remover CurrencyToggle de header e footer
- `src/components/Navbar.tsx`: remover `<CurrencyToggle>` e o separador vertical do cluster mobile (mantém `Globe + LanguageSwitcher`) e do bloco desktop (linha 152). Remover import não usado.
- `src/components/Footer.tsx`: remover `<CurrencyToggle variant="footer" />` (linha 309) e o import.

### 2. Mount inline nas páginas com preços EUR
Criar `src/components/PriceCurrencyChip.tsx` — wrapper minimalista à volta do `CurrencyToggle` existente (mesmo componente, `variant="header"`, com eyebrow "Ver em" antes). Sem novo design, só posicionamento.

Montar `<PriceCurrencyChip />` nas rotas/componentes que hoje mostram preços em EUR, alinhado à direita, imediatamente acima do primeiro bloco de preços:
- `src/routes/experiences.tsx` e `src/routes/pt.experiences.tsx` — topo do grid de tours.
- `src/routes/day-tours.tsx` e `src/routes/pt.day-tours.tsx` — topo do grid.
- `src/routes/tours.$tourId.tsx` — junto ao painel de preço/reserva.
- `src/routes/tours.$tourId.tailor.tsx` — junto ao resumo de preço.
- `src/routes/multi-day.tsx` — junto ao bloco de investimento.
- `src/routes/portugal-travel-designer.tsx` — junto ao bloco de investimento (se aplicável).
- Studio V3: `src/components/studio-v3/*` — dentro do "Final Investment" onde já se mostra EUR.

Não montar em: homepage (sem preços), about, contact, terms, FAQs, admin, booking-confirmed, checkout (recibo é sempre EUR — mantém-se sem toggle), e-mails.

### 3. Testes
- `e2e/switchers-a11y-axe.spec.ts`: remover o cenário `[data-a11y-scope="currency-toggle"]` do header/footer; adicionar cenário que carrega `/experiences` e `/tours/<slug>` e corre axe apenas no `[data-a11y-scope="currency-toggle"]` inline. Mantém-se WCAG A/AA + focus visible.
- `e2e/currency-toggle-parity.spec.ts`: atualizar selectors — usa o chip inline em vez do header. Continua a validar que alternar EUR↔USD atualiza todos `[data-price-eur]` da página.
- `e2e/traveller-prefs-a11y.spec.ts`: dividir — parte do idioma continua no header; parte da moeda passa a testar-se numa página com preços (`/experiences`).

### 4. Sem alterações visuais fora do mount inline
- Não mexer no `CurrencyToggle.tsx` (aria/foco/contraste já cobertos).
- Não mexer em tokens, tipografia, motion.
- Persistência (cookie + localStorage) e Consent Mode mantêm-se.

## Out of scope
- Redesign do switcher.
- Mudanças em checkout/e-mails (permanecem EUR canónico).
- i18n de novo cobre — apenas usa keys existentes.