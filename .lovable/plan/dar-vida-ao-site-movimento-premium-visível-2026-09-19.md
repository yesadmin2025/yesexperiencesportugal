# Dar vida ao site — movimento premium, visível

Verifiquei a página inicial no preview: o movimento está lá, mas está quase invisível. Três causas reais, medidas agora:

- A página inicial tem 55 blocos com entrada suave, mas o deslocamento é de apenas 14px e o efeito começa a meio da rolagem — o olho não o registra.
- A camada de movimento editorial (títulos, eyebrows, parágrafos, setas) está inerte: zero elementos marcados, porque todos são ignorados por já estarem dentro de um bloco de entrada.
- A imagem do herói está completamente parada (o zoom e o parallax foram desligados numa passagem anterior) e os cartões da página inicial não têm camada de elevação, ou seja, não reagem ao rato.

O objetivo: o site respira e responde, sem nunca parecer um site com efeitos a mais.

## O que vai mudar

### 1. Herói com vida (cinematográfico)
- A imagem do herói volta a ter um movimento lento e contínuo, muito contido: uma aproximação quase imperceptível e um ligeiro deslocamento ao rolar (parallax), com limite de 18px no telemóvel e 28px no computador.
- O texto e os botões continuam a entrar em sequência, como hoje.

### 2. Entradas que se veem
- O deslocamento das secções sobe de 14px para 22px (18px no telemóvel) e o tempo passa a 520–600ms, com uma curva suave.
- Cartões e listas entram em cascata (um a seguir ao outro, 90–120ms de diferença), não todos ao mesmo tempo.
- As imagens entram com uma aproximação mínima (1.03 → 1.0), sem desfoque.
- Uma só ideia de movimento por secção — nunca vários efeitos empilhados.

### 3. Reação ao toque e ao rato (hover)
- Cartões de experiências, dias e artigos: elevação de 4px, sombra suave, imagem que aproxima ligeiramente e seta que avança 7px. Resposta em 160–200ms.
- Botão principal: brilho dourado a atravessar suavemente ao passar o rato, já aprovado para a página inicial.
- No telemóvel: estado de pressão imediato (sem ressalto), porque não existe hover.

### 4. Transições entre páginas
- Ao mudar de página, o conteúdo entra com um fade curto (300ms) em vez de aparecer de golpe. Aplica-se às páginas públicas.

### 5. Arranque imediato
- Hoje o movimento só arranca depois de a página estar totalmente estável, o que pode levar até 2,5 segundos — por isso os primeiros ecrãs aparecem já parados. Passa a arrancar imediatamente após a página ficar interativa, mantendo a proteção que evitava o desalinhamento que o Google lia.

### 6. Onde o movimento continua silencioso
- Pagamento, formulários de dados do cliente, Studio, personalização, painel de administração e quem tem "menos movimento" ativado no telefone: tudo praticamente estático, como está. Nada atrasa um clique de reserva.

## Fora deste trabalho
Preços, inventário, factos dos tours, regras de cancelamento, lógica de pagamento, base de dados, arquitetura de endereços e estratégia de palavras-chave ficam intactos. Não há redesenho da marca: mesmas cores, mesmas letras, mesmos textos.

## Validação antes de publicar
- Telemóvel (393px) e computador (1280px) nas páginas principais: início, experiências, cada experiência, dias, artigos, sobre.
- Confirmar: sem conteúdo cortado, sem transbordo lateral, sem erros, sem desalinhamento na versão que o Google lê, botões sempre com 44px ou mais.
- Gravar vídeos curtos da rolagem para confirmar visualmente que o movimento é perceptível.

## Detalhes técnicos
- Base única mantida: `.reveal` / `.reveal-stagger` + `[data-motion]` / `.motion-in`. Sem segundo sistema de animação.
- `src/styles.css`: subir travel/duração nas regras `html.reveal-ready .reveal(-stagger)` e no bloco `.home-energy`; reativar `heroZoom`/`heroDrift` como keyframes reais dentro do escopo `.home-energy`; adicionar `.lift-layer` aos cartões da página inicial/experiências; escalonamento por `--motion-delay`.
- `src/lib/home-motion.ts`: parallax do herói com `requestAnimationFrame` e limite (±18/28px), escalonamento de cartões mesmo quando já existe `.reveal`; manter a regra de nunca animar um elemento com dois controladores.
- `src/hooks/use-marketing-motion.ts`: arrancar no primeiro frame após hidratação; a janela sem mutações passa a aplicar-se só à marcação automática.
- Transição de rota: fade em `SiteLayout` por mudança de `pathname`, 300ms, `prefers-reduced-motion` respeitado.
- Guardas mantidas: `scripts/check-motion-budget.mjs`, testes de movimento, verificação de CSS e `check:route-meta`.
