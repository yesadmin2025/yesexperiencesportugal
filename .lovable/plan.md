# Plano — Reunificação editorial e auditoria integral da marca YES

## Objetivo
Recuperar uma identidade inequivocamente YES em todo o site: fundo ivory dominante, sand apenas para alternância suave, teal e charcoal com função clara, dourado como assinatura editorial, Fraunces com contraste intencional entre romano e itálico, Inter para leitura e interface, e movimento elegante sem cortar letras.

Não será um novo redesign. Será uma correção sistemática para voltar ao branding aprovado e impedir que novas páginas ou componentes se afastem novamente dele.

## Princípio visual a recuperar
- **Base:** ivory como fundo principal; sand para separar capítulos, nunca branco frio ou páginas dominadas por beige.
- **Tipografia:** Fraunces em todos os títulos; texto principal romano em charcoal; apenas uma frase ou palavra estratégica em Fraunces itálico teal. Inter em corpo, botões, formulários e informação funcional.
- **Assinatura dourada:** recuperar e preservar o motivo correto — palavra/eyebrow central com riscos dourados laterais, incluindo “Signature” — com desenho animado suave. Não confundir com riscos decorativos soltos debaixo de todos os títulos.
- **Composição:** editorial, assimétrica e respirada; sem cartões genéricos, caixas dentro de caixas, excesso de badges ou decoração.
- **Movimento:** uma ideia dominante por secção, entrada única e suave, sem bounce, oscilação ou loops decorativos.

## 1. Criar uma base única de marca
- Consolidar os estilos de títulos, subtítulos, corpo, legendas, botões e labels nos componentes já existentes `SectionTitle`, `Eyebrow`, `CtaButton` e no sistema global.
- Tornar o `Eyebrow` com riscos dourados laterais o padrão explícito para títulos centrais e manter a versão com um risco para títulos alinhados à esquerda.
- Criar uma variante animada no próprio motivo dourado: os riscos desenham-se uma vez quando entram no ecrã; com movimento reduzido aparecem completos e imóveis.
- Remover tamanhos, pesos, espaçamentos e cores criados localmente quando duplicam o sistema central.
- Substituir fundos brancos frios e sombras avulsas por superfícies ivory/sand e sombras semânticas da marca.
- Eliminar componentes antigos não utilizados que ainda contêm versões desatualizadas de “Four ways” e estilos fora da paleta.

## 2. Corrigir todos os cortes de letras e títulos
- Definir uma margem segura para as métricas da Fraunces, incluindo itálicos, acentos portugueses, ascendentes e descendentes.
- Eliminar `line-height` inferior ao necessário nos títulos grandes e corrigir máscaras que usam `overflow` ou `clip-path` demasiado justo.
- Fazer `SplitLines`, revelações de títulos e máscaras partilharem a mesma área de segurança, sem cortar a primeira/última letra nem a parte superior/inferior dos glifos.
- Trocar alturas fixas de botões por alturas mínimas quando o texto pode ocupar duas linhas, sobretudo em português e com zoom de texto.
- Corrigir `nowrap`, limites estreitos e equilíbrio automático de linhas onde possam esconder texto no mobile.
- Garantir que, sem animação, com carregamento lento ou em caso de falha de JavaScript, todo o texto continua visível.

## 3. Reintegrar os cinco cartões no universo YES
- Manter as cinco fotografias aprovadas e a hierarquia comercial atual.
- Reorganizar os cartões como uma sequência editorial coerente, não cinco peças gráficas independentes: proporções controladas, ritmo de imagem consistente e mais espaço entre imagem, título e ação.
- Aplicar a gramática tipográfica da marca: título Fraunces romano, eventual ênfase itálica apenas quando editorialmente necessária, corpo Inter, eyebrow canónico com detalhe dourado.
- Retirar o aspeto de recorte/caixa sobreposta que atualmente os separa visualmente do resto do site.
- Unificar todas as setas com a seta oficial da marca e uma única animação de desenho/avanço; remover a animação exclusiva dos Five Ways e a seta diferente em “Resume your draft”.
- Renomear internamente a secção de Four Ways para Five Ways para eliminar a inconsistência e prevenir regressões futuras.

