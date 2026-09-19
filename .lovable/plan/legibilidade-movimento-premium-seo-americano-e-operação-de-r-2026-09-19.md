# Legibilidade, movimento premium, SEO americano e operação de reservas

## Objetivo

Corrigir a leitura e o alinhamento mobile mostrados nas capturas, tornar o movimento claramente visível sem bounce nem efeitos baratos, afinar cada experiência para pesquisas reais dos Estados Unidos, melhorar as páginas Contact e FAQ já existentes, reforçar o painel de reservas já funcional e publicar com validação do sitemap e dos snippets renderizados.

A implementação não altera preços, disponibilidade, itinerários, regras de reserva, cobrança Stripe, cancelamentos, dados das experiências, esquemas da base de dados ou URLs atuais.

## Evidência de pesquisa dos EUA

A pesquisa Semrush confirma procura comercial para:

- `day trips from lisbon` — 2.400 pesquisas/mês
- `lisbon tours` — 1.600/mês
- `best day trips from lisbon` — 590/mês
- `lisbon day tours` e `day tours from lisbon` — 480/mês cada
- `sintra day tour from lisbon` e `sintra tours from lisbon` — 320/mês cada
- `lisbon private tours` — 260/mês
- `portugal private tours` — 210/mês
- `private tours lisbon`, `private tours portugal`, `lisbon wine tour` e `wine tasting lisbon` — 170/mês cada
- `luxury portugal tours` e `portugal wine tours` — 140/mês cada
- `luxury portugal vacation` — 110/mês
- `sintra private tour` e `portugal honeymoon itinerary` — 70/mês cada
- `evora day trip from lisbon` — 40/mês
- `alentejo wine tour` e `private boat tour lisbon` — 30/mês cada
- `arrabida wine tour`, `private wine tour lisbon`, `nazare day trip from lisbon`, `coimbra day trip from lisbon` e `tomar day trip from lisbon` — 20/mês cada

Termos sem volume confirmado não serão apresentados como “populares”. Serão usados apenas como variações long-tail quando descrevem fielmente o produto. Não é possível garantir primeira página; a meta é alinhar conteúdo, intenção, confiança e indexação com procura real.

## 1. Corrigir os blocos de reserva no mobile

- Retirar a sensação de “caixa dentro de caixa”: no mobile, data e composição terão uma única moldura coerente, sem bordas duplicadas nem campos a ultrapassar o contentor.
- Manter o campo de data a 16 px para evitar zoom automático no iPhone, com largura real de 100%, `min-width: 0` e mensagem de erro alinhada ao campo.
- Reestruturar “Adults” e “Travelling with children?” com grelha mobile estável: texto à esquerda, controlos com largura fixa à direita, sem a indicação `Party 2` quebrar para uma linha isolada.
- Aumentar os textos pequenos essenciais para pelo menos 11–12 px, reduzir tracking excessivo em frases longas e melhorar contraste.
- Tornar a tabela de preços por idade mais compacta e legível; manter integralmente as percentagens e regras atuais.
- Garantir alvos tácteis de 44 px e impedir que o WhatsApp cubra controlos ou texto importante.

## 2. Movimento premium claramente visível

- Consolidar a apresentação pública no sistema já criado: revelação horizontal tipo “ink”, opacidade/contraste e composição por capítulos; sem subir/descer, bounce, pulse infinito ou parallax barato.
- Fazer uma frase curta por secção principal revelar-se em 2–3 partes enquanto entra no ecrã. O texto continuará presente no HTML desde o primeiro render, evitando problemas de hidratação e SEO.
- Reforçar as setas dos CTAs no mobile: linha dourada desenha-se e a seta avança 7–8 px uma única vez quando o CTA entra no viewport, permanecendo na posição final. Não depender de hover.
- Aplicar uma sequência editorial clara nas páginas públicas: eyebrow/regra → frase → apoio → imagem → CTA.
- Usar movimento mais visível em Home, About, Experiences, experiências individuais, Travel Designer, Moments, Corporate, Contact e FAQ.
- Manter reserva, checkout, Studio, Tailor, autenticação e admin funcionais e calmos; apenas resposta táctil imediata, sem animação decorativa.
- Remover conflitos entre motores de reveal e garantir `prefers-reduced-motion` sem conteúdo escondido.

## 3. SEO por experiência, baseado em intenção real

Usar uma matriz única de SEO ligada às 12 experiências atuais. Cada entrada terá palavra-chave principal, variações semânticas, título, descrição, OG title e OG description. O itinerário e as promessas continuam a vir das fontes verificadas existentes.

### Distribuição de intenção

