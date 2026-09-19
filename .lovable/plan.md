# YES “The Best” — evolução visual e conversão

## Objetivo
Elevar a jornada pública principal a uma experiência digital mais moderna, impactante e memorável, sem transformar o site numa montra de efeitos. A nova assinatura visual será **“a rota desenhada”**: mapas, linhas, imagens e texto contam Portugal como uma viagem contínua, enquanto comparação, reserva e pagamento permanecem imediatos e silenciosos.

O trabalho abrange: Homepage, Experiences, páginas Signature, Tailor, Studio, About, Travel Designer, Moments/Proposals, Corporate, Contact, Reviews e os pontos de reserva/checkout associados.

## 1. Sistema visual único
- Consolidar a escala tipográfica já iniciada: Fraunces para títulos, Inter para leitura e interface, mínimo de 11px, títulos fluidos sem cortes e medidas de texto confortáveis.
- Usar apenas a paleta YES existente, com marfim e carvão como base, teal para orientação e gold apenas em linhas, progressos e detalhes decisivos.
- Criar uma gramática gráfica reutilizável com três níveis:
  - **Macro:** mapas e rotas reais que respondem ao toque.
  - **Médio:** linhas editoriais que desenham a passagem entre capítulos.
  - **Micro:** setas, focos, seleção e confirmação com resposta curta e precisa.
- Reutilizar os componentes existentes de títulos, CTAs, cenas, máscaras, mapas e linhas de rota; não criar uma segunda linguagem visual.

## 2. Homepage — uma história contínua
- Manter a abertura cinematográfica e ligar visualmente as secções seguintes através de uma rota dourada discreta.
- Fazer os caminhos de compra surgirem como capítulos de uma mesma narrativa, em vez de cartões independentes.
- Evoluir o mapa de Portugal para uma exploração tátil: tocar numa região destaca a localização e revela a experiência associada, usando apenas dados reais.
- Tornar avaliações e confiança mais visuais e exploráveis, sem carrosséis automáticos nem números inventados.
- Manter uma hierarquia inequívoca: Studio, Signature Experiences e Travel Designer como os três caminhos principais.

## 3. Experiences — comparar e desejar rapidamente
- Remover da página Signature a frase factual atualmente apresentada como **“stops, in this order”**; manter os locais e a duração, sem prometer uma sequência fixa.
- Transformar a coleção numa grelha editorial comparável: região, ritmo, duração, preço, destaques e “ideal para” legíveis num olhar.
- Introduzir uma interação de comparação leve no telemóvel: selecionar duas ou três experiências e ver apenas diferenças úteis, sem tabela densa e sem alterar preços ou factos.
- Fazer cada cartão contar uma pequena história ao entrar: imagem, linha regional, título, destaques e CTA em sequência curta; uma só vez, sem subir/descer ou saltar.
- Dar às imagens e CTAs uma linha dourada desenhada no foco/toque, com movimento visível também no telemóvel.

## 4. Signature — da inspiração à reserva
- Dar maior protagonismo ao mapa real e à rota logo após a abertura, conectando os locais reais ao itinerário.
- Ao tocar num ponto do mapa, destacar o capítulo correspondente; ao avançar no conteúdo, atualizar o ponto ativo sem forçar scroll nem alterar a ordem dos dados.
- Apresentar destaques, inclusões, avaliações e garantias como evidência visual, não como blocos repetidos.
- Simplificar o cartão de reserva para uma sequência clara: data → viajantes → preferências essenciais → total → reservar.
- Manter sempre visíveis a data escrita por extenso, número de viajantes, experiência, total, cancelamento e confirmação; eliminar molduras dentro de molduras e qualquer sobreposição do WhatsApp.

## 5. Tailor e Studio — o dia ganha forma em direto
- No Tailor, redesenhar a rota suavemente quando a pessoa ajusta duração ou quantidade de uma experiência, usando apenas paragens válidas da própria Signature.
- Mostrar o efeito da escolha no dia e no preço com transição numérica curta, sem esconder alterações nem atrasar a ação.
- No Studio, reforçar o Living Atlas como centro visual e ligar escolhas, mapa, storyboard e resumo através da mesma linha de rota.
- Manter estes fluxos funcionais e progressivamente mais silenciosos à medida que se aproximam da reserva.
- Não alterar composição, preços, limites operacionais reais, disponibilidade, checkout ou regras de negócio.

