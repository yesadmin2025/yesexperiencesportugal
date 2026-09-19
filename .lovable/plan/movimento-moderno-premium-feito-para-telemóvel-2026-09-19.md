# Movimento moderno, premium — feito para telemóvel

O problema real: quase todo o movimento atual depende do rato (levantar cartões, zoom de imagens, setas). No telemóvel não há rato, logo o site parece morto. E o herói só desloca a imagem uns pixels — lê-se como truque barato, não como cinema.

A correção muda a base: o movimento passa a ser conduzido pelo **scroll e pelo toque**, não pelo rato.

## 1. Herói cinematográfico (em vez de parallax barato)

Substituir o deslocamento de 18px por uma cena que se transforma enquanto se faz scroll:

- a imagem/filme aproxima-se lentamente (1.0 → 1.08) e escurece gradualmente à medida que a página avança;
- o título e o subtítulo sobem e desvanecem-se em ritmos diferentes (o título mais devagar do que o texto), criando profundidade real;
- os botões mantêm-se estáveis e sempre clicáveis — nunca se movem para fora do alcance do dedo.

Uma única cena contínua, ligada à posição do scroll, sem salto e sem repetição.

## 2. Frases que chegam como narrativa

Nas frases-chave (herói, transições de secção, títulos editoriais), o texto aparece **linha a linha**, de baixo para cima, com 90–140ms entre linhas. É o efeito de "storytelling" pedido: a frase constrói-se à frente dos olhos em vez de aparecer inteira. Aplicado com critério — uma frase por secção, nunca em parágrafos longos nem em formulários.

## 3. Movimento no telemóvel sem rato

Tudo o que hoje só acontece com o rato passa a ter equivalente móvel:

- **setas**: avanço contínuo e discreto, ligado à entrada do cartão no ecrã (e não ao hover);
- **cartões**: quando entram no ecrã, a imagem assenta de um zoom suave para o tamanho final;
- **toque**: resposta imediata ao premir (escala 0.98 + sombra), em todos os botões e cartões;
- **cartão em foco**: no telemóvel, o cartão que está no centro do ecrã ganha ligeiro destaque enquanto se percorre a lista.

## 4. Ritmo por secção

Cada secção tem uma ideia dominante — nunca duas. O herói é cinematográfico (700–1000ms). O conteúdo é editorial (300–580ms). Os toques são imediatos (140–200ms).

## 5. Zonas silenciosas (não mudam)

Pagamento, formulário de dados do cliente, Studio, Tailor, painel de administração e quem tem "menos movimento" ativado continuam praticamente estáticos. Nenhuma animação atrasa um clique de reserva.

## Validação

Gravação de scroll em telemóvel (393px) e computador (1280px) na página inicial, experiências, uma experiência, página de destino, artigo e sobre nós: confirmar que o movimento é percetível sem rato, sem cortes, sem erros, sem conteúdo escondido e com botões sempre acima de 44px. Validar que a fonte da tipografia é consistente em todo o site .Depois publicar e actualizar gsc 

## Detalhes técnicos

- Nova camada única `scroll-scene` em `src/lib/home-motion.ts`: um só loop rAF já existente passa a escrever variáveis CSS (`--scene-progress`, `--hero-zoom`, `--hero-dim`) e o CSS faz o resto — sem segundo controlador, sem bibliotecas novas.
- Storytelling de linhas: divisão por linhas no `CinematicHero` e nos títulos marcados, com `--line-index` a controlar o atraso; conteúdo sempre presente no HTML que o Google recebe (só a opacidade muda após hidratação), para não repetir o problema de discrepância já corrigido.
- Substituir as regras `@media (hover: hover)` exclusivas por pares hover + estado de entrada/`:active`, para paridade móvel.
- Manter os limites: `scripts/check-motion-budget.mjs`, testes de movimento, verificação de CSS e `check:route-meta` continuam a passar.

Fora do âmbito: preços, inventário, factos dos tours, regras de cancelamento, lógica de pagamento, base de dados, arquitetura de rotas, estratégia de palavras-chave. Sem redesenho de marca — mesmas cores, tipos de letra e textos.