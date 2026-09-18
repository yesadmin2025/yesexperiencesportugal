# Plano de conversão — CTAs, movimento premium e reserva mobile

## Objetivo
Criar um sistema único e reconhecível de decisão em todo o site: inspirar, orientar, reservar e pagar sem hesitação. O resultado deve parecer contemporâneo e distinto, mas calmo — movimento com propósito, nunca decoração.

Não existe uma forma honesta de garantir “conversão máxima”. O objetivo será eliminar fricção, tornar cada próximo passo inequívoco e medir onde as pessoas avançam ou desistem.

## O que a auditoria confirmou
- Já existe um botão principal comum, com estados de carregamento, erro, foco e movimento reduzido.
- Ainda existem textos diferentes para a mesma ação, como “Start Your Experience”, “Design your own” e “Explore Signature Tours”, embora o vocabulário oficial já esteja definido.
- Os cartões de experiências já usam “See dates & reserve” e “Tailor this day”, mas a hierarquia e o comportamento não são ainda uniformes em todas as páginas editoriais.
- No Tailor, a data só é guardada depois da validação. Ao escrever uma data manualmente, um valor ainda incompleto pode ser rejeitado antes de terminar — o mesmo problema já foi corrigido no formulário Signature, mas não neste fluxo.
- Studio tem duas apresentações diferentes do calendário. Ambas usam dias com 44 px, mas os invólucros, margens e fundos divergem, criando risco de linhas, recortes ou desalinhamento a 393 px.
- As linhas para idades das crianças usam várias colunas fixas encaixadas; podem comprimir o texto em ecrãs estreitos.
- A confirmação final já separa dados essenciais dos opcionais e conduz ao pagamento, mas precisa de validação visual e funcional conjunta em Signature, Tailor e Studio.

## 1. Hierarquia global dos CTAs
Definir quatro níveis visuais e aplicá-los por intenção, não por página:

1. **Ação principal de compra** — botão teal sólido, largura total no mobile quando inicia ou confirma uma decisão.
2. **Alternativa real** — ação editorial discreta; nunca competir em peso com a compra.
3. **Descoberta** — link editorial com seta para coleções, artigos e contexto.
4. **Apoio** — WhatsApp/contacto visível, mas nunca como ação principal num produto reservável.

Regras por superfície:
- **Navegação e início:** “Design your day” como ação principal; “Explore Signature Experiences” como alternativa.
- **Cartões de experiência:** “See dates & reserve” como ação de maior intenção; “Tailor this day” como alternativa clara.
- **Página de experiência:** “Reserve this day” primeiro; “Tailor this day” segundo. Ambos levam ao passo certo, sem scroll confuso.
- **Tailor:** uma única ação principal, “Reserve this day”, acompanhada por preço total, data e grupo.
- **Studio:** “Design your day” na entrada e “Love this day · Reserve it” apenas na revelação final.
- **Travel Designer, Moments e Corporate:** manter exatamente o vocabulário oficial já aprovado.
- **Artigos e destinos:** uma ação contextual para a experiência mais relevante e uma alternativa de descoberta; evitar três escolhas concorrentes no mesmo bloco.

Substituir variações não oficiais pela linguagem canónica e ampliar os testes automáticos para impedir que reapareçam.

## 2. Aparência e animação “cutting edge” com contenção
A direção recomendada é **editorial cinética**: precisão, profundidade tátil e resposta imediata, sem brilho contínuo ou movimento gratuito.

### Botão principal
- Entrada única e subtil quando chega ao ecrã: opacidade + deslocação vertical curta.
- Seta faz uma única indicação de direção e depois fica quieta.
- Em toque: compressão imediata e curta; em desktop: elevação máxima de 1–2 px e seta desloca-se.
- Carregamento substitui a seta por progresso sem mudar a largura do botão.
- Erro mantém o botão no lugar e mostra contorno/mensagem junto ao campo responsável; evitar tremores repetidos.

### Botão secundário e links editoriais
- Linha dourada desenha-se ou encurta suavemente; seta avança 3–4 px.
- Sem glow, magnetismo, respiração infinita ou animações concorrentes fora do Hero.

### Ritmo
- 140–200 ms para toque, foco e mudança de estado.
- 300–450 ms para revelar formulários, resumos e painéis.
- 700–1000 ms apenas no Hero e em raras mudanças de capítulo.
- Respeitar sempre a preferência por movimento reduzido.

A limpeza inclui remover código de efeitos antigos já neutralizados, para existir uma única gramática de movimento e não várias camadas contraditórias.

## 3. Cartões orientados à conversão
Uniformizar os cartões de experiências, destinos e artigos:
- Imagem e título continuam a abrir os detalhes; a ação de reserva fica visualmente explícita.
- Mostrar apenas factos úteis antes do CTA: destino, duração, preço real “from” e prova verificada quando existe.
- Alinhar a zona inferior dos cartões para que preço e ações ocupem posições previsíveis, mesmo com títulos diferentes.
- No mobile, ações em coluna ou quebra controlada; nunca duas frases comprimidas na mesma linha.
- Estados de foco e toque em toda a área clicável, com alvos mínimos de 44 px.
- Nada de adicionar urgência, disponibilidade ou prova social inventada.

## 4. Reparação do Tailor no mobile
Transformar o Tailor numa sequência simples, mantendo a lógica atual:

