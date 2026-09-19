# Plano de correção integral: leitura, conversão, Tailor e SEO

## Resultado pretendido
O site fica legível e consistente em mobile, com movimento editorial premium, cartões que mostram motivos concretos para escolher cada experiência e um Tailor que começa sempre pela Signature completa e permite alterar — não apenas retirar.

## 1. Corrigir texto cortado e tipografia
- Corrigir o título de Contactos confirmado como cortado no topo e no fundo no iPhone, dando espaço real às ascendentes e descendentes da Fraunces sem reduzir o impacto visual.
- Aplicar a mesma proteção a todos os títulos animados por linhas, incluindo About, FAQ e páginas de experiências.
- Confirmar que Fraunces é usada apenas em títulos/ênfase editorial e Inter em texto, formulários, botões e informação prática.
- Rever campos nativos de data, textos longos, rodapé e ações flutuantes a 393 px para eliminar cortes, sobreposições e largura excedente.

## 2. Dar mais vida às páginas sem movimento barato
- Manter a geometria fixa: sem bounce, sobe-e-desce, parallax barato ou animações infinitas.
- Fazer frases-chave aparecerem por linhas, com revelação de “tinta” e cadência narrativa visível ao scroll.
- Dar a Five Ways, Homepage, Experiences e About sequências distintas: detalhe dourado, imagem, frase, prova e ação, em vez de tudo surgir para o mesmo lado.
- Tornar setas visíveis em repouso e executar um avanço horizontal único quando entram no ecrã; repetir apenas após toque/foco intencional.
- Garantir conteúdo imediatamente visível quando o movimento reduzido está ativo ou quando o JavaScript falha.

## 3. Tornar os cartões de tours mais convincentes
- Na Homepage, apresentar 2–3 highlights reais já existentes na fonte de cada tour; atualmente os dados são calculados mas não são mostrados no cartão.
- Em Experiences, transformar os highlights já existentes numa faixa editorial mais visível e legível, sem os cortar a uma única linha.
- Manter preço, duração, região, título, imagem, avaliação verificada e CTA numa hierarquia clara, sem inventar factos ou aumentar artificialmente avaliações.
- Usar “See dates & reserve” / “Reserve this day” e “Tailor this day” apenas nos contextos aprovados.

## 4. Corrigir o significado do Tailor
- A Signature completa continua selecionada por defeito, com todas as inclusões normais preservadas.
- Permitir que a experiência de vinhos desça de duas para uma adega quando o cliente quiser; o limite mínimo atual de duas está confirmado no `pickMin` e no controlo que bloqueia a redução.
- Tratar uma adega como alteração da composição, não como remoção automática de outros elementos nem como um desconto inventado.
- Adicionar adegas sem retirar automaticamente mercado, almoço, miradouros ou outras inclusões. Só bloquear uma combinação quando a capacidade real do dia falhar; nesse caso, explicar a razão e deixar a escolha da alteração ao cliente.
- Distinguir claramente no ecrã: “incluído”, “alterado”, “adicionado” e “retirado”. Remover linguagem que faz o Tailor parecer uma ferramenta de redução.
- Preservar a fórmula comercial existente: extras usam os suplementos aprovados; retiradas só recebem crédito quando a classificação autorizada o permite; pagamento volta a recalcular tudo no servidor.

## 5. Conversão, SEO e validação funcional
- Testar navegação, formulários, datas, composição do grupo, Tailor, Studio, reserva e passagem para Stripe sem efetuar uma cobrança real.
- Validar títulos, descrições, canonical, OG/Twitter e schema em todas as páginas públicas indexáveis e nas 12 experiências.
- Confirmar que o sitemap contém apenas URLs canónicas reais, incluindo as 12 experiências, Contactos e FAQ; Tailor continua fora do sitemap por ser uma etapa de personalização.
- Corrigir erros de hidratação, consola e qualquer fonte do aviso ResizeObserver ainda reproduzível.
- Validar a 393×852, tablet, 1280 px e com movimento reduzido; executar testes focados de Tailor, preço, checkout, metadata, schema e sitemap.
- Publicar a versão validada e voltar a submeter o sitemap no Google Search Console. Confirmar o conteúdo publicado; o texto final do snippet e as estrelas continuam sob decisão do Google e só usarão avaliações verificadas.

## Critérios de aceitação
- Nenhuma palavra ou título fica cortado a 393 px.
- Os highlights aparecem sem truncamento indevido nos cartões da Homepage e Experiences.
- É possível escolher uma única adega no Tailor de vinhos mantendo, por defeito, as restantes inclusões da Signature.
- Adicionar uma adega não remove nada automaticamente.
- Os totais visíveis coincidem com o valor recalculado no checkout.
- Não existem overflow horizontal, erros de hidratação, ações tapadas ou animações de bounce/loop.
- Todas as páginas indexáveis têm metadata própria, schema válido e presença correta no sitemap.
