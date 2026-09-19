# Plano — Cinco caminhos com fotografia e mapa coerentes

## Objetivo
Dar a cada uma das cinco formas de começar uma identidade visual própria, usando apenas fotografias reais já enviadas, e repetir deliberadamente essa mesma fotografia no contexto correspondente do mapa da homepage.

## Implementação

1. **Curadoria final das cinco fotografias**
   - Rever visualmente as fotografias reais já existentes e escolher uma imagem inequívoca para cada caminho: Studio, Signature Experiences, Travel Designer, Moments e Corporate.
   - Manter cinco imagens diferentes entre si e evitar imagens que já apareçam noutra secção da mesma homepage.
   - Priorizar fotografias onde o lugar e a natureza da experiência sejam reconhecíveis, sem recorrer a stock ou imagens geradas.

2. **Cartões “Five ways into Portugal”**
   - Aplicar uma fotografia exclusiva a cada cartão, com enquadramento próprio para mobile, tablet e desktop.
   - Acrescentar uma identificação geográfica curta e factual sobre a imagem, por exemplo `Lisbon → Azeitão`, apenas quando essa rota estiver confirmada pelos dados atuais.
   - Quando não existir uma rota única — como no Travel Designer — usar um destino/contexto verdadeiro e não apresentar uma rota fictícia.
   - Preservar os cinco destinos digitais e ações atuais: Studio, Experiences, Multi-day, Proposals e Corporate.

3. **Correspondência no mapa da homepage**
   - Manter o mapa atual de Portugal e os seus destinos reais.
   - Associar cada caminho ao destino fotografado: Studio/Azeitão, Signature/Arrábida, Travel Designer/Alentejo, Moments/Tróia e Corporate/Azeitão.
   - Ao abrir o contexto desse caminho no mapa, mostrar exatamente a mesma fotografia usada no respetivo cartão, com destino e rota factual visíveis.
   - Nos dois caminhos ligados a Azeitão, distinguir claramente o contexto visual e comercial para não parecer conteúdo repetido.
   - Manter as ligações existentes para tours, histórias locais e contacto; não alterar produtos, preços, disponibilidade ou reservas.

4. **Sistema visual e movimento**
   - Usar a fotografia como elemento dominante e reduzir elementos decorativos concorrentes.
   - Fazer a transição entre caminhos no mapa com uma troca suave de imagem e texto, sem bounce, parallax, loops ou atrasos na interação.
   - Garantir estado final imediato com movimento reduzido e conteúdo visível no carregamento.

5. **Proteção contra novas repetições**
   - Centralizar a relação caminho → fotografia → destino para os cartões e o mapa consumirem a mesma fonte.
   - Reforçar os testes para confirmar cinco fotografias únicas, correspondência exata entre cartão e mapa e textos alternativos completos.

6. **Validação**
   - Verificar a homepage em 393 px, 768 px e 1280 px: enquadramento, leitura do destino, ausência de cortes e ausência de sobreposição.
   - Testar todos os cinco cartões, as seleções do mapa, os respetivos links, teclado e movimento reduzido.
   - Investigar e eliminar o aviso atual de redimensionamento durante esta validação, sem alterar o comportamento do mapa.
   - Confirmar que não houve alterações a SEO, rotas, preços, inventário, Stripe, dados dos tours ou regras de reserva.

## Resultado esperado
Uma homepage em que cada caminho é reconhecido instantaneamente por uma fotografia real própria, e em que o mapa reforça a mesma história visual com destino e percurso claros, sem repetição acidental.
