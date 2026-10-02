# Preencher os 35 preços em falta do Tailor (valores propostos)

## Como calculei
Usei os preços que já aprovou como referência:
- Retirar uma paragem principal: **−5%** do preço por pessoa (já usado em 20+ paragens).
- Retirar uma paragem sem custo real (miradouro, praia, passeio): **€0**.
- Adegas extra: **+€20 pp** (Arrábida), **+€25 pp** (Évora). Almoço: **+€35 pp** / retirar **−€15 pp**.
- Limite total de descontos continua **−15%** e preço mínimo **70%** — não mexo nisto.

Regra para cada caso em falta:
- **Retirar adega** = valor simétrico ao de acrescentar: −€20 pp (Arrábida/Azulejos), −€25 pp (Évora).
- **Retirar atividade paga principal** (barco, workshop, queijo, piquenique, ferry): **−10%** (custa mais ao operador que uma paragem normal; o teto de −15% protege a margem).
- **Retirar vila/centro histórico** (Sesimbra, Sintra, Cascais, Tomar, Óbidos, Évora centro, praia Tróia): **−5%**, igual às outras paragens.
- **Retirar palácio Sintra**: **−€15 pp** (bilhete de entrada que deixa de pagar).
- **Acrescentar paragem curta** (Castelo de Sesimbra, Cristo Rei, Cabo Espichel, porto de Sesimbra, Carrasqueira, Albergaria dos Fusos): **+€10 pp** (tempo extra de guia e carro).
- **Acrescentar visita com prova** (adega de Colares, Corticarte): **+€25 pp**, alinhado com a adega extra de Évora.

## Valores propostos (35)
- Arrábida vinho: 1 adega −€20 · 0 adegas −€20 (cada) · Cristo Rei +€10 · Castelo Sesimbra +€10
- Praias & piquenique: sem piquenique −10% · sem Sesimbra −5% · castelo +€10 · Cabo Espichel +€10
- Barco Arrábida: sem barco −10% · sem Sesimbra −5% · castelo +€10 · Cabo Espichel +€10
- Azulejos: sem workshop −10% · 0 adegas −€20 · castelo +€10 · porto Sesimbra +€10 · Cristo Rei +€10
- Queijo Azeitão: sem queijo −10% · sem Catralvos −€20 · castelo +€10 · Cristo Rei +€10
- Sintra–Cascais: sem Sintra vila −5% · sem Cascais −5% · sem palácio −€15 · adega Colares +€25
- Tróia–Comporta: sem ferry −10% · sem praia €0 · Carrasqueira +€10
- Évora: sem centro histórico −5% · 1 adega −€25 · 0 adegas −€25 (cada) · Corticarte +€25
- Tomar–Coimbra: sem Tomar −5%
- Fátima–Nazaré–Óbidos: sem Óbidos −5%
- Herança romana: Albergaria dos Fusos +€10

Todos por pessoa. Antes de gravar confirmo a lista exata das 35 linhas na base de dados e ajusto qualquer caso que não encaixe (indico-o no fim).

## Depois
- Gravar os valores com uma nota "Proposto por IA — rever" em cada linha, para poder alterar no Price Map.
- Verificar que os 11 Signatures ficam "Complete" e testar alguns totais no Tailor.
- Não publico nada sem pedir.
