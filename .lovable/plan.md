# Correção completa — movimento premium e conversão mobile

## Objetivo
Corrigir o que ficou errado, não apenas “aumentar” as animações. A homepage deve ter ritmo, direção e variedade; os CTAs das experiências devem ser imediatamente legíveis; e as setas têm de comunicar avanço no telemóvel sem depender de hover, bounce ou movimento contínuo.

## O que está errado agora
- A mesma máscara horizontal da esquerda para a direita foi aplicada a títulos, cartões e imagens, tornando toda a homepage repetitiva.
- As setas dos CTAs fazem uma passagem curta quando entram no ecrã; muitas vezes termina antes de o olhar chegar ao botão.
- Os CTAs `hairline` usados nos cartões das experiências têm uma seta pequena e uma linha que depende sobretudo de hover.
- Os cartões Signature entram como um bloco único; imagem, texto e ação não criam uma sequência narrativa clara.
- Existem várias regras de movimento antigas e concorrentes, o que torna o resultado inconsistente entre homepage, experiências e páginas editoriais.
- Na reserva mobile, a data, os contornos aninhados e o bloco de composição ainda criam ruído e largura visual excessiva.

## Correções

### 1. Uma gramática diferente por tipo de conteúdo
- **Títulos e frases-chave:** revelação linha a linha, por opacidade e recorte vertical curto; sem deslocar o texto e sem repetir a abertura lateral em todas as secções.
- **Imagens:** abertura cinematográfica alternada conforme a composição — centro, esquerda ou direita — seguida de uma aproximação mínima para assentar.
- **Cartões:** entrada por contraste, borda e imagem; o cartão não desliza nem salta.
- **Regras douradas e pequenos detalhes:** desenham-se uma vez para orientar a leitura.
- Cada secção terá uma só ideia dominante e direções alternadas para evitar que toda a página “vá para um lado”.

### 2. Setas e CTAs realmente visíveis no telemóvel
- Tornar a seta canónica maior, com haste mais longa e contraste dourado suficiente.
- Quando o CTA entra no ecrã, a haste desenha-se primeiro e a ponta avança depois; a sequência dura o suficiente para ser percebida.
- No mobile, repetir uma única chamada curta quando o CTA se aproxima do centro do ecrã, sem loop, sem pulsar e sem regressar para trás.
- Ao toque, resposta imediata por pressão e alteração de borda/superfície; nada depende de hover.
- Aplicar o mesmo comportamento a “See dates & reserve”, “Explore Signature Experiences”, cartões dos cinco caminhos e restantes ações públicas.

### 3. Cartões Signature com sequência de conversão
- Revelar imagem, prova/preço, título e CTA numa sequência curta e legível.
- Manter o cartão estável; o movimento acontece dentro da imagem, da regra e da seta.
- Garantir que “See dates & reserve” tem presença visual de ação e não parece apenas texto secundário.
- Preservar preços, ratings verificados, títulos, rotas e lógica de reserva.

### 4. Homepage com ritmo editorial variado
- Hero continua film-led e sem parallax barato.
- “Five ways” usa cartões com detalhes que acendem em sequência e setas orientadoras.
- Studio usa narrativa em capítulos: eyebrow → frase → prova 01/02/03 → CTA.
- Signature usa imagem → informação → ação.
- Proposals, Corporate, reviews, mapa, stories e FAQ recebem transições próprias, discretas e coerentes, sem copiar a mesma máscara.
- Remover ou neutralizar regras antigas que competem com o sistema final.

### 5. Reserva mobile do exemplo
- Conter o campo de data integralmente dentro da largura disponível, incluindo o controlo nativo do iPhone.
- Remover o efeito de “caixa dentro de caixa” no bloco de viajantes.
- Simplificar separadores, reduzir tracking excessivo e reforçar a hierarquia entre adultos, crianças e preços por idade.
- Manter alvos de toque de 44px, regras de idade, preços e checkout intactos.
- Garantir que “Moments” começa com espaçamento claro e não parece colado à caixa anterior.

## Limites
- Sem bounce, oscilação, subida/descida repetida, parallax barato ou animações infinitas.
- Sem alterar preços, inventário, factos, avaliações, Stripe, regras de disponibilidade, rotas, SEO ou base de dados.
- `prefers-reduced-motion` continua totalmente respeitado.

## Validação
- Gravar e rever scroll real em 393×852 na homepage e numa experiência, não apenas inspecionar classes.
- Validar também 1280px e modo de movimento reduzido.
- Confirmar: setas perceptíveis sem rato, direções variadas, frases legíveis, data sem overflow, sem hidratação divergente, sem conteúdo oculto e sem erros de consola.
- Executar testes focados de movimento, CTA, formulário mobile, metadados e sitemap antes de concluir.