## 4. Harmonizar página por página
A revisão visual será aplicada por famílias, sempre sem alterar preços, conteúdo factual, reservas ou SEO:

1. **Homepage:** Hero, Five Ways, Signatures, Studio, mapa, reviews, Journal, FAQ e fecho.
2. **Compra principal:** Experiences, todas as páginas Signature, Tailor e Studio.
3. **Serviços editoriais:** About, Travel Designer/Multi-day, Proposals/Moments e Corporate, em inglês e português.
4. **Descoberta e conteúdo:** páginas de destinos, vinho, private tours, Local Stories, FAQ, Reviews, Search e páginas institucionais.
5. **Confiança e transação:** Contact, formulários, Book, checkout, confirmação e recibos — mesma marca, mas movimento mais silencioso e funcional.
6. **Português:** verificar separadamente todas as páginas PT, porque o comprimento das frases e os acentos expõem cortes que não aparecem em inglês.

Em cada família serão alinhados: fundo, alternância de secções, largura de leitura, estilo dos títulos, uso de itálico, uso dos riscos dourados, cartões, botões, setas, imagens e movimento.

## 5. Simplificar o sistema de animação
- Usar uma única revelação editorial para títulos e conteúdo, e uma única máscara para fotografias.
- Manter o Hero cinematográfico, mas reduzir as animações paralelas a uma sequência clara e controlada.
- Manter movimento ambiente apenas onde tem valor narrativo; remover pulsos, scans, shimmers e setas em loop que não representam carregamento real.
- Retirar parallax das páginas públicas fora da homepage, respeitando a regra de marca já aprovada.
- Fazer Five Ways, Experiences, About, Moments e Corporate partilharem tempos, curvas e ordem de entrada.
- Preservar integralmente `prefers-reduced-motion`.

## 6. Proteção contra nova deriva
- Reforçar a auditoria automática para detetar:
  - fontes fora de Fraunces/Inter;
  - fundos brancos e cores literais fora da paleta;
  - títulos públicos que não usam a escala oficial;
  - riscos dourados desenhados fora do motivo canónico;
  - alturas fixas perigosas, títulos mascarados sem margem segura e texto cortado;
  - animações infinitas decorativas e setas não canónicas.
- Documentar duas famílias permitidas de apresentação: editorial narrativa e transacional silenciosa.
- Remover duplicados e código antigo que possa voltar a ser reutilizado por engano.

## 7. Validação exaustiva
Executar uma passagem automática e visual em todas as páginas públicas e modelos dinâmicos, com especial atenção aos 12 tours:

- **Ecrãs:** 393×852, 768×1024 e 1280×800; teste adicional em mobile baixo/landscape.
- **Estados:** movimento normal, movimento reduzido, fontes em carregamento lento, JavaScript desativado para conteúdo essencial e zoom de texto a 200%.
- **Critérios:** zero letras/títulos cortados, zero overflow horizontal, zero texto oculto, zero imagens partidas, CTAs legíveis, contraste AA, foco visível e alvos tácteis de 44px.
- **Verificação visual:** screenshots por família de página, comparação antes/depois e inspeção específica dos títulos com itálico, acentos e riscos dourados.
- **Verificação técnica:** testes de marca, tipografia, movimento, acessibilidade, páginas, metadados e fluxos de reserva existentes.

## Limites protegidos
- Não alterar copy aprovada, preços, disponibilidade, itinerários, regras do Studio/Tailor, Stripe, reservas, base de dados, rotas, SEO, schema ou sitemaps.
- Não substituir as fotografias aprovadas nesta fase.
- Não tocar no painel administrativo, exceto se algum estilo global causar uma regressão visível nele.
- Não adicionar uma terceira fonte, uma nova paleta ou uma nova linguagem visual.

## Resultado esperado
Um site visualmente contínuo de ponta a ponta: imediatamente reconhecível como YES, editorial sem ser decorativo, moderno sem perder elegância, com o dourado correto recuperado, os cinco cartões integrados no mesmo universo e nenhum título ou letra cortada em qualquer ecrã.
