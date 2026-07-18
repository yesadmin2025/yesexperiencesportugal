## Objetivo

Corrigir o erro de abordagem: **não acrescentar galerias, carrosséis ou blocos no fundo das páginas**. Melhorar apenas os módulos que já existiam, usando fotografia real, relevante e com apresentação premium.

## 1. Remover integralmente o que foi acrescentado indevidamente

- Retirar o `AmbientLandscapeReveal` de:
  - Corporate
  - Moments / Proposal in Portugal
  - Travel Designer
- Eliminar o autoplay, os pontos de navegação, as legendas sobrepostas e o zoom contínuo vistos nas capturas.
- Remover o componente, as animações CSS e os testes associados quando deixarem de ter uso.
- Retirar do painel `/admin/image-swap` os módulos “Ambient landscapes”, para não voltar a sugerir secções que já não existem.

## 2. Corporate: substituir imagens dentro dos três blocos existentes

Manter exatamente a estrutura atual dos três blocos — sem criar uma quarta área visual.

- **Executive & Incentive:** fotografia real de um grupo privado recebido numa experiência, com escala humana e sinal claro de equipa.
- **Off-sites & Retreats:** fotografia real de grupo num cenário português, mostrando convivência, espaço e contexto de destino.
- **Client Hosting & VIP:** momento real de hosting discreto — pequeno grupo, mesa, adega ou interação guiada — em vez do close-up genérico da cerâmica.
- Excluir imagens como a extração de cortiça isolada ou detalhes artesanais quando não comunicam diretamente corporate, grupo ou hosting.
- Escolher entre as fotografias reais já carregadas pela proprietária, dando prioridade a nitidez, resolução, luz natural, contexto e pessoas.

## 3. Moments: melhorar as três imagens que já pertencem aos blocos

- Manter os blocos existentes de Proposal, Celebrations e Family & Friends.
- Rever a imagem de cada bloco para garantir correspondência direta:
  - casal e intimidade para Proposal;
  - celebração real para Celebrations;
  - convivência real para Family & Friends.
- Substituir apenas uma imagem quando houver na biblioteca real uma alternativa claramente mais nítida e mais contextual.
- Não adicionar uma galeria de paisagens depois do FAQ.

## 4. Travel Designer: remover o bloco fotográfico adicional

- Retirar completamente o carrossel “A few of the places”.
- Preservar a narrativa existente: processo, travel file, percurso, apoio local, FAQ e CTA.
- Não inserir outra galeria ou secção visual em substituição.
- Melhorar apenas a apresentação das imagens reais do travel file já integradas na página, sem alterar o seu conteúdo.

## 5. Qualidade e movimento aplicados às imagens existentes

Em Corporate, Moments e no travel file:

- aplicar `srcSet` e `sizes` responsivos através do sistema de imagem já existente;
- definir dimensões estáveis e crops/focal points específicos para mobile, evitando rostos ou ações cortadas;
- usar carregamento prioritário apenas na primeira imagem relevante e lazy loading nas restantes;
- manter alt text factual e específico;
- aplicar somente movimento editorial discreto: entrada suave e micro-zoom máximo de aproximadamente `1.02–1.03` em interação compatível;
- sem autoplay, sem Ken Burns contínuo, sem animações decorativas e com `prefers-reduced-motion` respeitado.

## 6. Adaptar o painel de substituição à estrutura correta

- Fazer o `/admin/image-swap` atuar sobre os **slots de imagem dos blocos que já existem** em Corporate e Moments, em vez de controlar módulos Ambient adicionados ao fundo.
- Manter comparação, ranking, aplicação em lote e desfazer.
- Mostrar apenas candidatas reais da biblioteca da proprietária/admin, filtradas por contexto e qualidade.
- Não criar slots novos; uma aplicação substitui sempre uma imagem existente.

## 7. Validação final

- Verificação mobile a `393 × 706`, incluindo enquadramento, legibilidade, estabilidade e ausência de overflow.
- Verificação desktop responsiva.
- Confirmar que não existe nenhuma secção Ambient no fundo das três páginas.
- Confirmar que não há imagem repetida entre os blocos afetados e os restantes módulos editoriais principais.
- Adicionar/ajustar testes para bloquear:
  - reintrodução dos carrosséis Ambient;
  - slots adicionais;
  - imagens duplicadas;
  - ausência de `srcSet`, `sizes`, alt text ou suporte a reduced motion.

## Critério de conclusão

A correção só fica concluída quando as três páginas mantiverem a sua estrutura original, cada fotografia comunicar claramente o contexto do respetivo bloco e não existir qualquer galeria ou carrossel adicional no fundo.

Editar imagens de cada bloco para a melhor qualidade possível como a qualidade de imagem por exemplo que há no site black tomato. E alguma animação sim. Ou zoom in ou out. Tem de ter vida. 