# Movimento premium sem bounce — correção completa

## Diagnóstico confirmado

O sistema atual usa demasiado movimento vertical: secções entram de baixo, frases sobem linha a linha, o cartão no centro do telemóvel levanta-se, o texto do herói sobe a velocidades diferentes e as setas avançam e regressam duas vezes. Mesmo sem uma animação chamada “bounce”, o resultado visual parece saltitante e pouco premium.

## Nova direção

O movimento passa a ser **contínuo, discreto e direcional**. Nada sobe e desce, nada oscila e nada chama atenção repetidamente. O site ganha vida através de revelação, profundidade, ritmo e continuidade enquanto se percorre a página.

### 1. Remover todo o efeito saltitante

- Eliminar a subida vertical das secções, cartões, títulos e mudanças de página.
- Remover o levantamento automático do cartão que fica no centro do ecrã no telemóvel.
- Remover a deslocação vertical separada do título e apoio no herói.
- Remover setas que vão e voltam, pulsações e qualquer repetição contínua.
- Manter pagamento, formulários, Studio, Tailor e painel sem movimento ornamental.

### 2. Entradas editoriais, não “fade-up”

- Texto: aparecer por **máscara horizontal suave**, como uma linha editorial revelada da esquerda para a direita, sem mudar de posição.
- Imagens: revelar o enquadramento através de um corte suave e um assentamento mínimo de escala, sem deslocação vertical.
- Cartões: transição de opacidade e contraste, em sequência curta, mantendo sempre a posição fixa.
- Cada secção terá uma única ideia de movimento; sem acumular máscara, escala e deslocação no mesmo elemento.

### 3. Herói cinematográfico, sem falso parallax

- Retirar o atual efeito de camadas a subir.
- Usar o próprio filme como movimento principal.
- Durante o scroll, aplicar uma evolução contínua de enquadramento e luz, sem mover a imagem alguns píxeis para simular profundidade.
- A frase principal revela-se de forma editorial; texto e botões permanecem estáveis e legíveis.

### 4. Movimento realmente visível no telemóvel

- A seta avança **uma única vez** quando a ação entra no ecrã e fica na posição final; não regressa nem repete.
- Ao tocar, botões e cartões respondem imediatamente com uma compressão mínima e mudança de contraste, sem saltar.
- As sequências são ativadas pelo scroll, não pelo hover, para que a experiência móvel seja a principal.
- No computador, o hover acrescenta apenas uma mudança controlada de imagem, sombra e seta — sem levantar cartões.
- Ctas com movimento premmium também. Não é preciso passar o rato para os itens se mexerem. Tem de comunicar , de forma moderna mas premmium 

### 5. Transições entre páginas

- Substituir a atual entrada vertical por uma transição curta de opacidade com uma revelação limpa do conteúdo.
- Nenhuma transição atrasará a navegação ou o botão de reserva.

### 6. Ritmo e acessibilidade

- Toque e hover: 140–200ms.
- Conteúdo editorial: 380–520ms.
- Herói: 700–900ms apenas na primeira composição.
- Tudo acontece uma vez por entrada no ecrã; sem loops decorativos.
- “Menos movimento” mantém todo o conteúdo imediatamente visível e estável.

## Validação

- Rever página inicial, experiências, páginas de experiência, destinos, artigos e Sobre em 393px e 1280px.
- Gravar a sequência de scroll no telemóvel para avaliar o movimento real, não apenas estados finais.
- Confirmar: zero movimento vertical repetido, zero oscilação, zero conteúdo cortado, zero overflow e zero erros de hidratação.
- Confirmar que todas as ações continuam com pelo menos 44px e que reserva e pagamento permanecem imediatos.

## Fora de âmbito

Não serão alterados textos, preços, inventário, experiências, regras de reserva, pagamentos, SEO, estrutura de páginas ou identidade visual.