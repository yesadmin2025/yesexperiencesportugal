# Páginas de experiência simples, destaques reais e cartões de reserva alinhados

## 1. Simplificar a página de cada experiência

Manter a abertura editorial (imagem grande, título, frase de venda e o parágrafo curto "The day, in short"). Depois disso, a página passa a ler-se como uma página de produto clara, na ordem que o viajante espera:

1. Abertura: imagem, título, frase, região · duração · avaliação, preço "desde", botão Reservar
2. Confiança curta (confirmação imediata, cancelamento, apoio)
3. Destaques reais da experiência
4. O que está incluído / o que não está incluído
5. O percurso do dia — lista simples e numerada, sem a linguagem "Chapter 1, Chapter 2… capítulo por capítulo"
6. Mapa do percurso
7. Fotografias reais
8. Reservar (data, viajantes, preço, pagamento)
9. Opiniões
10. Perguntas frequentes e contexto local no fim

Mudanças concretas:
- O percurso deixa de se chamar "The day, chapter by chapter" e deixa de mostrar "Chapter N" em cada paragem. Fica "O percurso do dia": número, nome real da paragem, uma linha de descrição, e etiqueta "Opcional" quando é opcional.
- Remover a repetição: a lista curta de inclusões que hoje aparece junto ao título sai de lá, porque a lista completa já existe mais abaixo.
- "Quem é ideal para" e "Bom saber" passam a ficar junto às inclusões, numa única zona prática, em vez de blocos espalhados.
- Sem alterar nenhum facto: paragens, inclusões, durações, preços, cancelamento e links Viator mantêm-se exatamente como estão.

## 2. Destaques reais em todo o site

Hoje os cartões da página inicial mostram como "destaques" apenas os nomes das paragens, o que não descreve a experiência. Passa a existir uma única origem: os destaques verificados de cada experiência (os mesmos que constam da página Viator correspondente), por exemplo:

- Arrábida Wine: duas adegas incluídas (até quatro no Tailor), provas com petiscos regionais, Mercado do Livramento e fábrica de azulejos de Azeitão, Parque Natural da Arrábida
- Évora Alentejo: centro histórico UNESCO, Templo Romano e Capela dos Ossos, duas adegas com provas, queijos e charcutaria, unidade de cortiça
- Tomar Coimbra: Convento de Cristo, centro histórico de Tomar, Universidade de Coimbra, Biblioteca Joanina com hora marcada

Aplica-se aos cartões da página inicial, aos cartões da página de experiências e à secção de destaques da página da experiência — todos mostram o mesmo. O que a Nídia escrever no painel continua a substituir os destaques quando publicado.

## 3. Cartões de reserva alinhados e legíveis (Reservar e Tailor)

Nos dois sítios onde se escolhe data e viajantes:
- Campo de data com a mesma altura, largura total e valor sempre visível, sem sair da caixa no iPhone
- Etiquetas iguais nos dois ecrãs (mesmo tamanho, nunca abaixo de 11px, mesma cor legível)
- Uma única moldura por grupo de campos, em vez de caixas dentro de caixas
- Espaçamento igual entre data, viajantes e preço; alvos de toque de 44px
- Botão de reserva e resumo de preço sempre visíveis sem sobreposição do botão flutuante de WhatsApp

## Detalhes técnicos

- `src/routes/tours.$tourId.tsx`: reordenar as secções na composição da página, simplificar `ItineraryTimeline` (sem rótulos "Chapter"), retirar a lista `heroIncluded` do cabeçalho e agrupar `IncludedAndIdeal`.
- Destaques: `HighlightsBlock` e os cartões passam todos por `getTourContent(id).highlights` (fonte verificada em `signatureToursSourceOfTruth.ts`), com os overrides publicados por cima. Corrigir `src/routes/index.tsx` (linha ~266) que hoje usa `meta.stops` como destaques; `src/routes/experiences.tsx` já lê a fonte correta.
- Reserva: alinhar `SimpleBookingForm.tsx`, `CompositionField.tsx` e o bloco `tailor-booking-context` em `tours_.$tourId.tailor.tsx` com a mesma grelha, tipografia de etiqueta e regras de campo de data (`.signature-date-input` reutilizado no Tailor).
- Sem alterações a preços, inclusões, regras de disponibilidade, Stripe, esquemas de dados, metadados SEO, JSON-LD ou sitemap.

## Validação

- Verificação visual a 393px e em desktop nas 12 experiências: sem texto cortado, sem transbordo, campos de data contidos, destaques corretos.
- Testes focados de conteúdo, destaques, reserva e SEO/schema, verificação de tipos e orçamento de movimento.
- Publicar no fim.
