# Plano — transformar o Studio no melhor builder

## Testes feitos agora

1. **Preview mobile 393×587 em `/studio-v3`**
   - Intro abre corretamente.
   - O fluxo chega a Feeling e Destination.
   - Ao escolher **Wine & food**, o Studio avança para a fase seguinte, mas o beat anterior continua por cima durante vários segundos.
   - Resultado: o utilizador vê a próxima pergunta, tenta tocar, e o overlay invisível/ativo intercepta o clique. Isto explica a sensação de “erro”, lentidão e pouco progresso.

2. **Preview mobile em `/builder`**
   - O entry point não é claro: o Builder antigo redireciona para Studio, mas a experiência continua a parecer uma sequência de perguntas, não um builder vivo.

3. **Testes unitários existentes**
   - `curation-quality.test.ts` passou.
   - `phase-shell-anticipation.test.tsx` passou.
   - Ou seja: os snapshots básicos passam, mas não cobrem o problema real de UX/interação.

## Diagnóstico principal

O problema não é só visual. É estrutural:

```text
Escolha do cliente
  → beat cinematográfico longo
  → próxima fase já aparece por baixo
  → overlay continua ativo e bloqueia toques
  → utilizador tenta avançar e sente erro / atraso / sobreposição
```

Além disso:
- O Studio ainda parece demasiado “formulário com animações”.
- O mapa ainda não se torna o centro da criação cedo o suficiente.
- A curadoria de vinho ainda depende demasiado de sinais específicos e pode falhar quando o perfil diz “wine & food” mas a rota base/stop pool não reforça adega/quinta.
- O reveal final não cria um momento de certeza; ainda parece summary, não “a tua viagem nasceu”.
- O fluxo de data precisa ser validado em mobile real com o overlay corrigido, porque neste teste o bloqueio apareceu antes de eu conseguir completar o caminho com estabilidade.

## Objetivo de produto

Transformar o Studio num **builder cinematográfico vivo**:

- menos sensação de questionário;
- mais sensação de criação em tempo real;
- mapa e rota a responderem imediatamente;
- resultado fiel ao perfil;
- zero overlays a bloquear interação;
- reveal final com impacto emocional e confiança operacional.

## Fase 1 — Corrigir fricção crítica de interação

**Prioridade máxima.** Antes de melhorar estética, o Studio tem de ser tocável.

### O que corrigir

- Refatorar `playReaction` em `StudioV3.tsx` para impedir que a próxima pergunta fique visível enquanto o overlay ainda bloqueia toques.
- Escolher um destes padrões:
  - **Padrão recomendado:** overlay termina primeiro, depois a próxima fase entra limpa.
  - Alternativa: overlay vira `pointer-events-none` depois do primeiro segundo, mas isto é menos elegante.
- Reduzir beats longos onde não são essenciais:
  - direção, companhia, ocasião, data: ~1600–2200ms;
  - mapa/interesses/rhythm: podem manter mais impacto, mas com saída clara.
- Adicionar teste E2E para garantir que após uma escolha o próximo botão fica clicável sem interceptação.

### Resultado esperado

O utilizador nunca vê uma fase que ainda não pode tocar.

## Fase 2 — Data sem erro e sem armadilha mobile

### O que corrigir

- Substituir o input de data invisível por um controlo mobile mais robusto:
  - botão visual + input nativo visível o suficiente para ser fiável;
  - sem `showPicker()` obrigatório;
  - sem overlay opaco que crie dead zones.
- Criar teste E2E específico:
  - chegar à fase Date;
  - selecionar data futura;
  - confirmar que avança para Pickup;
  - confirmar ausência de console/page errors.

### Resultado esperado

Escolher data nunca bloqueia o Studio.

## Fase 3 — Curadoria fiel ao perfil, sem paragens repetidas

### O que corrigir

- Em `curation.ts`, tratar **feeling = wine-food** como sinal forte de vinho, mesmo que o utilizador ainda não tenha escolhido `interest: wine`.
- Garantir pelo menos uma paragem real de vinho/adega/quinta/tasting quando o perfil indicar vinho por:
  - feeling `wine-food`;
  - interest `wine`;
  - destination `alentejo-evora-wine` ou `arrabida-setubal-azeitao`.
