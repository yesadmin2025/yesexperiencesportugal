# Tailor flexível, administração e publicação

## Objetivo
Dar controlo por experiência sem alterar factos comerciais: no Tailor, cada atividade terá escolhas de duração, participantes e quantidade; no admin, reservas e conteúdo ficam fáceis de gerir; Studio e painel usam o mesmo preço publicado.

## Implementação

### 1. Tailor por experiência
- Retirar bloqueios globais visíveis de 10 horas, 3–6 paragens, quatro adegas e três alterações.
- Manter apenas limites operacionais reais configurados por experiência: durações disponíveis, número de participantes e quantidade de sessões/visitas.
- Mostrar avisos quando uma combinação exigir confirmação, sem remover automaticamente momentos incluídos.
- Preservar preços, descontos, disponibilidade, segurança do checkout e validação final do servidor.

### 2. Cadastro central do Studio
- Usar o catálogo administrativo já criado como fonte única para duração, horários, preço, unidade, mínimo de participantes e disponibilidade.
- Acrescentar opções de duração e quantidade por experiência sem inventar valores para os 47 registos ainda incompletos.
- Garantir atualização imediata do Studio e paridade entre preço no cadastro, resumo e cobrança.

### 3. Reservas no admin
- Consolidar a página existente de reservas para mostrar todas as vendas com data, horário, viajantes, experiência, contacto, estado e total.
- Manter calendário, pesquisa, filtros e detalhe da compra, com leitura confortável no telemóvel.

### 4. Conteúdo das experiências
- Unir o editor existente de texto com atalhos claros para imagens e capa.
- Acrescentar highlights editáveis, com histórico e publicação, reutilizando o conteúdo e galeria existentes.
- Não alterar itinerários, inclusões, preços, regras de reserva ou dados operacionais nesta área.

### 5. Validação e publicação
- Testar Tailor, Studio, reservas, conteúdo e checkout em 393px e desktop.
- Confirmar metadados, snippets renderizados, schemas e todas as experiências no sitemap.
- Publicar uma vez no final e verificar a versão pública.
- Confirmar o que está tecnicamente presente para o Google; a exibição e atualização efetiva nos resultados continua dependente do rastreio do Google.

## Dados que precisam da Nídia
Os preços, durações, horários e quantidades reais ainda ausentes não serão inventados. Esses registos ficam como “Incomplete” no admin e fora do Studio até serem preenchidos.