## 6. About, Travel Designer, Moments e Corporate
- **About:** converter os blocos longos numa narrativa editorial por capítulos, com retrato, marcos e provas a revelarem-se horizontalmente; preservar a leitura completa sem esconder texto.
- **Travel Designer:** fazer o “travel file” abrir visualmente como um dossier editorial e usar um mapa de jornada para explicar o serviço sem acrescentar etapas ao formulário.
- **Moments/Proposals:** usar uma progressão visual íntima — lugar, momento, cuidado e contacto — com fotografia real e movimento contido.
- **Corporate:** aplicar gráficos informativos só a factos existentes e um movimento mais sóbrio, adequado à decisão profissional.
- Em todas estas páginas, cada secção terá apenas uma ideia dominante e uma única ação principal.

## 7. Contact, Reviews e confiança
- Manter o formulário de contacto disponível no primeiro instante; animar apenas título e elementos de contexto, nunca os campos.
- Tornar Reviews uma superfície de prova: filtros claros, distribuição visual e citações completas, apenas com dados verificados.
- Unificar licenciamento, cancelamento, pagamento seguro e contacto como uma faixa de confiança consistente perto das decisões, sem repetir blocos em excesso.

## 8. Movimento premium e desempenho
- Aplicar as três velocidades da marca: 140–200ms para toque/foco; 300–450ms para conteúdo; 700–1000ms apenas na abertura e grandes mudanças de capítulo.
- Proibir bounce, oscilação, movimento vertical repetitivo, parallax forte, shimmer, blobs, autoplay e animação ornamental no checkout.
- Fazer frases entrarem como escrita editorial por máscara horizontal/linha, não letra a letra lenta; o conteúdo permanece legível e selecionável.
- Todas as animações executam uma vez, respeitam `prefers-reduced-motion` e mostram o estado final imediatamente quando o movimento está reduzido.
- Usar SVG e mapas existentes, sem nova biblioteca pesada, e pausar qualquer movimento fora do ecrã.

## 9. Reserva sem fricção
- Não aplicar revelações de scroll, mapas em movimento ou atrasos dentro do pagamento.
- Reservar animação para foco, validação, atualização de preço, carregamento e confirmação — sempre com resposta imediata.
- Verificar teclado móvel, datas, targets de 44px, mensagens de erro junto do campo, persistência dos dados e prevenção de duplo clique.
- Manter a linguagem de CTA aprovada: “Design your day”, “Explore Signature Experiences”, “Reserve this day”, “Tailor this day” e “Design my journey”.

## 10. Implementação por fases
1. **Fundação:** tipografia, ritmo, linha de rota, estados de CTA, movimento reduzido e correção da origem real do aviso `ResizeObserver` ainda observado no preview.
2. **Conversão principal:** Experiences, Signature e cartões de reserva; remoção de “stops, in this order”.
3. **Criação:** Tailor e Studio com mapa/rota reativos, sem tocar na lógica comercial.
4. **Marca:** Homepage, About, Travel Designer, Moments/Proposals e Corporate.
5. **Confiança:** Reviews, Contact e estados finais de checkout/confirmação.
6. **Polimento:** coerência EN/PT nas superfícies partilhadas e validação final.

## 11. Validação e critérios de aprovação
- Testar cada página em 393×852, tablet e desktop, incluindo toque real, teclado, foco e reduced motion.
- Confirmar: zero texto cortado, zero overflow, zero sobreposição, mínimo 11px, alvos mínimos 44px e CTA principal sempre alcançável.
- Medir fluidez sem bloquear a página: sem loops de observação, sem saltos de layout e sem animações contínuas fora do ecrã.
- Percorrer as jornadas completas: descobrir → comparar → abrir Signature → Tailor/Studio → escolher data e viajantes → checkout → confirmação.
- Preservar integralmente preços, inventário, factos dos tours, regras de cancelamento, rotas, SEO, schemas, atribuição, pagamentos e base de dados.
- Publicar apenas depois da validação completa e confirmar novamente a versão pública.