- Melhorar deduplicação sem inventar paragens:
  - normalizar acentos;
  - remover sufixos como “winery”, “adega”, “palace”, “tasting”, “visit”;
  - evitar pares que soem iguais, tipo “Bacalhôa” + “Bacalhôa Palace & Winery”.
- Adicionar testes para combinações reais:
  - Wine & food + casal + Arrábida;
  - Wine & food + Alentejo;
  - Hidden + wine interest;
  - Gastronomy sem wine não deve forçar adega se não fizer sentido.

### Resultado esperado

Se o cliente escolhe vinho, a rota mostra vinho. Sem repetições e sem fantasia.

## Fase 4 — Mapa como criação, não decoração

### O que corrigir

- A silhueta de Portugal deve reagir no momento certo:
  - pulse ativa imediatamente após `destinationIntent` quando existe;
  - se não houver destino explícito, usa inferência suave por feeling/pickup, mas visualmente mais discreta.
- Levar o mapa mais cedo para mobile:
  - não como painel pesado;
  - como “route pulse” leve: origem, região provável, 2–3 pins fantasma.
- Reduzir re-render do `PortugalSilhouette`:
  - memoização já existe;
  - completar com props estáveis via `useMemo` em `StudioV3.tsx`;
  - evitar recriar objetos de anticipation em cada render sem necessidade.

### Resultado esperado

O cliente sente que Portugal se está a desenhar à frente dele, não que só vê mapa no fim.

## Fase 5 — Resolver texto sobreposto e ritmo mobile

### O que corrigir

- Rever `PhaseShell` para mobile pequeno:
  - top progress deve ocupar espaço real ou ficar mais discreto;
  - conteúdo não pode começar por baixo de progress/painéis;
  - CTA/help inferior não pode competir com escolhas.
- Rever `LivingJourneyPanel`:
  - em mobile, deve ser colapsado ou aparecer apenas depois da escolha principal;
  - nunca sobrepor header/pergunta.
- Adicionar teste visual/DOM para iPhone SE-height:
  - sem elementos interativos sobrepostos;
  - sem botão oculto atrás de overlay.

### Resultado esperado

O Studio respira em ecrãs pequenos e deixa de parecer apertado.

## Fase 6 — Reveal final com impacto

### O que construir

- Antes do storyboard, criar um momento de composição final:

```text
A rota fecha.
O dia ganha nome.
A assinatura aparece.
```

- O reveal deve mostrar primeiro:
  - título da jornada;
  - mapa/rota curta;
  - 3 razões pelas quais foi escolhido para aquele perfil;
  - uma paragem hero real.
- Só depois aparecem detalhes, refinamento e CTA.
- A copy deve explicar a fidelidade ao perfil, sem texto genérico.

### Resultado esperado

O fim parece uma criação personalizada, não uma página de resumo.

## Fase 7 — Test suite mínima obrigatória

Criar/atualizar testes que protegem os pontos que falharam:

1. **E2E mobile Studio happy path**
   - Intro → Guided → Wine & food → Arrábida → Couple → Date → Pickup → Wine → Rhythm → Reveal.

2. **Overlay safety test**
   - Depois de cada beat, nenhum overlay ativo pode bloquear a próxima escolha.

3. **Date test**
   - Data futura avança sem erro.

4. **Curation tests**
   - Wine profile inclui adega/quinta/tasting real.
   - Sem paragens duplicadas semanticamente.
   - Stops ficam dentro das fontes reais permitidas.

5. **Layering test**
   - Anticipation acima do wash e abaixo do conteúdo continua protegido.

## Ordem de implementação recomendada

```text
1. Overlay/interação crítica
2. Date mobile
3. Curadoria vinho + dedupe
4. Texto/spacing mobile
5. Mapa/pulse antecipado
6. Reveal final
7. Testes E2E completos
```

## Critério de aceitação

Só considero esta fase resolvida quando:

- consigo completar o fluxo inteiro em mobile sem clique bloqueado;
- escolher vinho gera pelo menos uma paragem real de vinho/adega/quinta quando fizer sentido;
- não há stops repetidos semanticamente;
- a data avança sem erro;
- o reveal final mostra claramente “isto foi feito para mim”;
- há testes a proteger estas regressões.