# Auditoria completa: tipografia, texto cortado, cartões de reserva e nível gráfico

Fiz primeiro uma varredura real de todas as páginas públicas (telemóvel 393px e computador 1280px), a medir cada título, frase, etiqueta, botão e campo. O que se segue é o que foi encontrado, não suposições.

## O que está mesmo cortado hoje

1. **Números dos passos do itinerário** (páginas das experiências): a partir do passo 10, o número não cabe na coluna e aparece cortado.
2. **Etiquetas de percurso no mapa** ("Évora historic centre → Roman Temple", "Quinta da Regaleira → Adega de Colares"): o texto é mais largo do que a caixa e fica cortado a meio.
3. **Descrições dos cartões na página Experiências**: a frase é cortada às duas linhas, tanto no telemóvel como no computador, ficando a meio da ideia.
4. **Cartão de avaliação na homepage**: o texto da avaliação é cortado verticalmente dentro da caixa.
5. **Letras demasiado pequenas**: o selo de avaliações externas mostra texto a 6,5–9px e os botões do aviso de cookies a 9px — abaixo do mínimo legível da marca (11px) e fora das duas fontes do site.
6. **Botões pequenos**: os botões de ordenar avaliações têm 32px de altura, abaixo dos 44px necessários para o dedo.
7. **A verificar**: o endereço `/journal` devolve página não encontrada (os artigos vivem em `/local-stories`); vou confirmar se há alguma ligação no site a apontar para lá antes de mexer.

## Fase 1 — Zero texto cortado (prioridade)

- Coluna dos números do itinerário dimensionada para dois dígitos, sem cortes até ao passo 20.
- Etiquetas de percurso passam a caber: texto mais curto na origem ou quebra em duas linhas, nunca cortado.
- Descrições dos cartões: em vez de cortar a frase, usar uma frase curta escrita para caber (uma ideia por cartão). Se precisar de mais, aparece completa na página da experiência.
- Cartão de avaliação na homepage com altura suficiente para a citação completa; citações longas ganham um fim natural em vez de corte.
- Regra global: nenhum título, frase ou etiqueta pode ficar cortado; fica um teste automático que falha se voltar a acontecer.

## Fase 2 — Tipografia e legibilidade coerentes

- Escala tipográfica única (Display, H1, H2, H3, corpo, etiqueta) aplicada a todas as páginas, com tamanhos e entrelinhas por tamanho de ecrã — títulos grandes deixam de competir com o espaço disponível.
- Mínimo de 11px em qualquer texto visível; selo de avaliações e aviso de cookies alinhados com a marca e legíveis.
- Medida de leitura confortável em textos longos (About, artigos, FAQ).
- Contraste verificado em todos os textos sobre imagem, areia e ivory.

## Fase 3 — Cartões de reserva sem fricção

Para o cartão Signature, o Tailor, o Studio e o checkout:

- Data sempre visível e legível, com o dia escrito por extenso ("Sat, 4 Oct 2026") e não só no formato do telefone; campo com altura de toque completa e nunca a sair da caixa.
- Uma só moldura por grupo (data · viajantes · preço), espaçamento igual entre eles, etiquetas iguais nos dois ecrãs.
- Frases de certeza junto ao botão: o que está incluído, confirmação imediata, política de cancelamento, pagamento seguro — sem duplicar informação nem abrir dúvidas.
- Erros claros e imediatos (data indisponível, dia fechado, grupo acima do limite) explicados em linguagem de cliente, com a alternativa seguinte.
- Botão de reservar e total sempre alcançáveis, sem o botão de WhatsApp a tapar nada.
- Nada muda em preços, disponibilidade, regras de reserva, Stripe ou dados dos tours.

## Fase 4 — Nível gráfico e interação de topo

Referência: páginas de produto de operadores de luxo e editoriais de viagem (imagem grande e calma, hierarquia forte, prova social discreta, motion contido). Melhorias propostas:

- Abertura de cada experiência mais cinematográfica: uma imagem, um título, uma frase, preço e reservar — sem ruído ao redor.
- Prova social com desenho próprio (nota, número de avaliações, uma citação curta) em vez do selo externo com letra minúscula.
- Motion com as três velocidades da marca: 140–200ms nos toques, 300–450ms nas revelações editoriais, 700–1000ms só na abertura. Sem salto, sem parallax barato, sempre respeitando "reduzir movimento".
- Uma ideia de movimento por secção; frases importantes revelam-se por máscara horizontal, setas com um único gesto à entrada.
- Transacional silencioso: no checkout, resposta instantânea e zero decoração.

## Fase 5 — Conversão e verificação

- Um caminho primário claro por página, com a linguagem de sempre ("Reserve this day", "Design your day", "Tailor this day").
- Confirmação de metadados, snippets e sitemap intactos (sem alterar a estratégia de palavras-chave).
- Validação final em telemóvel (393px), tablet e computador, nas 12 experiências, Studio, Tailor, Experiências, About, Contacto, FAQ, artigos e checkout: sem texto cortado, sem transbordo, sem erros.

## Notas técnicas

- Correções de tipografia e limites centralizadas em `src/styles.css` (escala e tokens) e nos componentes canónicos (`SectionTitle`, `Eyebrow`, `CtaButton`, `EditorialCard`), não caso a caso.
- Cortes atuais: coluna `grid-cols-[2rem_...]` do itinerário em `tours.$tourId.tsx`, etiquetas de percurso no componente do mapa, `line-clamp` nos cartões de `experiences.tsx` e `index.tsx`, altura fixa no cartão de avaliações da homepage.
- Selo externo de avaliações e aviso de cookies: substituir o texto minúsculo por marcação própria dentro do sistema tipográfico.
- Novos testes: "nenhum elemento de texto excede a sua caixa" e "nenhum texto abaixo de 11px" nas rotas públicas, mais verificação de alvos de 44px nos cartões de reserva.
- Sem alterações a preços, inventário, factos dos tours, regras de cancelamento, Stripe, base de dados, JSON-LD ou palavras-chave.

## Sugestão adicional

Se quiser, para as três zonas mais decisivas (abertura da experiência, cartão de reserva, prova social) posso mostrar primeiro duas ou três propostas visuais para escolher antes de aplicar.
