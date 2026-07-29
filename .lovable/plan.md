## Objetivo

Selo Trustindex estático e discreto no rodapé, em linguagem de marca (ivory/gold sobre charcoal), sem o badge flutuante verde. Trustindex passa a ser o único fornecedor de reviews de terceiros no site.

## O que muda

### 1. Novo `src/components/trust/TrustindexBadge.tsx`

Selo estático, sem script de terceiros a correr em todas as páginas:

- Uma linha, Inter 11px uppercase, tracking 0.22em:
`★★★★★ 4.9 · 1000 reviews · Verified by Trustindex`
- Estrelas em `--gold`, texto em `--ivory`/75, sem caixa verde nem logo importado.
- Link para a página pública do certificado Trustindex (`target="_blank"`, `rel="noopener nofollow"`), min-height 44px, focus-visible em gold — mesmas regras dos outros badges de confiança.
- Sem animação; respeita `prefers-reduced-motion` por herança da regra global.
- Valores (4.9 / 1000) num único `const` no topo do ficheiro, fáceis de atualizar.

### 2. `src/components/Footer.tsx`

Renderizar o selo na barra legal, imediatamente acima do Livro de Reclamações, separado por espaçamento (sem nova regra visual — a barra já tem a linha gold). Ordem final do rodapé: pagamentos → barra legal → Trustindex → Livro de Reclamações.

### 3. Remover o Trustmary

`TrustmarySection.tsx` não está montado em nenhuma rota (só referências em comentários e no checklist de QA). Como pediste um só fornecedor:

- Apagar `src/components/TrustmarySection.tsx`.
- Limpar as referências em `src/routes/qa.mobile.tsx` (secção "5 — Trustmary widget"), `src/content/approved-homepage-structure.ts`, `src/lib/home-motion.ts` e `src/components/ui/CredentialStrip.tsx` (comentários).
- A homepage mantém as reviews reais próprias (`RealReviewsStrip` / `GuestQuotes`) — nada de conteúdo perdido.

### 4. SEO

O script do Trustindex não gera `AggregateRating` rastreável (injeção client-side), por isso o ganho vem do nosso JSON-LD:

- Adicionar `aggregateRating` (4.9 / 1000) à entidade `Organization`/`TravelAgency` em `src/lib/jsonld.ts`, já que os valores são verificáveis no certificado público.
- Nada de números inventados; se preferires não publicar o agregado ao nível da organização, salto este ponto.

Como não carregamos o `loader-cert.js`, **não é preciso mexer na CSP** em `public/_headers` — zero impacto em performance e em Core Web Vitals.

## Teste

Playwright rápido: selo visível no rodapé a 393px e em desktop, link abre em nova aba, sem badge flutuante em viewport, contraste ok sobre charcoal. Mas anger o icon oficial do trust index de forma credível 