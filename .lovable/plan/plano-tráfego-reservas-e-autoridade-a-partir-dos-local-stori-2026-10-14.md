# Plano: tráfego, reservas e autoridade a partir dos Local Stories

## O que os concorrentes nos mostram (Semrush, mercado EUA, hoje)
- Lisbon Native Tours: 81% do tráfego vem da página inicial ("lisbon tours"); a única página interna que traz visitas é o tour de Fátima ("fatima tours from lisbon", posição 3).
- Lisbon Winery: 87% vem da marca; um artigo sobre vinho do Porto ("expensive port") traz tráfego extra.
- Lisbon Riders: 96% marca; a página Sintra + Cascais ("sintra small group tour from lisbon", posição 4).
- Conclusão: os concorrentes não ganham com muitos artigos — ganham com poucas páginas muito focadas num destino concreto a partir de Lisboa, mais nome de marca e links. Nós já temos guias para estes temas, por isso a oportunidade é aprofundar, não criar dezenas de páginas novas.

## 1. Tráfego — reforçar 4 guias existentes (sem inventar factos)
1. Fátima, Nazaré e Óbidos: focar em "Fatima tour from Lisbon" (título, primeiro parágrafo, perguntas frequentes reais: duração, horários, o que inclui — só o que está no tour verificado).
2. Sintra e Cascais: focar em "private Sintra and Cascais tour from Lisbon"; comparar privado vs. grupo com ligação ao guia já existente.
3. Melhores day trips from Lisbon (~2.400 pesquisas/mês): tornar o guia central, com ligação para cada destino que operamos (Sintra, Arrábida, Fátima, Évora, Setúbal).
4. Guias de vinho (wine tours Lisbon / best wineries near Lisbon): consolidar ligações internas para que um guia seja o principal e os outros o apoiem, evitando competirem entre si.
- Ver primeiro no Search Console o que cada guia já recebe, para não mexer nos que foram atualizados há menos de 3 semanas.

## 2. Reservas — cada guia leva a uma ação
- No fim de cada guia reforçado: um bloco discreto com o dia Signature correspondente ("Reserve this day") e "Design your day" no Studio.
- Medir cliques guia → reserva no painel de Conversões já existente (sem novo sistema).

## 3. Autoridade — links verdadeiros
- Lista de parceiros reais já citados nos tours (adegas, queijarias, barcos) para pedir uma ligação na página deles; preparo os emails em PT/EN.
- Hotéis e concierges em Lisboa: mensagem curta com os guias como recurso útil para hóspedes.
- Pedir avaliações Google a clientes recentes (mensagem + QR), usando o Perfil de Empresa verificado.
- Guardar pesquisa e plano em Files (marketing/research.md e plan.md).

## Ordem
1. Pesquisa guardada + verificação Search Console dos 4 guias.
2. Reforço dos guias (Fátima e Sintra primeiro).
3. Bloco de reserva no fim dos guias.
4. Emails a parceiros e hotéis (só envio com a sua aprovação).
5. Nada é publicado sem pedido explícito.

## Detalhes técnicos
- Edições em `src/content/local-stories-articles.ts` dentro do registo e rota dinâmica existentes; metadados e sitemap seguem automaticamente.
- Bloco de reserva reutiliza primitivas existentes (CtaButton/EditorialCard) e o vocabulário de CTA aprovado.
- Factos apenas do conteúdo verificado dos tours; nenhuma avaliação, preço ou parceiro inventado.
