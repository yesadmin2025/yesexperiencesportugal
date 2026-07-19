# Correção de paridade entre o trabalho recente e o site publicado

## Diagnóstico confirmado
- `yesexperiencesportugal.com`, `yesexperiencesportugal.lovable.app` e `yesexperiences.pt` estão a servir a mesma publicação; os dois últimos redirecionam para o domínio principal.
- A resposta de produção não está presa num cache antigo (`no-cache`).
- Parte das alterações está publicada no HTML: animações `Scene`, preços “per person”, total do grupo, composição adultos/crianças e mapa sem atribuição Leaflet.
- Contudo, várias melhorias são pouco percetíveis porque aparecem apenas depois de scroll/interação. A criança só surge depois de “Add a child”, e as animações são deliberadamente subtis.
- Existe ainda uma falha real: o Tailor continua a gerar add-ons e alternativas de almoço por palavras-chave, incluindo opções não confirmadas como “Extra wine pairing”, “Photographer”, “Kids’ activity kit”, “Sunset extension” e “Premium tasting menu”. Isto contradiz o plano aprovado e a regra de não inventar.

## Implementação

1. **Eliminar conteúdo Tailor não validado**
   - Remover os add-ons e opções de almoço gerados automaticamente por texto/palavras-chave.
   - Mostrar apenas elementos existentes e confirmados nos dados próprios de cada Signature.
   - Manter necessidades práticas — cadeira de criança, mobilidade, alergias e preferências alimentares — como pedidos de preparação, sem inventar preço ou disponibilidade.

2. **Tornar adultos/crianças e preços imediatamente claros**
   - Rever Signature, Tailor, Studio e checkout para usar o mesmo controlo de composição e a mesma lógica de faixas etárias.
   - No mobile, apresentar “Adults” e “Children” como escolhas explícitas, sem obrigar o utilizador a descobrir uma secção escondida.
   - Após adicionar uma criança, exigir idade e mostrar de imediato a faixa e preço aplicável: infant 0–2, child 3–10, youth 11–17.
   - Manter sempre visíveis “per person”, discriminação por adulto/criança quando aplicável e “Party total”.

3. **Corrigir e simplificar mapa/legenda**
   - Garantir que todos os pontos mostrados vêm exclusivamente do itinerário-fonte de cada Signature.
   - Mostrar as adegas que pertencem à experiência, com marcadores numerados coerentes.
   - Para a experiência de Arrábida, explicar junto da legenda que são visitadas 2 ou 3 adegas conforme a opção escolhida e disponibilidade, sem sugerir que todas são visitadas.
   - Manter removidas todas as marcas “Leaflet / OpenStreetMap / CARTO” da interface visível.

4. **Reforçar contraste e legibilidade mobile**
   - Auditar os cartões de seleção, labels, preços, estados selecionados/desativados e texto sobre imagem no viewport real de 393×706.
   - Corrigir todos os elementos abaixo de WCAG AA e manter alvos táteis mínimos de 44×44.
   - Evitar texto cinzento demasiado leve e dourado funcional com pouco contraste.

5. **Confirmar o sistema de movimento em páginas reais**
   - Verificar Route Fade, Scene, RevealImage, ReadingProgress, itinerários e páginas editoriais em produção.
   - Garantir que os reveals são visíveis ao fazer scroll, sem esconder conteúdo antes do JavaScript e respeitando reduced motion.
   - Ajustar apenas a perceção das animações que estejam impercetíveis, sem ultrapassar o movimento premium e discreto aprovado.

6. **Criar uma verificação de regressão orientada ao que a cliente vê**
   - Adicionar testes mobile para: criança + idade + preço, total do grupo, Tailor sem opções inventadas, mapa sem branding, regra das 2/3 adegas, contraste dos cartões e presença das animações.
   - Manter o check de CSS balanceado e incluir estas verificações no controlo anterior ao build.

7. **Validar a versão publicada rota a rota**
   - Comparar preview e produção nas páginas Signature, Tailor, Studio, checkout, mapa e Local Stories.
   - Produzir uma checklist curta com URL, alteração esperada e evidência verificada, para não voltar a declarar “implementado” apenas porque o código existe.
   - Depois da validação, publicar uma única versão consolidada.