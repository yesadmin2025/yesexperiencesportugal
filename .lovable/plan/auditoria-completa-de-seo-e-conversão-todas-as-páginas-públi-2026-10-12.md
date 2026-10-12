# Auditoria completa de SEO e conversão — todas as páginas públicas

Objetivo: verificar o site inteiro (EN e PT), listar tudo o que está partido ou fraco e corrigir só o que é técnico e seguro. Mudanças de texto, preços, regras de reserva ou marca ficam como propostas para aprovar.

## 1. SEO técnico (todas as páginas do sitemap)
- Cada página: abre sem erro, título e descrição únicos e no tamanho certo, um único H1, endereço oficial correto, ligação EN↔PT correta, imagem de partilha válida.
- Dados para o Google (tours, guias, empresa, avaliações): válidos, sem duplicados, sem avaliações inventadas.
- Sitemaps e robots.txt: só páginas públicas, nenhuma página escondida por engano, Privacy/Cookies/Tailor continuam fora do índice.
- Redirecionamentos antigos (studio-v3, multi-day, proposals, guias de vinho retirados) continuam a funcionar.
- Fotos: texto alternativo, tamanhos, carregamento rápido.
- Ligações internas: nenhuma ligação partida, nenhuma página órfã.

## 2. Google e pesquisa real
- Search Console: estado de indexação das páginas principais (tours, guias, Studio, Travel Designer, Moments, Corporate, FAQ), cliques e posições dos últimos 28 dias, páginas com muitas impressões e poucos cliques.
- Leitura por ferramentas de IA (llms.txt e acesso de rastreadores).
- Resultado: lista do que o Google ainda não indexou e porquê.

## 3. Velocidade e telemóvel
- Medição de carregamento em telemóvel nas páginas principais (home, Experiences, uma página de tour, Studio, Travel Designer, Contact).
- Verificação a 393px e em computador: sem conteúdo cortado, botões visíveis, toques com tamanho adequado.

## 4. Conversão (percurso de reserva)
- Percurso completo, parando antes de pagamento real: Signature (Reservar este dia), Tailor, Studio, Travel Designer (formulário), Moments e Corporate (contacto), WhatsApp.
- Verificar que cada botão leva ao sítio certo e usa o vocabulário aprovado.
- Funil na admin: onde as pessoas desistem, e confirmar que o registo de visitas, cliques e pagamentos está a contar (sem ruído de testes).
- Sinais de confiança junto ao preço e ao pagamento (avaliações 4,9/5, licença, cancelamento).

## 5. Entrega
- Relatório curto em português: o que está bem, o que foi corrigido, o que precisa da sua decisão (com opções).
- Correções técnicas seguras aplicadas e testadas (testes de SEO, compilação, verificação no browser).
- Nada publicado sem o seu pedido.

## Fora de âmbito sem aprovação
Preços, Stripe, regras de reserva, factos dos tours, texto do Hero, marca, estrutura de páginas, nova página ou novo conteúdo inventado.

## Detalhes técnicos
- Varrimento Playwright de todas as rotas de `src/generated/sitemap-routes.ts` (393×852 e 1280×900): status, head, H1, JSON-LD, links, consola.
- Guardas existentes: `check:route-meta`, `sitemap:check`, testes `seo-index-quality`, `seo-meta-and-link-hygiene`, `hreflang-reciprocity`, `jsonld-validity`.
- `seo_chat--list_findings` + novo scan; Search Console via conector (sites → URL Inspection por página, searchAnalytics 28 dias).
- Funil: `site_visits`, eventos do Studio e reservas `cs_live_` só leitura.
