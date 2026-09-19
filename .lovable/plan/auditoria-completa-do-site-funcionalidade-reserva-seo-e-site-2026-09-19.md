# Auditoria completa do site — funcionalidade, reserva, SEO e sitemap

Objetivo: percorrer o site como um cliente real, confirmar que tudo o que é clicável funciona, que o pagamento chega ao fim sem obstáculos, e que o SEO e o sitemap estão no melhor estado possível. Sem alterar preços, experiências, regras de cancelamento, lógica de pagamento nem a estrutura de endereços.

## 1. Auditoria de navegação e botões

Percorrer todas as páginas públicas em telemóvel (393px) e computador (1280px) e verificar:

- Todos os links e botões levam a uma página que existe e responde (nenhum destino em branco ou erro).
- Menu, rodapé, cartões de experiências, artigos e páginas de destino.
- Nenhum botão escondido, cortado, sobreposto ou demasiado pequeno para o dedo.
- Nenhum erro técnico na consola em qualquer página.
- Nenhuma página com conteúdo a sair da largura do ecrã.

Entrega: lista do que está bem e lista do que precisa de correção, por página.

## 2. Auditoria do fluxo de reserva e pagamento

Simular o percurso completo de um cliente em telemóvel e computador:

- Página da experiência → "Reserve this day" → escolher data → dados do cliente → recolha → resumo → pagamento.
- Confirmar que datas impossíveis são recusadas com mensagem clara, no campo e no topo do formulário.
- Confirmar que o resumo antes de pagar mostra data, pessoas, total e recolha.
- Confirmar que o botão de pagamento abre uma sessão de pagamento real e que o valor coincide com o preço anunciado.
- Confirmar que a página de confirmação pós-pagamento funciona e que o email automático continua a ser enviado.
- Repetir no percurso Tailor e no Studio.

Nota: a validação chega até à abertura do pagamento. Uma cobrança real de ponta a ponta só pode ser feita por si, com um cartão real — diga se quer que prepare esse teste.

## 3. Facilidade de reserva

Avaliar atrito com olhos de cliente novo:

- É óbvio, em cada página, qual é o passo seguinte?
- O preço, a duração e o que está incluído são visíveis antes de decidir?
- A barra fixa do telemóvel aparece e desaparece nos momentos certos?
- Há sinais de confiança junto ao botão de pagamento (operador licenciado, pagamento seguro, cancelamento)?

Entrega: correções pequenas e concretas, ordenadas por impacto na venda.

## 4. Auditoria de SEO

- Título, descrição e dados sociais únicos e do tamanho certo em todas as páginas.
- Dados estruturados válidos: experiências, avaliações, perguntas frequentes, migalhas de navegação, artigos.
- Avaliações visíveis nas páginas onde são declaradas ao Google.
- Nenhuma página a competir com outra pelas mesmas pesquisas.
- Nenhum endereço a responder com desvio quando devia responder diretamente.
- Páginas orientadas às pesquisas do mercado norte-americano.

## 5. Sitemap e indexação

- Regenerar o sitemap com todas as páginas reais, incluindo as 12 experiências, páginas de destino e artigos.
- Confirmar que cada endereço do sitemap responde diretamente, sem desvio nem erro.
- Confirmar datas de atualização e o sitemap de imagens.
- Confirmar as regras para motores de busca e os endereços canónicos.

## 6. Publicação e verificação final

- Publicar o resultado.
- Repetir a verificação já no site publicado.
- Entregar um relatório final: o que foi corrigido, o que ficou confirmado como funcional, e o que depende de si (reenviar o sitemap no Search Console, teste de cobrança real).

## Fora de âmbito

Preços, inventário, factos das experiências, regras de cancelamento, lógica de pagamento, estrutura da base de dados e arquitetura de endereços mantêm-se intactos. Não posso garantir primeira página no Google.

## Detalhes técnicos

- Verificações automáticas a correr: `check:route-meta`, `check:routes`, `check:css`, `check-motion-budget`, `vitest run` completo, e os testes de ponta a ponta de sitemap (`test:e2e:sitemap`), acessibilidade Signature e estabilidade de imagens.
- Sitemap regenerado por `scripts/generate-sitemap-routes.mjs`, validado com pedidos diretos a cada endereço (esperado 200, sem redireção).
- Auditoria de navegação e reserva conduzida com Playwright em 393×852 e 1280×900, com captura de consola, rede e capturas de ecrã como prova.
- Dados estruturados validados a partir do HTML servido pelo servidor (não apenas do browser), para garantir que o Google lê o mesmo que o visitante vê.
