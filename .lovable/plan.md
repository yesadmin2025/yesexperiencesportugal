## Goal
1. Adicionar checks automáticos com axe-core aos alternadores de idioma (`LanguageSwitcher`) e de moeda (`CurrencyToggle`) — o teste falha em violações de ARIA, contraste ou foco.
2. Tornar ambos os alternadores permanentemente visíveis no header mobile (fora do menu hamburger), mantendo o design premium.

## Changes

### 1. Mobile visibility — `src/components/Navbar.tsx`
- Adicionar um cluster compacto ao lado direito do header (antes do botão do menu) visível apenas em `<lg` com `LanguageSwitcher` + `CurrencyToggle` inline. Já visível no header desktop — permanece igual.
- Remover a duplicação dentro do painel mobile (`open && ...` bloco linhas 227–233) para evitar controlos duplicados.
- Estilo: mesma altura visual do botão de menu (44×44 tap target garantido pelo `.tap`), separador vertical fino a `--charcoal/15`, sem alterar tipografia nem tokens de cor.

### 2. Axe-core a11y spec — `e2e/switchers-a11y-axe.spec.ts` (novo)
Cobre header desktop, header mobile (novo cluster) e footer. Fluxo por viewport (`1280×800` e `393×780`):
1. `page.goto('/')`, aguardar font-ready.
2. Correr `AxeBuilder`  com `.include('[data-a11y-scope="language-switcher"]')` e depois `.include('[data-a11y-scope="currency-toggle"]')`.
3. `withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa'])` e regras explícitas: `color-contrast`, `aria-allowed-attr`, `aria-required-attr`, `aria-valid-attr-value`, `button-name`, `role-support-aria`, `focus-order-semantics`.
4. `expect(results.violations).toEqual([])` — teste falha em qualquer violação.
5. Foco por teclado: `Tab` até ao primeiro control do scope, verificar `:focus-visible` box (getBoundingClientRect + `outlineWidth` computado ≥ 2px) e roving `aria-pressed` após `Enter`/`Space`.

Adicionar `data-a11y-scope="language-switcher"` em `src/components/LanguageSwitcher.tsx` e `data-a11y-scope="currency-toggle"` em `src/components/CurrencyToggle.tsx` no elemento `role="group"` raiz (não altera visual).

### 3. Sem alterações de design
- Não mexer em tokens de cor, tipografia ou motion.
- Não modificar `SiteLayout`, footer nem outros componentes.

## Technical notes
- `@axe-core/playwright` e `axe-core` já instalados.
- Playwright config já em `393px` por defeito; adicionar override para desktop no describe correspondente via `test.use({ viewport: { width: 1280, height: 800 } })`.
- Contraste: a11y-scope root herda o fundo real (ivory no header, teal no footer) — axe avalia contra o fundo computado, sem hacks.
- Nenhum backend, nenhuma migration, nenhuma alteração de copy.

## Out of scope
- Redesign visual dos switchers.
- Alterações de i18n ou câmbio.
- Outros componentes fora dos dois alternadores.