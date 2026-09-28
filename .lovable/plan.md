# Relatório SiteGuru (28 Set) — o que corrigir

A saúde do site está em 95%. Não há links partidos, imagens sem texto alternativo nem erros no sitemap. Há poucos problemas reais. A lista abaixo separa o que vale a pena corrigir do que já está certo de propósito.

## Fica como está (é intencional)
- As 10 páginas "não indexáveis" (/privacy, /cookies, as versões /pt e as 6 páginas /tailor) estão escondidas do Google de propósito. São páginas de utilidade ou de edição, e as nossas verificações automáticas garantem que continuam assim.
- As descrições do Google das páginas /tailor são um pouco longas (176–188 caracteres), mas essas páginas nunca aparecem nos resultados. Mesmo assim, vão ser encurtadas (ponto 2), porque a correção é simples.

## O que muda
1. **/proposals passa a redirecionar para /proposal-in-portugal.** Hoje mostra a mesma página com outro endereço, o que dá o aviso de "canonical". O redirecionamento definitivo é o mesmo que já usamos para /studio-v3 e /multi-day. Os links antigos continuam a funcionar e tudo passa a contar para um só endereço.
2. **Descrições com mais de 170 caracteres:**
   - /proposal-in-portugal (171): encurtar para cerca de 155 sem perder "Lisbon, Sintra, Arrábida" nem "discreetly".
   - Modelo das páginas /tailor: texto mais curto, por exemplo "Adjust pace, timing, group needs and small additions to the {nome curto} Signature.", mantendo cada uma com menos de 160 caracteres.
3. **Pesquisas quase no top 3 (só texto, sem factos novos):**
   - **Fátima–Nazaré–Óbidos:** tem 157 aparições em pesquisas em espanhol e 28 em alemão, mas nenhum clique. Vamos acrescentar na página uma linha curta a dizer que a visita guiada existe em espanhol e alemão, **só se me confirmar que oferecem essas línguas**. Se não confirmar, esta parte fica de fora.
   - **Sesimbra** (posições 8–18): melhorar o título e a primeira frase de /local-stories/what-to-do-in-sesimbra para cobrir "Sesimbra, Portugal", "old town" e "things to do". Acrescentar um link direto para a experiência Arrábida & Sesimbra.
   - **Wine tours Lisbon** (posições 11–17 no guia): reforçar no guia as expressões "wine tours from Lisbon" e "Lisbon wine tour". Acrescentar uma pequena secção "Évora & Bacalhôa in one day?" com uma resposta honesta, usando apenas o que as experiências realmente incluem.
   - **Proposal / corporate retreats:** afinar a primeira frase de /proposal-in-portugal e de /corporate para "proposal in Portugal" e "corporate retreats Portugal".
4. **Velocidade (8 páginas com nota 59–67):** analisar /studio, /corporate, /day-trips-from-lisbon, /about, Sesimbra e Travel Designer no telemóvel. Corrigir só o que for seguro: imagens demasiado pesadas, fotos no topo sem prioridade de carregamento e partes que podem carregar mais tarde. O design, as animações aprovadas e o funcionamento do Studio não mudam.
5. **Links de spam:** atualizar a lista de rejeição de links de spam com os 21 domínios novos de casino, farmácia e similares indicados no relatório. Depois disso, é preciso enviar o ficheiro uma vez no Search Console (é um passo manual seu). Trustindex e opendi.pt continuam, porque são legítimos.

## Fora do âmbito
Preços, reservas, Stripe, factos das experiências, título e botões da página inicial, cores, animações aprovadas e dados das reservas. Os backlinks bons exigem trabalho fora do site.

## Detalhes técnicos
- `src/routes/proposals.tsx`: trocar por `beforeLoad` com `redirect({ to: "/proposal-in-portugal", statusCode: 301 })`. Registar esta regra em `AGENTS.md`, junto à regra de /studio-v3 e /multi-day.
- `src/routes/tours_.$tourId.tailor.tsx:145`: novo modelo de descrição, usando o nome curto da experiência.
- `src/routes/proposal-in-portugal.tsx:29`: descrição até 160 caracteres.
- As alterações de texto de Sesimbra e do guia de vinhos ficam em `local-stories-articles.ts` e no mapa de SEO das Signature. O conteúdo verificado das experiências não muda.
- `docs/seo/disavow-2026-09.txt`: acrescentar os domínios novos.
- Velocidade: medir com Lighthouse no telemóvel antes e depois, e aplicar só alterações de imagens e de carregamento.
- Adicionar testes para: /proposals devolve 301, todas as descrições têm até 170 caracteres, e o sitemap não muda. Correr as verificações de SEO e confirmar que o site compila. Não publicar sem pedido seu.

## Pedidos novos (28 Set)
6. **Aviso do Google "Tipo de objeto inválido para o campo brand":** duas fichas de produto dizem que a marca é a própria empresa (TravelAgency), e o Google só aceita um objeto "Brand" nesse campo. Vamos passar a usar `{ "@type": "Brand", "name": "YES Experiences Portugal" }`, igual ao que as outras fichas já usam (`src/lib/jsonld.ts`, linhas 790 e 845). Nenhum preço nem avaliação muda. O aviso desaparece quando o Google voltar a ler as páginas.
7. **Pesquisa pelo nome da marca mostra só a página inicial:** os sublinks do Google (sitelinks) são escolhidos automaticamente pelo Google e não se podem forçar. Crescem com o tempo e com o número de pesquisas pela marca. O que podemos fazer é dar sinais claros:
   - acrescentar à página inicial dados estruturados "WebSite", com o nome oficial e nomes alternativos ("YES Experiences", "YES Experiences Portugal", "yesexperiences"), e um menu principal ("SiteNavigationElement") com Experiences, Studio, Travel Designer, Proposals, Corporate, Local Stories e Contact;
   - confirmar que o menu e o rodapé usam nomes curtos e consistentes para essas páginas;
   - ver no Search Console se "yes experiences" já mostra outras páginas nossas nas posições 2 a 10 (hoje há 30 aparições na posição 1).
   Não mudamos o título nem os botões da página inicial.
