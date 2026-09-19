# Recuperação integral do branding YES originalmente aprovado

## Objetivo

Voltar ao sistema visual que foi realmente aprovado — não redesenhá-lo nem tentar aproximá-lo pelas capturas atuais.

A recuperação será feita seletivamente a partir do histórico, preservando todo o trabalho funcional posterior: conteúdos, fotografias escolhidas, Studio, Tailor, preços, reservas, pagamentos, administração, SEO, dados e rotas.

## Referências confirmadas

1. **Branding oficial, aprovado em 23 de abril**
   - Teal `#295B61` e teal secundário `#2A7C82`
   - Gold `#C9A96A`, apenas em detalhes finos
   - Ivory `#FAF8F3` como fundo dominante
   - Sand `#F4EFE7` para alternância suave
   - Charcoal `#2E2E2E` e soft charcoal `#6B6B6B`
   - Logo oficial sem alterações

2. **Tipografia pública consolidada posteriormente**
   - Fraunces para todos os títulos editoriais
   - Inter para corpo, navegação, botões, formulários e informação funcional
   - Títulos em Fraunces romano, com uma ênfase curta em Fraunces itálico teal
   - Escala consistente por função, não tamanhos inventados página a página

3. **Hero aprovado no histórico de 16 de setembro**
   - Recuperar a implementação real que preservava o filme como elemento dominante e as zonas verticais separadas
   - Headline, apoio e botões com silêncio visual, sem bloco central comprimido
   - Sem glow, emboss, contorno ou sobreposição
   - Manter apenas as alterações aprovadas: eyebrow discreto, apoio independente e labels atuais das ações

4. **Assinatura dourada aprovada**
   - Eyebrow em Inter uppercase com riscos dourados laterais quando centrado e um risco quando alinhado à esquerda
   - Não usar riscos decorativos soltos debaixo dos títulos

## Diagnóstico confirmado nas capturas

- O hero tem sobreposição entre o título e o texto de apoio; a geometria atual usa posições percentuais independentes e não garante distância entre blocos.
- A escala dos títulos varia entre Homepage, Experiences, Corporate, Proposal e outras páginas porque existem muitas medidas locais fora da escala partilhada.
- Há páginas com excesso de vazio, secções sand/ivory sem ritmo comum e títulos visualmente maiores ou menores sem motivo hierárquico.
- Os Five Ways voltaram a parecer cartões de catálogo: caixas pesadas, imagens altas e composição diferente do resto da homepage.
- Corporate e Proposal ainda têm elementos da fase intermédia: linhas decorativas desativadas, títulos e espaçamentos locais e movimento não totalmente alinhado.
- Reviews, Signature e outras famílias não foram efetivamente harmonizadas na restauração anterior.
- O código contém duas linguagens de títulos, três lógicas de espaçamento e elementos dourados antigos que já não desenham nada.

## 1. Restaurar a base visual única

- Fixar os tokens oficiais de abril sem alterar os seus valores.
- Tornar ivory a superfície pública dominante e sand o contraste entre capítulos.
- Consolidar uma escala única para Display, H1, H2, H3, corpo, eyebrow e ações.
- Aplicar Fraunces/Inter exclusivamente em todas as páginas públicas EN/PT.
- Usar `SectionTitle`, `Eyebrow` e `CtaButton` como fonte visual única, acrescentando apenas variantes realmente necessárias.
- Remover estilos locais equivalentes, fontes antigas, branco frio, sombras avulsas e decoração duplicada.

## 2. Recuperar o hero exato, não o reinterpretar

- Partir da implementação histórica aprovada do hero, não da composição atual.
- Preservar a posição, escala, crop do vídeo, espaço negativo, dimensões dos botões e separação vertical do original.
- Inserir eyebrow e apoio como camadas independentes nos espaços existentes, sem deslocar o título ou elevar os botões.
- Garantir no mobile uma distância real entre título, apoio e ações — nunca posições percentuais que possam colidir.
- Manter Fraunces 400, primeira linha ivory e ênfase gold-soft itálica, sem efeitos artificiais.
- Recuperar a cadência curta aprovada: fade e deslocamento vertical discreto, sequencial, sem bounce ou loop.
- Mostrar imediatamente o estado final com movimento reduzido.

## 3. Reintegrar os Five Ways na homepage original

