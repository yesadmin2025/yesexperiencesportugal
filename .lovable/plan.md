## Objetivo

Recurar e tratar as fotografias reais já existentes, remover integralmente as duas imagens inventadas e garantir que uma fotografia só ocupa **um único lugar editorial** entre todos os módulos Ambient e Moments — mesmo quando a fonte original é um upload do admin. A fotografia pode continuar na galeria original do tour, como confirmaste.

## O que a auditoria confirmou

- As imagens inventadas `douro-terraces-golden` e `alentejo-cork-dawn` aparecem apenas no Ambient de `/multi-day`; serão removidas do código e do CDN.
- O teste atual só verifica repetições entre os três presets Ambient. Não inclui Moments, não compara Ambient com Moments e não reconhece uploads do admin.
- Moments contém atualmente 7 fotografias repetidas entre os seus conjuntos, incluindo Sintra Group, Arrábida View, Wine Cheers, Tasting Cake, Arrábida Women, Azulejo Master e Moscatel Vats.
- O banco do admin tem 18 fotografias reais em quatro galerias. Algumas são também a fonte visual das imagens Ambient, mas com URLs diferentes; comparar apenas URLs não deteta essa repetição.
- As imagens antigas continuam a ser servidas diretamente dos ficheiros originais: não foram criadas versões tratadas nem variantes reais por largura para os assets do CDN.
- O movimento Ambient atual é um zoom infinito de 1.06–1.12, demasiado forte e permanentemente ampliado. Moments tem apenas um hover e nem sequer gera `srcSet` real para os assets locais.

## Implementação

### 1. Remover todo o conteúdo inventado

- Retirar `douro-terraces-golden` e `alentejo-cork-dawn` do preset Multi-day.
- Eliminar os respetivos assets do CDN, sem os substituir por imagens geradas, stock ou fotografias de locais não comprovados.
- Substituí-los exclusivamente por fotografias reais já existentes no banco/admin, escolhidas pelo contexto da página.

### 2. Criar um catálogo editorial global por identidade da fotografia

- Centralizar Ambient e Moments num catálogo único com:
  - identidade estável da fotografia por hash do conteúdo, não apenas URL ou nome;
  - origem real: owner photo, tour gallery/admin ou asset existente;
  - contexto permitido, alt, legenda, proporção e variantes responsivas;
  - colocação editorial exata: página + módulo + posição.
- Manter a galeria do tour como fonte original: uma imagem usada num Ambient ou Moment continua disponível na sua galeria.
- Aplicar a regra de unicidade apenas às colocações editoriais Ambient/Moments; nenhuma fotografia pode ocupar dois desses lugares.

### 3. Incluir uploads do admin na verificação

- Guardar hash, largura e altura de cada novo upload do admin após o processamento, através de uma migração segura da tabela existente.
- Calcular o hash também para as 18 fotografias já armazenadas e associá-las ao catálogo real.
- Antes de uma fotografia do admin ser atribuída a Ambient ou Moments, validar o hash contra todas as colocações editoriais existentes.
- Mostrar no admin o uso editorial atual e impedir uma segunda atribuição, sem remover a fotografia da galeria do tour.

### 4. Recuradoria contextual das páginas

- Rever as imagens atuais de `/corporate`, `/proposal-in-portugal`, `/multi-day`, Homepage e About usando apenas o stock real confirmado.
- Reatribuir cada fotografia ao contexto onde transmite mais valor:
  - Corporate: pessoas, grupos, espaços e execução real;
  - Proposal: casal, privacidade, luz e locais discretos;
  - Multi-day: variedade regional e sensação de percurso real;
  - About: fundador, equipa e operação autêntica;
  - Moments: emoção humana, artesanato e hospitalidade.
- Evitar imagens tecnicamente fracas em posições grandes, especialmente o Comporta aerial vertical dentro de um corte horizontal e os ficheiros de baixa resolução em blocos largos.
- Não criar secções novas nem alterar o layout; apenas melhorar seleção, enquadramento e apresentação das secções fotográficas existentes.

### 5. Tratamento editorial não generativo

- Trabalhar as fotografias selecionadas sem alterar o conteúdo real:
  - correção subtil de exposição e balanço de cor;
  - recuperação de altas luzes/sombras;
  - redução de ruído e nitidez moderada;
  - corte específico para 3:2 ou 4:5 conforme o módulo;
  - sem acrescentar, remover ou inventar pessoas, objetos, céu ou paisagem.
- Não ampliar artificialmente fotografias pequenas para posições onde perderiam qualidade.
- Recompactar ficheiros pesados, incluindo a imagem About de 1,1 MB, preservando detalhe visual.

### 6. Variantes responsivas reais

- Criar derivados WebP/AVIF nos tamanhos úteis de cada fotografia, limitados pela resolução real da origem.
- Atualizar o catálogo e os dois componentes para fornecer `srcSet` e `sizes` verdadeiros, incluindo Moments.
- Manter carregamento lazy nas imagens secundárias e prioridade apenas na primeira imagem de conversão relevante.

### 7. Movimento premium e contido

- Remover o Ken Burns infinito atual.
- Aplicar uma entrada única e subtil: pequeno settle de escala até 1:1, máscara/reveal suave e fade, sem parallax.
- Manter hover máximo de aproximadamente 1.02–1.03 apenas em dispositivos com hover.
- Desativar totalmente transformações em `prefers-reduced-motion`.

### 8. Verificação automática e QA visual

- Substituir o teste Ambient isolado por uma verificação global que falha quando o mesmo hash aparece em mais de uma colocação Ambient/Moments.
- Cobrir assets estáticos, owner photos e fotografias originadas no admin.
- Adicionar testes de `srcSet`, alt text, proporção, redução de movimento e ausência dos dois assets inventados.
- Validar visualmente Homepage, About, Corporate, Proposal e Multi-day em mobile primeiro e depois desktop, confirmando enquadramento, nitidez, movimento e ausência de repetições editoriais. Que fique o mais premmium possível e melhor qualidade e movimento possível 