```text
Data e grupo
    ↓
Momentos
    ↓
Ritmo
    ↓
Melhorias
    ↓
Resumo fixo e discreto
    ↓
Dados essenciais → pagamento
```

Alterações previstas:
- Guardar sempre o que a pessoa escreve no campo de data; validar apenas quando a data estiver completa.
- Usar as regras reais de cada experiência para data mínima, dias operacionais e bloqueios.
- Mostrar o erro junto à data e levar o foco ao campo, em vez de depender apenas de uma notificação temporária.
- No mobile, apresentar data e grupo numa coluna, com bordas contínuas e espaçamento consistente.
- Reestruturar linhas de momentos, extras e idades para conteúdo flexível; a ação “Add/Remove/Undo” nunca deve empurrar texto ou linhas para fora.
- Fazer o resumo “Your version” aparecer no momento certo: após as escolhas, com preço, grupo e data imediatamente antes do CTA; manter fixo apenas quando houver espaço seguro.
- Se a data faltar, tocar em “Reserve this day” deve levar à data e explicar o que falta; não abrir uma etapa incompleta.
- Rever o formulário Tailor antigo que envia por WhatsApp: se ainda estiver ativo, aplicar as mesmas regras de disponibilidade; se estiver obsoleto, deixar de o usar para evitar dois comportamentos diferentes.

## 5. Unificar calendários e disponibilidade
Criar uma única apresentação mobile do calendário reutilizada por Studio e demais fluxos adequados:
- largura calculada para caber integralmente a 320–393 px;
- dias e navegação com pelo menos 44 × 44 px;
- grelha, cabeçalho, linhas e bordas alinhados no mesmo eixo;
- estados claros para selecionado, indisponível, bloqueado e data mínima;
- sem calendário claro encaixado dentro de uma moldura escura incompatível;
- mensagem de disponibilidade colocada junto ao calendário, não afastada do controlo.

Signature e Tailor podem manter o seletor nativo quando isso for mais rápido no telefone, mas terão a mesma validação, mensagens e tratamento de datas incompletas. A lógica de disponibilidade permanece a fonte de verdade existente; não se alteram calendários, bloqueios ou regras comerciais.

## 6. Dados do cliente e passagem ao pagamento
Afinar o último passo para reduzir abandono:
- Resumo compacto e editável de data + grupo no topo.
- Campos essenciais primeiro: nome, email, telefone/WhatsApp e recolha.
- Informações opcionais continuam recolhidas atrás de “Anything we should know?”.
- Teclados mobile corretos, texto de 16 px, preenchimento automático e erros junto de cada campo.
- CTA final sempre visível no rodapé do painel, sem ficar tapado pelo teclado, cookies ou barras fixas.
- Preço total e confiança de pagamento junto de “Continue to payment”.
- Estados imediatos para carregamento, erro, tentativa repetida e pagamento recusado; impedir duplo toque.
- Preservar todos os dados quando o checkout falhar ou a pessoa voltar atrás.

## 7. Medição para melhorar conversão de verdade
Usar o rastreio já existente e completar os pontos de decisão:
- impressão e clique por CTA, página e posição;
- início da escolha de data, data válida, erro de disponibilidade e grupo completo;
- abertura e conclusão dos dados pessoais;
- checkout aberto, falhou, retomado e pagamento concluído;
- separação por origem orgânica, dispositivo e fluxo: Signature, Tailor e Studio.

O painel deve mostrar o funil:

```text
Visita → CTA → data válida → dados completos → checkout → pagamento
```

Comparar primeiro a base atual durante 2–4 semanas. Depois testar uma alteração de cada vez — por exemplo, hierarquia do cartão ou posição do resumo — sem variar preços, inventário ou copy essencial em simultâneo.

## 8. Validação antes de publicar
### Mobile primeiro
Testar 320, 360 e 393 × 852 px:
- todas as páginas com CTAs de venda;
- todas as 12 experiências;
- Tailor com datas digitadas e escolhidas;
- Studio nos dois caminhos que apresentam calendário;
- 1–12 adultos, crianças sem idade e com idades longas/variadas;
- teclado aberto, orientação vertical e textos longos;
- sem scroll horizontal, cortes, sobreposição ou linhas desalinhadas.

### Fluxos completos
- data válida, passada, bloqueada, dia fechado e aviso mínimo;
- erro lento/indisponibilidade de rede;
- dados incompletos e correção sem perder escolhas;
- Signature → Stripe, Tailor → Stripe e Studio → Stripe;
- sucesso, recusa, repetição e retorno à confirmação;
- email e reserva no painel após pagamento.

### Qualidade
- testes automáticos para vocabulário, tamanho dos alvos, overflow real do calendário, escrita parcial da data e paridade visual;
- acessibilidade por teclado, foco visível, contraste e movimento reduzido;
- desktop/tablet depois da aprovação mobile;
- publicação apenas depois de todos os bloqueios de compra e regressões visuais estarem resolvidos.

## Ordem recomendada
1. Corrigir data, overflow e hierarquia do Tailor.
2. Unificar calendário e campos partilhados.
3. Normalizar CTAs e cartões em todo o site.
4. Consolidar a gramática de animação.
5. Validar os três percursos até ao pagamento.
6. Completar medição, observar a base e iniciar testes controlados.

## Limites preservados
Não alterar preços, inventário, datas bloqueadas, itinerários, regras de cancelamento, lógica Stripe, estrutura de dados, rotas ou factos das experiências. Não publicar durante a implementação sem pedido explícito.
