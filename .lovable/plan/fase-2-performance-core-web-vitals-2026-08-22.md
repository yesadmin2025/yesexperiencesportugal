Auditoria — plano de execução (branding mantido)

O relatório é útil em técnica, mas as sugestões de **cores (#27257A) e fontes (Inter/Montserrat/Poppins)** contrariam a identidade já aprovada. Mantemos **teal / gold / ivory / charcoal** e **Fraunces + Inter**. Tudo o resto é implementado.

Fase 1— SEO on-page

- Breadcrumbs visíveis + `BreadcrumbList` JSON-LD nas páginas de tour, Local Stories e páginas de destino (hoje só existe em `/reviews`).
- Auditoria automática de headings: garantir 1 `<h1>` por rota e sequência `h2/h3` correta (extensão do `scripts/check-route-meta.mjs`, a correr no CI).
- Canonical + `hreflang` verificados em cada par EN/PT novo.
- Meta title/description específicos para cada rota PT nova (o validador já bloqueia duplicados).
- Schema: `TouristTrip` nas Signatures, `Product`/`Offer` no preço, `Organization` no rodapé — confirmar cobertura em todas as rotas públicas.

## Fase 2— Performance (Core Web Vitals)

- Converter as imagens restantes para WebP/AVIF com `width`/`height` explícitos (elimina CLS).
- `loading="lazy"` + `decoding="async"` em tudo abaixo da dobra; `fetchpriority="high"` só no LCP do hero.
- Confirmar `font-display: swap` nas duas famílias e pré-carregar apenas os pesos usados.
- Rever `Cache-Control` dos estáticos e manter GTM/Trustindex/Stripe em carregamento diferido (já iniciado).
- Alvos no Lighthouse CI já existente: LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms, Performance ≥ 90 no mobile.

## Fase 3 Acessibilidade e mobile

- Varredura de contraste em toda a paleta atual; onde falhar 4.5:1 uso os tokens mais escuros já aprovados (`--charcoal`, `--gold-ink`), nunca cores novas.
- Alvos de toque ≥ 44 px, foco visível consistente, zoom até 200 % sem overflow.
- `alt` significativo em todas as imagens informativas; `alt=""` nas decorativas.
- `<label>` associado a todos os inputs de data/hóspedes no Studio e no contacto; validação inline no formulário de contacto.
- Testes axe alargados às rotas PT novas.

## Fase 4 UX e conversão

- Homepage: reduzir o ruído acima da dobra e subir a prova social ("700+ avaliações 5 estrelas") para junto do CTA principal.
- Botão de checkout com estado de carregamento e bloqueio de duplo clique ("A carregar checkout…").
- Studio: indicador de progresso mais legível e tooltips de ajuda nos passos ambíguos, sem transformar o fluxo em formulário.
- Rodapé reorganizado em colunas claras (Experiências · Empresa · Legal · Contactos), sem links repetidos.

## Fase 5— Analytics

- Confirmar GA4 ligado ao GTM com Consent Mode v2 e eventos de funil: `studio_start`, `studio_reveal`, `begin_checkout`, `purchase`, `contact_submit`.
- Funil no GA4 para identificar abandono por passo do Studio.
- Search Console: submeter sitemap bilingue depois da Fase 1.

Fase 6 traduzir website para português 

## Notas técnicas

- Nenhuma alteração a `--teal`, `--gold`, `--ivory`, `--charcoal` nem às famílias Fraunces/Inter; o sistema de espaçamento de 8 px já existe em `styles.css` — apenas normalizo as exceções encontradas.
- Traduções em ficheiros i18n, não hardcoded, para futura gestão em CMS.
- Cada fase termina com os testes existentes (`check-route-meta`, sitemap integrity, axe, Lighthouse CI) verdes.

## Ordem sugerida

Fase 1 (maior impacto e maior esforço) → 2 → 4 → 3 → 5 → 6. Posso entregar a Fase 1 por lotes (tours primeiro, Studio depois) para revisares copy mais cedo.