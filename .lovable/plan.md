# Tipografia e movimento premium — correção integral

## Objetivo

Uniformizar a tipografia Fraunces + Inter em todas as páginas públicas e tornar o site visivelmente vivo no telemóvel, sem bounce, movimentos repetitivos ou efeitos que prejudiquem leitura e conversão.

## Diagnóstico confirmado

- O bloco “700+ five-star reviews” usa o título correto, mas está fora da sequência de entrada aplicada às restantes secções.
- Os cartões de avaliações da homepage surgem depois do carregamento e não têm uma coreografia editorial própria.
- O Hero tem várias gerações de regras de animação sobre os mesmos elementos; algumas anulam explicitamente outras, tornando o resultado inconsistente ou impercetível.
- Os Five Ways já têm uma estrutura de entrada, mas o movimento atual limita-se sobretudo à opacidade e quase não conta uma história no mobile.
- A página completa de Reviews mistura escala e peso locais com os componentes tipográficos partilhados.
- As fotografias serão usadas nas avaliações e páginas editoriais quando acrescentarem emoção ou contexto. Os Five Ways permanecem tipográficos, sem fotografias.

## Implementação

### 1. Uma única tipografia pública

- Fixar Fraunces como voz editorial para títulos, números expressivos, citações selecionadas e ênfase itálica.
- Fixar Inter para texto, etiquetas, navegação, controlos, cartões e ações.
- Substituir tamanhos e pesos locais que entram em conflito com a escala partilhada.
- Corrigir especificamente o bloco “700+”, a página Reviews, Five Ways e os títulos das páginas editoriais.
- Preservar espaço interno suficiente para itálicos, acentos e descendentes nunca ficarem cortados.

### 2. Reconstruir o Hero como uma sequência cinematográfica

- Remover regras antigas concorrentes e deixar um único contrato de movimento.
- Manter o vídeo atual e o segundo texto aprovado.
- Fazer a imagem ganhar vida com um enquadramento muito lento e contido.
- Revelar as duas frases por máscara editorial, depois o texto de apoio e finalmente as ações.
- Fazer a seta da ação principal desenhar-se quando aparece, inclusive no telemóvel.
- Garantir conteúdo visível se o vídeo, JavaScript ou animação falharem.

### 3. Dar narrativa ao bloco “700+ reviews”

- Entrada em sequência: estrelas, “700+”, frase em itálico e depois avaliações reais.
- Dar às citações um tratamento editorial Fraunces coerente, sem parecer um cartão genérico.
- Animar cada avaliação apenas quando entra no ecrã; no mobile, o próximo cartão permanece parcialmente visível para convidar ao gesto.
- Usar uma fotografia editorial real e aprovada como atmosfera do bloco, sem competir com as palavras nem sugerir uma experiência específica.
- Manter números, fontes e proveniência reais; nenhuma alteração aos dados ou schema das avaliações.

### 4. Five Ways com movimento, sem fotografias

- Manter a composição tipográfica e a ordem atual.
- Aplicar uma sequência clara por cartão: número, ícone/eyebrow, título, texto e ação.
- Fazer a ênfase itálica revelar-se como frase escrita, sem efeito de máquina de escrever.
- Animar a seta quando cada cartão entra no ecrã, não no carregamento da página.
- Evitar que todos os cartões se movam na mesma direção; variar máscara e ritmo sem deslocar a geometria.

### 5. Páginas editoriais e Reviews

- Aplicar a mesma gramática a About, Experiences, Travel Designer, Moments, Corporate, Local Stories, destinos e Reviews.
- Usar fotografias editoriais reais já aprovadas onde criem contexto e desejo, com uma imagem dominante por capítulo e sem repetição visível.
- Construir cada secção com uma única ideia de movimento: título escrito, fotografia revelada ou conteúdo em cadência — nunca todos ao mesmo tempo.
- Manter checkout, reservas, Studio, Tailor e administração rápidos e discretos.

## Regras de qualidade

- Mobile primeiro em 393 px; movimento percebido durante scroll real, não apenas numa captura parada.
- Sem bounce, flutuação, loops decorativos, parallax agressivo, gradientes novos ou excesso de dourado.
- Conteúdo visível por defeito; `prefers-reduced-motion` mostra tudo imediatamente.
- Nenhuma mudança em preços, disponibilidade, tours, reservas, pagamentos, base de dados, rotas, SEO, schema ou sitemap.
- Não publicar antes da comparação visual.

## Validação

- Gravar passagens reais de scroll no Hero, “700+ reviews”, Five Ways, Reviews, About e Experiences a 393×596 e 393×852.
- Repetir a 768×1024 e 1280×800.
- Verificar Fraunces/Inter carregadas, pesos corretos, ausência de texto cortado, overflow e sobreposição.
- Verificar que animações começam quando os elementos entram no ecrã e ficam concluídas depois.
- Testar redução de movimento, zoom de texto a 200%, carregamento lento de fontes e imagens e falha do vídeo.
- Apresentar capturas comparativas para aprovação antes de publicar.
