# Recuperar a tipografia histórica Montserrat + Georgia + Inter

## Objetivo

Repor a identidade tipográfica que existia na versão histórica do site, sem novas aproximações:

- **Montserrat** — títulos principais, nomes de secções e títulos dos cartões;
- **Georgia itálica** — apenas nas frases ou palavras editoriais de destaque;
- **Inter** — texto corrido, navegação, botões, etiquetas, formulários, preços e restante informação funcional.

A referência será a implementação guardada no histórico do projeto, não Fraunces nem Newsreader.

## Diagnóstico confirmado

- A versão histórica de 30 de abril definia `Montserrat` como fonte de display.
- A pilha serifada começava por `Georgia`; por isso, era Georgia que aparecia visualmente, mesmo tendo Cormorant e Newsreader como alternativas posteriores.
- Inter já era a fonte funcional do site.
- O estado atual usa Fraunces nos títulos e itálicos, o que explica a diferença visível na forma, espessura e ocupação do espaço.

## Trabalho a realizar

### 1. Repor as três funções tipográficas

- Carregar Montserrat nos pesos realmente utilizados.
- Aplicar Montserrat aos níveis Display, H1, H2 e H3.
- Aplicar Georgia itálica somente aos destaques editoriais intencionais dentro dos títulos.
- Manter Inter em corpo, interface, ações e dados.
- Retirar Fraunces das superfícies públicas e impedir misturas acidentais entre páginas.

### 2. Recuperar peso, escala e ritmo

- Usar como ponto de partida os pesos históricos: Montserrat 500–700 para hierarquia editorial, Inter 400–600 para leitura e interface, Georgia 400 itálico para contraste.
- Afinar a escala partilhada em mobile primeiro, preservando a proporção visual das capturas de referência.
- Recalibrar entrelinha e espaços entre eyebrow, título, texto e ação, porque Montserrat ocupa o espaço de forma diferente de Fraunces.
- Evitar alturas fixas, máscaras e cortes em títulos ou itálicos.

### 3. Aplicar página a página

- Homepage: Hero, Five Ways, Studio, Signature, Travel Designer, Moments, Corporate e fecho.
- Experiences e os 12 Signature Experiences.
- About, Reviews, Travel Designer, Corporate, Moments, destinos e páginas editoriais.
- Studio e Tailor: identidade editorial nos momentos de inspiração; Inter nas escolhas e fases transacionais.
- Checkout, formulários e administração permanecem funcionais em Inter.

### 4. Validar visualmente antes de publicar

- Rever Hero, Five Ways e páginas editoriais em 393×596, 393×852, 768×1024 e 1280×800.
- Testar texto a 200%, carregamento lento das fontes e movimento reduzido.
- Confirmar zero títulos cortados, colisões ou deslocamento horizontal.
- Comparar as capturas com a versão histórica Montserrat + Georgia, incluindo peso, largura, quebras e espaçamento — não apenas verificar o nome da fonte.
- Apresentar capturas mobile para aprovação; publicar somente depois dessa aprovação.

## Proteções

Não alterar copy aprovada, fotografias, animações fora do necessário para acomodar métricas tipográficas, preços, disponibilidade, itinerários, Studio/Tailor, reservas, pagamentos, base de dados, administração, SEO, schemas, sitemap, URLs ou lógica de negócio.

## Nota técnica

A antiga declaração incluía Cormorant e Newsreader depois de Georgia, mas o navegador usava Georgia por ela estar disponível primeiro. Para reproduzir o aspeto real sem carregar fontes invisíveis, a nova implementação usará diretamente Montserrat, Georgia e Inter.
