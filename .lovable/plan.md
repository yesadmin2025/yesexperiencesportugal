# Animações em todo o site público

## Objetivo
Dar movimento consistente a todas as páginas públicas, sem atrasar decisões, formulários ou pagamento.

## Prioridade por impacto
1. **Conteúdo e conversão** — aplicar entradas suaves, uma única vez, a títulos, texto de apoio, imagens, cartões e grupos de ação em todas as páginas públicas.
2. **Botões e setas** — manter resposta imediata ao toque, elevação discreta no computador e movimento direcional curto; nunca pulsar ou saltar continuamente.
3. **Transição entre páginas** — manter uma passagem curta e subtil para a navegação parecer contínua, sem ecrãs de espera.
4. **Hero e experiências** — preservar a abertura cinematográfica atual; não acrescentar efeitos concorrentes.
5. **Checkout e ferramentas** — manter checkout, Studio, Tailor, administração e autenticação rápidos e silenciosos.

## Implementação
- Reforçar o controlador central já existente para reconhecer automaticamente o conteúdo editorial e os cartões que ainda não têm animação.
- Usar apenas opacidade e pequeno movimento vertical no conteúdo comum.
- Manter os tempos aprovados: 140–200 ms para toque, 300–450 ms para conteúdo e 700–1000 ms apenas no Hero e raros momentos cinematográficos.
- Garantir que o conteúdo aparece imediatamente quando a pessoa escolhe “reduzir movimento”, quando o JavaScript falha ou quando uma página abre por ligação interna.
- Remover qualquer movimento contínuo fora do Hero que concorra com os botões de reserva.

## Validação
- Testar início, Experiências, uma experiência Signature, uma História Local, Travel Designer, Sobre e Contacto em 393 px e 1280 px.
- Confirmar animações visíveis uma vez, botões imediatos, ausência de conteúdo escondido, sobreposição ou deslocação horizontal.
- Executar as verificações de movimento, acessibilidade de movimento reduzido e regressão visual.
- Não alterar textos, preços, disponibilidade, Stripe, reservas, SEO ou rotas.
