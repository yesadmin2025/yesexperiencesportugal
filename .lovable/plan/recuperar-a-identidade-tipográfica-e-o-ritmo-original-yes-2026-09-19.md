# Recuperar a identidade tipográfica e o ritmo original YES

## Objetivo

Recuperar a identidade visual original a partir da implementação histórica — não por aproximação às capturas — e corrigir tipografia, tamanhos, espaçamentos e ritmo em todas as páginas públicas.

A direção aprovada é:
- **Newsreader** para títulos editoriais e ênfases itálicas;
- **Inter** para corpo, navegação, botões, etiquetas, formulários e informação funcional;
- hero com a frase principal atual e o **texto explicativo novamente visível**;
- fotografias editoriais apenas onde acrescentam atmosfera, contexto ou prova.

## Diagnóstico confirmado

- A versão original de abril definia `Newsreader` como voz serif editorial; Fraunces foi introduzida e consolidada posteriormente.
- O site atual carrega e aplica Fraunces globalmente aos títulos, por isso a forma das letras já não corresponde à identidade recordada.
- Existem várias gerações de medidas e espaçamentos locais, o que provoca títulos, intervalos e densidades diferentes entre páginas.
- O hero atual omite o texto explicativo guardado no próprio conteúdo: “Private days, journeys and special moments across Portugal, guided by local knowledge.”

## 1. Restaurar a tipografia original

- Carregar Newsreader corretamente e torná-la a única família editorial pública.
- Manter Inter em toda a interface e texto funcional.
- Substituir Fraunces nos títulos, itálicos editoriais, reviews e destaques públicos.
- Remover dependências e regras concorrentes que possam fazer páginas diferentes renderizarem fontes diferentes.
- Preservar fallback seguro, carregamento sem saltos e legibilidade com fontes lentas.

## 2. Criar uma escala tipográfica única

Definir uma escala partilhada para:
- hero/display;
- H1 de página;
- H2 de secção;
- H3/cartões;
- corpo grande e corpo normal;
- eyebrow;
- ações e informação funcional.

A escala será mobile-first a 393 px, com limites claros para tablet e desktop. Os títulos terão largura de leitura, entrelinha e espaço real para itálicos, acentos, ascendentes e descendentes — sem máscaras ou alturas rígidas.

## 3. Normalizar os espaçamentos

- Recuperar o ritmo histórico entre eyebrow, título, texto, ação e imagem.
- Definir intervalos partilhados para capítulos, blocos editoriais, cartões e formulários.
- Eliminar medidas locais incompatíveis, vazios excessivos e secções comprimidas.
- Manter ivory como superfície dominante e sand apenas para separar capítulos reais.
- Garantir que mobile, tablet e desktop mantêm a mesma hierarquia, sem simplesmente ampliar tudo.

## 4. Corrigir o hero com o segundo texto

Manter:
- “Portugal is the stage.”
- “You write the story.”
- filme e enquadramento aprovados;
- “Design your day” e “Explore experiences”.

Reintroduzir, como camada independente:
- “Private days, journeys and special moments across Portugal, guided by local knowledge.”

A composição terá quatro zonas estáveis — título, explicação, ações e respiração inferior — sem posições percentuais que possam colidir. O texto explicativo será legível mas secundário, e todo o conteúdo caberá no primeiro ecrã mobile.

## 5. Fotografia editorial com intenção

- Manter o hero cinematográfico e as fotografias reais já aprovadas.
- Usar fotografia em capítulos onde mostra pessoas, lugar, experiência ou prova concreta: Signature, Studio, Travel Designer, Moments e Corporate.
- Manter Five Ways como índice editorial sem fotografias; as imagens entram depois, quando cada caminho ganha contexto.
- Evitar repetição da mesma fotografia, imagens decorativas, stock, galerias excessivas e cartões todos dependentes de imagem.
- Preservar as fotografias e fontes de conteúdo existentes; não inventar destinos, tours ou cenas.

## 6. Harmonizar todas as páginas públicas

Aplicar o mesmo sistema, sem mudar conteúdo factual ou função:
1. Homepage completa.
2. Experiences e 12 Signature Experiences.
3. Studio e Tailor nas superfícies editoriais, mantendo as fases transacionais mais silenciosas.
4. Travel Designer, Moments, Corporate e About.
5. Destinos, Local Stories, Reviews, FAQ, Contact e páginas de confiança.
6. Versões portuguesas, com revisão própria de comprimentos e quebras.

Checkout, formulários e administração mantêm Inter e um ritmo funcional; não receberão ornamentação editorial que atrase tarefas.

## 7. Movimento coerente

- Hero: uma entrada cinematográfica curta e única.
- Conteúdo: fade e deslocamento discreto, sem bounce, loops ou efeitos concorrentes.
- Imagens: transição suave e zoom mínimo apenas quando reforça a leitura.
- Ações: resposta imediata, seta visível e movimento horizontal contido.
- Movimento reduzido: conteúdo completo e imediatamente visível.

## 8. Proteções contra nova deriva

Adicionar verificações para impedir:
- Fraunces ou uma terceira família nas páginas públicas;
- H1/H2 fora da escala partilhada;
- títulos cortados ou mascarados;
- espaçamentos locais que quebrem o ritmo principal;
- fotografias repetidas no mesmo percurso;
- hero sem o texto explicativo;
- animações que escondam conteúdo ou provoquem movimento contínuo.

## Validação antes de publicar

- Comparar com a implementação histórica Newsreader, não apenas com o estado atual.
- Rever as famílias públicas em 393×596, 393×852, 768×1024 e 1280×800.
- Testar 200% de texto, fontes lentas/fallback, movimento reduzido e carregamento progressivo de imagens.
- Confirmar zero títulos cortados, zero colisões, zero overflow horizontal e ações com pelo menos 44 px.
- Apresentar primeiro capturas mobile do hero, Five Ways e páginas editoriais representativas.
- Publicar apenas depois da sua validação visual.

## Limites protegidos

Não alterar preços, disponibilidade, itinerários, fotografias factuais aprovadas, Studio/Tailor, reservas, Stripe, base de dados, administração, SEO, schema, sitemap, URLs ou lógica de negócio.
