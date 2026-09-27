# Correções SiteGuru: conteúdo semelhante, ligações internas e oportunidades

## Leitura dos relatórios (26 ago – 24 set)
- Saúde do site: 94%. Os avisos sobre indexação, canonical, redirecionamentos e meta descriptions vêm sobretudo de páginas que são privadas de propósito (Tailor, cookies/privacidade PT). Vou confirmar lista a lista e corrigir só o que for real.
- Páginas a crescer: guia de vinhos de Lisboa (+360% impressões), Sesimbra (514 impr.), homepage (+59% cliques), About, Travel Designer, pedido de casamento (+134%), Fátima–Nazaré–Óbidos (+306%).
- IA (ChatGPT): 1 visita, para o tour da Arrábida.

## Problema mais importante: canibalização que eu criei
Já existia a página `/how-many-days-in-portugal`, e o artigo novo `/local-stories/how-many-days-in-portugal` responde à mesma pesquisa. Além disso, o SiteGuru diz que `/how-many-days-in-portugal` é 93% igual a `/portugal-itinerary`.
- Juntar o artigo novo à página original (a que já tem 118 impressões) com redirecionamento permanente, trazendo o melhor texto novo: qualquer duração, a partir de qualquer ponto de Portugal.
- Dar uma função diferente a cada página: `/portugal-itinerary` = rotas e distâncias; `/how-many-days-in-portugal` = quantos dias e ritmo. Cada uma com texto de abertura e perguntas frequentes próprias, e ligação uma para a outra.
- Confirmar que os artigos de preços e de pedido de casamento não repetem `/proposal-in-portugal` nem `/portugal-tours`. Se repetirem, acerto o foco de cada um.

## Pares "muito semelhantes" a corrigir
1. `/lisbon-wine-tours` vs guia de vinhos (96%): o guia fica como página principal. `/lisbon-wine-tours` passa a ser a página de reserva: cada experiência de vinho com reserva direta e o mínimo de texto repetido. Como alternativa, redireciono se estiver vazia de pesquisas (tem 25 impressões).
2. `/local-stories/best-wineries-near-lisbon` vs guia de vinhos (93%): passa a falar das adegas e das regiões, sem voltar a comparar os tours.
3. `/experiences` vs `/day-tours` (95%): `/experiences` = coleção completa para reservar; `/day-tours` = escolher o dia pela duração e pela região. Abertura e títulos de cada uma reescritos.
4. `/tours/arrabida-wine-allinclusive`, `/tours/arrabida-boat` e `/tours/wild-beaches-picnic` (95%): o texto partilhado da página do tour é igual nos três. Destaco mais cedo o que cada um tem de único, usando apenas os factos já publicados.
5. `/private-tours-arrabida-sesimbra` vs `/private-tours-azeitao-setubal` (93%): cada região com abertura, destaques e perguntas próprias.
6. Tailor, cookies/privacidade PT e contacto PT: são privadas de propósito ou páginas legais. Não mudo nada e marco como falso positivo.

## Oportunidades
- Ligações internas: ligar as páginas a crescer (Sesimbra, Fátima, pedido de casamento, Travel Designer) aos tours reais e ao hub certo.
- Pesquisas quase no top 3: reforçar título, H1 e primeiro parágrafo de Sesimbra, "portugal proposal", "travel designer" e "arrabida boat tour", sem mudar as ligações nem inventar factos.
- Visibilidade em IA: uma resposta curta e factual no topo das páginas principais (o que é, duração, desde quanto, recolha) para ser mais fácil citar.

## Fora do âmbito
Não mexo em preços, reservas, pagamento com Stripe, factos dos tours, base de dados, título/CTAs da homepage, cores nem animações. Backlinks dependem de ação externa: deixo só recomendações.

## Detalhes técnicos
- Redirecionamento 301 `/local-stories/how-many-days-in-portugal` → `/how-many-days-in-portugal`, adicionando o slug a `CONSOLIDATED_LOCAL_STORY_SLUGS` (sai do sitemap automaticamente). Atualizar as ligações em `portugal-tours.tsx` e `day-trips-from-lisbon.tsx`.
- Copy em `local-stories-articles.ts`, nos ficheiros das rotas regionais e em `experiences.tsx`/`day-tours.tsx`. A abertura única de cada tour vem de dados que já existem.
- Testes: novo teste que impede usar o mesmo slug/intenção em Local Stories e numa página de topo. Correm os testes SEO existentes e o build.
- Fica em preview. Só publico quando pedires.