- Manter as cinco fotografias atuais e a fotografia aprovada do casal em Moments/Proposals.
- Retirar a aparência de cinco caixas pesadas e recuperar uma sequência editorial contínua, coerente com a homepage.
- Repor a escala original das descrições, títulos e ações: Fraunces romano, uma ênfase itálica curta, Inter no corpo e ação.
- Manter a hierarquia comercial: Studio, Signature e Travel Designer principais; Moments e Corporate secundários.
- Preservar cartões inteiros clicáveis, labels visíveis, gestão dinâmica de imagens e a seta canónica.
- Corrigir proporções e recortes em 393px antes de adaptar tablet e desktop.

## 4. Harmonizar todas as famílias públicas

Aplicar o sistema recuperado, sem mudar o conteúdo ou a função:

1. **Homepage completa:** hero, confiança, reviews, Five Ways, Studio, Signatures, mapa, Journal, FAQ e fecho.
2. **Compra:** Experiences, os 12 Signatures, Tailor, Studio, Book e checkout.
3. **Serviços editoriais:** About, Travel Designer/Multi-day, Proposal/Moments e Corporate.
4. **Descoberta:** destinos, vinho, private tours, Local Stories, Search, Reviews e FAQ.
5. **Confiança:** Contact, políticas, termos, formulários e confirmações.
6. **Português:** revisão separada de todas as páginas PT para acentos, comprimento e quebras de linha.

Em cada família serão uniformizados:
- escala e ritmo dos títulos;
- uso de romano/itálico;
- eyebrows e riscos dourados;
- fundos ivory/sand;
- largura de leitura e espaçamento vertical;
- proporções de imagem e cartões;
- ações, setas e movimento.

## 5. Corrigir cortes, sobreposições e escalas

- Remover máscaras rígidas e `overflow` de títulos.
- Dar margem tipográfica segura à Fraunces, itálicos, acentos, ascendentes e descendentes.
- Substituir alturas fixas por alturas mínimas quando o texto possa quebrar.
- Eliminar `nowrap` inseguro e limites estreitos no mobile.
- Normalizar os muitos H1/H2 com tamanhos locais para a escala oficial, mantendo a hierarquia semântica.
- Garantir que nenhum conteúdo essencial depende de uma animação para ficar visível.

## 6. Simplificar superfícies, dourado e movimento

- Manter apenas o motivo dourado do `Eyebrow`; eliminar linhas mortas ou decorativas sob títulos.
- Alternar ivory/sand por capítulos reais, sem grandes vazios acidentais nem blocos consecutivos sem intenção.
- Usar uma revelação editorial para conteúdo e uma transição suave para imagens.
- Remover loops decorativos, bounce, pulsações e efeitos concorrentes.
- Manter checkout, formulários e administração rápidos e silenciosos.

## 7. Proteções contra nova deriva

Adicionar verificações para impedir:
- fontes públicas fora de Fraunces/Inter;
- cores e fundos fora da paleta oficial;
- H1/H2 fora da escala aprovada;
- títulos com máscaras ou alturas que cortem glifos;
- riscos dourados fora do componente canónico;
- imagens/cartões com proporções divergentes dentro da mesma família;
- animações decorativas infinitas;
- sobreposição entre blocos do hero.

## Validação obrigatória antes de publicar

- Comparar lado a lado com a implementação histórica aprovada, não apenas com a versão atual.
- Percorrer todas as páginas públicas e os 12 Signatures em:
  - 393×852
  - 393×596, como nas capturas enviadas
  - 768×1024
  - 1280×800
- Testar movimento normal e reduzido, fontes lentas/fallback, imagens progressivas e texto a 200%.
- Confirmar zero títulos cortados, zero sobreposições, zero overflow horizontal, zero imagens partidas e ações com pelo menos 44px.
- Confirmar contraste, foco, menu e WhatsApp sem tapar conteúdo ou ações.
- Apresentar primeiro capturas comparativas do mobile antes da publicação.
- Publicar apenas depois da validação visual final.

## Limites protegidos

Não alterar copy factual, fotografias aprovadas, preços, disponibilidade, itinerários, Studio/Tailor, Stripe, reservas, base de dados, administração, SEO, schema, sitemap, URLs ou lógica de negócio.

## Resultado esperado

Um único site YES, reconhecível em todas as páginas: editorial, ivory, Fraunces e Inter, teal com contenção, dourado apenas como assinatura, títulos proporcionais e legíveis, movimento calmo e nenhuma colisão visual.
