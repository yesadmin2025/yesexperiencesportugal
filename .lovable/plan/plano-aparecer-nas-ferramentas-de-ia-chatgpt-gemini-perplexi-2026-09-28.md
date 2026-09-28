# Plano: aparecer nas ferramentas de IA (ChatGPT, Gemini, Perplexity, AI Overviews)

Objetivo: quando alguém perguntar a uma IA "melhores tours privados de vinho a partir de Lisboa" ou "como organizar um pedido de casamento em Portugal", a YES Experiences aparece como resposta ou fonte citada.

## O que já existe (verificado)

- `public/llms.txt` existe (o "cartão de visita" para IAs), mas está desatualizado: o link do FAQ aponta para `/#faq` (errado, devia ser `/faq`), não lista as 13 experiências nem os artigos novos.
- Dados estruturados (schema) sem erros nas 92 páginas — boa base, as IAs leem isto.
- Nenhum bloqueio a robôs de IA no robots.txt — GPTBot, ClaudeBot e PerplexityBot podem ler o site.
- Não existem blocos de "resposta direta" no topo das páginas — o formato que as IAs mais citam.

## 1. Corrigir e expandir o llms.txt

- Corrigir o link do FAQ para `/faq`.
- Adicionar as 13 experiências com nome, duração e preço de partida (factos reais, já publicados).
- Adicionar os artigos de autoridade novos (custo de tours privados, pedidos de casamento, quantos dias em Portugal).
- Adicionar secção "Facts" curta: operador licenciado RNAAT, 4.9/5 em 1.000 avaliações, recolha em qualquer ponto de Portugal, confirmação instantânea.

## 2. Blocos de "resposta direta" nas páginas-chave

Adicionar um pequeno bloco de 2–3 frases factuais no topo das páginas mais importantes, escrito como resposta pronta a citar:

- As 13 páginas de experiência (o que é, duração, preço de partida, recolha).
- `/experiences`, `/portugal-travel-designer`, `/proposal-in-portugal`, `/corporate`.
- Os 3 artigos de autoridade novos.

Sem texto inventado — só factos já verificados e publicados. Visualmente discreto, dentro do sistema de design atual.

## 3. Reforçar a identidade da empresa para as IAs

- Garantir que os dados da empresa (nome, morada, telefone, RNAAT) são idênticos em todas as páginas e no schema.
- Adicionar no schema da organização as ligações oficiais (Google Business, TripAdvisor, Viator, Instagram) para as IAs ligarem tudo à mesma empresa.

## 4. Confirmar acesso dos robôs de IA

- Verificar o robots.txt e os cabeçalhos do site: garantir que GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot e Google-Extended não estão bloqueados.

## 5. O que só você pode fazer (fora do site)

- Publicar fotos e posts regulares no Google Business Profile.
- Responder a todas as avaliações (Google, TripAdvisor, Viator).
- Manter o nome/morada/telefone iguais em todos os diretórios.

## Fora de âmbito

Preços, factos das experiências, lógica de reserva/Stripe, estrutura de endereços, título da homepage e animações aprovadas ficam intactos.

## Detalhes técnicos

- Ficheiros: `public/llms.txt`, `src/lib/jsonld.ts` (sameAs da organização), componente de resposta direta reutilizável + inserção nas rotas das experiências e artigos.
- Validação: testes de SEO existentes (`seo-index-quality`, `jsonld-validity`), build, e verificação ao vivo após publicar.
- Nada é publicado sem o seu pedido explícito.
