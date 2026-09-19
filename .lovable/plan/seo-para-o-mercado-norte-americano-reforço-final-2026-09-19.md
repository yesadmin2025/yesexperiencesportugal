# SEO para o mercado norte-americano — reforço final

## Ponto de partida (verificado agora)

A base já está feita e está boa: 75 páginas com título, descrição e Open Graph únicos (verificação passou sem duplicados), sitemap com todas as 12 experiências mais artigos e versões PT, sitemap de imagens com fotografia real, e dados estruturados ricos (experiência com preço, avaliações, perguntas frequentes, migalhas de navegação, itinerário, empresa local e fundadora).

Ou seja: não há nada estragado para "consertar". O que falta é afinação para quem pesquisa nos Estados Unidos.

Nota honesta: ninguém pode garantir primeira página no Google. O que se pode garantir é que o site fica tecnicamente impecável e a responder exatamente às pesquisas americanas.

## O que vou fazer

### 1. Palavras-chave com linguagem americana
Dados reais de pesquisa nos EUA mostram procura em "lisbon tours" (1.600/mês), "lisbon day tours" e "day tours from lisbon" (480 cada), "tours of portugal" (480), "luxury tours of portugal" e "lisbon private tours" (260 cada).

Vou alinhar títulos, descrições e primeiros parágrafos das páginas comerciais com estas expressões, mantendo o tom da marca e sem inventar produtos. Inclui hábitos americanos de escrita: "day trip", "wine tasting", "small group", "pickup at your hotel", distâncias em milhas quando fizer sentido no texto, e valores indicativos em dólares no corpo do texto (a cobrança continua em euros).

### 2. Qualidade do resultado no Google (snippet)
- Cada título entre 50 e 60 caracteres, com a promessa e o local no início.
- Cada descrição entre 120 e 160 caracteres, com preço desde, duração e recolha no hotel — os três motivos pelos quais um americano clica.
- Verificação automática de comprimento para não voltar a desalinhar.

### 3. Dados estruturados (o que gera resultados destacados)
- Perguntas frequentes específicas de cada experiência, com as dúvidas típicas do viajante americano (recolha, duração total, cancelamento, crianças, cruzeiro).
- Preço e disponibilidade confirmados em todas as fichas de experiência.
- Migalhas de navegação em todas as páginas de destino e artigos.
- Público-alvo dos Estados Unidos e Canadá declarado nas páginas comerciais principais.

Nada disto altera preços, inventário ou factos das experiências.

### 4. Sitemap e indexação
- Data da última alteração em todas as páginas, não só nos artigos, para o Google recolher mais depressa o que muda.
- Confirmação de que todas as 12 experiências, páginas de destino e artigos devolvem 200 direto, sem redirecionamento.
- Reenvio do sitemap ao Google depois de publicar.

### 5. Duas páginas de resposta direta que faltam
Para pesquisas americanas com intenção de compra que hoje não têm página própria:
- "Lisbon day tours" — página que compara os dias disponíveis por duração, região e preço desde, com reserva imediata.
- "Portugal tours from the USA" — voos, fuso horário, gorjetas, quantos dias, recolha no hotel, o que está incluído, com ligação às experiências reais.

Sem duplicar as páginas de vinho existentes e sem canibalizar o que já ranqueia.

### 6. Medição
No painel, acompanhar por experiência: cliques do Google, posição média, e quantos terminam em pagamento. Revisão semanal da maior perda.

## Detalhes técnicos

- Metadados por rota em `head()`; validação por `scripts/check-route-meta.mjs` mais um novo teste de comprimento de título/descrição.
- Dados estruturados através dos ajudantes existentes em `src/lib/jsonld.ts` (`tourProductLd`, `faqPageLd`, `breadcrumbLd`, `organizationUsCaAudienceLd`) — sem criar um segundo sistema.
- Perguntas por experiência em ficheiro de conteúdo, não no componente.
- `lastmod` acrescentado em `src/routes/sitemap[.]xml.ts` e rotas geradas em `src/generated/sitemap-routes.ts`.
- Novas páginas como rotas próprias, com entrada no sitemap regenerado.
- Testes existentes de sitemap, hreflang, dados estruturados e ligações internas têm de continuar a passar.

## Fora de âmbito

Preços, inventário, factos das experiências, regras de cancelamento, lógica de pagamento, esquema da base de dados e arquitetura de rotas existentes ficam intactos.
