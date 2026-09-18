# Vendas pagas, gestão de experiências e estratégia SEO

Três pedidos. Um já está quase feito, um precisa de base de dados nova, um é documento.

## 1. Vendas pagas no painel

O painel já lista reservas agrupadas por dia da viagem, com filtro "paid". Falta a leitura de vendas.

Em `/admin/bookings`, quando o filtro é **paid**, passa a aparecer primeiro um resumo de vendas:

- Receita total paga, número de reservas e média por reserva
- Tabela limpa: **data da experiência · experiência · grupo (adultos/menores) · total pago**
- Ordenada pela data mais recente, com total do mês atual em destaque
- Feita no telemóvel primeiro (cartões empilhados a 393px, tabela a partir de tablet)

Sem tocar em preços, Stripe ou dados de reserva — é apenas leitura.

## 2. Ecrã de administração de experiências

Já existem: **preço** (`/admin/pricing`) e **disponibilidade/datas** (`/admin/availability`).
Falta a **descrição**, que hoje vive no código.

O que faço:

- `/admin/experiences` passa a ser um ecrã por experiência: escolhe a experiência e vê/edita num só lugar
  - **Descrição**: frase de cartão, parágrafo de abertura e "para quem é" — guardados numa tabela nova de conteúdo editorial
  - **Preço**: ligação direta ao editor de tarifas 1–8 pessoas já existente
  - **Datas e disponibilidade**: fechar dias, dias da semana em que opera, antecedência mínima
- As páginas públicas passam a mostrar o texto editado quando existir, e o texto atual quando não existir. Nunca fica uma página vazia.
- O mapa do site **não** é recalculado: só muda texto dentro de páginas que já existem.
- Alterações são registadas com autor e data, para se poder voltar atrás.

Continuo a não permitir criar ou apagar experiências por aqui — paragens, inclusões e itinerários continuam a ser verdade de origem (Viator/operação), para não se inventar oferta.

## 3. Estratégia de SEO de longo prazo

Publico um documento de trabalho (e uma página só para administração, para consultar no telemóvel) com:

- **Um tema, uma página**: a regra que corrigiu os wine tours, aplicada a Sintra, Fátima, Évora, Comporta, luxury e day trips
- **Calendário de conteúdo de 12 meses**: dois artigos por mês, cada um ligado a uma experiência real e com procura verificada no mercado americano (com os números de pesquisa por trás)
- **Conteúdo regular por experiência**: o que atualizar em cada página de experiência a cada trimestre (perguntas frequentes reais, época do ano, preços, recolha no hotel)
- **Artigos de destino**: lista priorizada, com a pesquisa alvo e a experiência que cada um deve vender
- **Links de autoridade**: alvos reais e verificáveis (imprensa de viagens, guias regionais, associações de turismo, parceiros de vinho), com o argumento para cada um e três modelos de email
- **Como medir**: que números olhar no painel SEO e de quanto em quanto tempo; o que é normal demorar 3–6 meses

Honestidade: ninguém garante primeira página. O documento é um plano de autoridade a 12 meses, não uma promessa de posição.

## Notas técnicas

- Nova tabela `experience_content_overrides` (chave: id da experiência) com RLS: leitura pública apenas do que está publicado, escrita só para admin; GRANTs explícitos.
- Leitura pública através de função de servidor pública, sem chave privilegiada.
- `/admin/experiences` agrega os editores existentes; não duplica lógica de preços nem de disponibilidade.
- Documento SEO em `docs/seo/authority-strategy-2026.md`, com página de leitura em `/admin/seo-strategy` (noindex).
- Sem alterações a Stripe, checkout, rotas públicas novas, ou geração de sitemap.