- Arrábida Wine: `lisbon wine tour`, `arrabida wine tour`, `private wine tour lisbon`
- Arrábida Picnic: `day trips from lisbon`, `arrabida day trip from lisbon`, `lisbon coastal tour`
- Arrábida Boat: `private boat tour lisbon`, `arrabida day trip from lisbon`, `sesimbra day trip from lisbon`
- Tile Workshop: `azulejo tile painting workshop lisbon`, `things to do in lisbon portugal`
- Azeitão Cheese & Wine: `wine tasting lisbon`, `lisbon wine tour`, `wine tasting near lisbon`
- Sintra & Cascais: `sintra day tour from lisbon`, `sintra tours from lisbon`, `sintra private tour`
- Tróia & Comporta: `comporta day trip from lisbon`, `private tours lisbon`
- Évora & Alentejo: `evora day trip from lisbon`, `alentejo wine tour`, `portugal wine tours`
- Tomar & Coimbra: `tomar day trip from lisbon`, `coimbra day trip from lisbon`
- Fátima, Nazaré & Óbidos: `fatima day trip from lisbon`, `nazare day trip from lisbon`, `obidos day trip from lisbon`
- Roman Heritage Alentejo: `alentejo wine tour`, `portugal wine tours`, `private tours portugal`
- Vicentine Coast: `day trips from lisbon`, `portugal private tours`, `luxury portugal tours`

### Regras editoriais

- Evitar que as 12 páginas concorram pela mesma palavra: os termos amplos ficam nos hubs; cada produto recebe uma intenção específica.
- Títulos com destino e produto primeiro, preferencialmente 50–60 caracteres.
- Descrições com aproximadamente 130–160 caracteres, incluindo apenas factos reais úteis à decisão: privado, partida de Lisboa, duração, elementos incluídos e reserva quando aplicável.
- OG title/description próprios, canonical autorreferente, `twitter:card`, Product/TouristTrip, preço, disponibilidade, avaliações reais, breadcrumbs e FAQ específica.
- Não acrescentar keywords meta: o Google não usa essa tag. As palavras-chave serão aplicadas no título, descrição, H1, introdução, FAQ, links internos e dados estruturados onde fizer sentido.
- Criar testes para unicidade, comprimento, canonical, OG, schema e correspondência das 12 experiências.

## 4. Contact e FAQ premium

As duas páginas já existem, já têm canonical e schema; serão refinadas, não recriadas.

### Contact

- Melhorar hierarquia mobile, espaçamento e leitura do formulário.
- Introduzir uma abertura editorial com movimento horizontal visível e contactos diretos claros.
- Preservar validação, envio, rastreio e dados comerciais reais.
- Afinar título e descrição para `Portugal private tour contact` / `Portugal travel designer`, sem transformar a página num texto artificial para motores de busca.

### FAQ

- Aplicar a mesma narrativa visual, com transição visível na abertura e nas categorias.
- Simplificar a leitura dos accordions no mobile e melhorar estados aberto/fechado.
- Consolidar o conteúdo público da página para evitar divergências, preservando FAQs específicas por experiência.
- Manter FAQPage e Breadcrumb schema, com perguntas reais sobre reserva, pickup, pagamento, cancelamento, crianças e tours privados.

## 5. Painel admin de reservas

O painel já mostra reservas, estados, cliente, email, telefone, WhatsApp, data, grupo, total, pickup, calendário e detalhe congelado da compra. A melhoria será operacional:

- Tornar o estado imediatamente legível com marcadores semânticos discretos e filtros mobile mais claros.
- Mostrar o nome humano da experiência em vez do ID técnico, mantendo o ID disponível no detalhe.
- Dar acesso direto a email, telefone e WhatsApp sem poluir cada linha.
- Destacar reservas que precisam de atenção e separar claramente pagas, pendentes, canceladas e reembolsadas.
- Manter a lista segura apenas para administradores e as leituras existentes; não é necessária nova tabela.
- Preservar o detalhe, snapshot da compra e cancelamento/reembolso atuais.

## 6. Sitemap, snippet e validação antes de publicar

- Regenerar o sitemap pelas fontes existentes; as 12 experiências, Contact e FAQ já entram automaticamente.
- Não inventar `lastmod`: usar apenas datas reais de alteração de conteúdo quando existirem.
- Verificar que cada uma das 12 URLs devolve 200 direto, está no sitemap e emite título, descrição, canonical, OG, Product/TouristTrip, avaliação real e FAQ quando aplicável.
- Verificar Contact e FAQ da mesma forma.
- Testar a interface a 393 px e desktop, com scroll completo, sem overflow, sobreposição, erros de consola ou conteúdo invisível.
- Validar o fluxo até à abertura do checkout real sem efetuar cobrança.
- Publicar após a verificação de segurança.
- Depois da publicação, confirmar no HTML público os snippets pretendidos e o sitemap. O Google pode reescrever o snippet e só o atualizar após novo crawl; a publicação garante os sinais corretos, não o texto exato apresentado imediatamente no resultado.
- Se a ligação ao Search Console estiver acessível, listar primeiro as propriedades verificadas e reenviar o sitemap apenas à propriedade exata do domínio publicado.

## Critérios de conclusão

- Os blocos das capturas ficam alinhados e legíveis a 393 px.
- Setas e frases mostram movimento perceptível no scroll mobile, uma vez, sem bounce.
- As 12 experiências têm metadados únicos orientados a procura real dos EUA.
- Contact e FAQ mantêm estilo, funcionalidade, indexação e schema premium.
- O admin mostra reservas, estado e contacto com leitura rápida no telemóvel.
- Sitemap e HTML público são verificados depois da publicação; nenhuma regra comercial ou factual é alterada.
