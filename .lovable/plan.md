# Cadastro central de experiências do Studio

## Objetivo
Criar uma página administrativa única onde cada experiência real possa ser configurada com duração, horários e preço. Depois de guardar, o Studio passa a usar automaticamente esses dados na composição, no horário apresentado e no total enviado para pagamento.

## O que será construído
- Uma área “Experiências do Studio” no painel, preparada primeiro para telemóvel, com pesquisa e filtro por região.
- Uma ficha por experiência com:
  - duração em minutos;
  - janela de funcionamento (hora inicial e final);
  - sessões fixas opcionais;
  - preço e forma de cobrança (por pessoa, grupo, veículo ou valor fixo);
  - mínimo de participantes;
  - estado ativo/inativo e nota interna.
- Estados claros: completa e disponível, incompleta, inativa, alteração por guardar e guardada.
- Validação antes de ativar: preço positivo, duração válida, horários coerentes e sessões dentro da janela quando ambas existirem.

## Funcionamento automático no Studio
- A base de dados será a fonte única para preço, duração e horários das experiências editáveis.
- O Studio carregará apenas experiências ativas e com cadastro comercial completo.
- A duração cadastrada entrará no cálculo da sequência e da viabilidade do dia.
- A janela e/ou sessões fixas limitarão os horários possíveis sem inventar disponibilidade.
- O preço cadastrado alimentará o resumo visível e será novamente validado no servidor antes do pagamento.
- Depois de guardar no painel, as listas em memória serão atualizadas imediatamente, sem exigir nova publicação nem alteração do sitemap.

## Segurança e integridade
- O painel completo e as alterações serão exclusivos de administradores autenticados.
- Visitantes receberão apenas os campos públicos necessários das experiências ativas.
- O checkout continuará a falhar de forma segura se uma experiência estiver inativa, incompleta ou tiver sido alterada durante a reserva.
- Nenhuma experiência, preço, horário ou disponibilidade será inventado ou preenchido automaticamente.

## Implementação técnica
- Evoluir o catálogo existente de momentos componíveis, em vez de criar um segundo cadastro concorrente.
- Adicionar campos estruturados de duração, início/fim e sessões fixas, com restrições na base de dados e histórico de atualização.
- Centralizar leitura e escrita em funções protegidas, mantendo as permissões atuais por função administrativa.
- Atualizar a autoridade de composição do Studio e o cálculo do servidor para consumirem a mesma linha publicada.
- Manter os preços das 12 Signature no editor de escalões existente; esta nova ficha governa as atividades que o Studio pode compor.

## Validação
- Testar criação, edição, desativação e rejeição de dados inválidos.
- Confirmar atualização imediata no Studio e igualdade entre preço apresentado e preço cobrado.
- Confirmar duração e horários em jornadas reais, incluindo janela, sessões fixas e combinação de ambos.
- Verificar a página a 393 px e desktop, sem texto cortado ou controlos sobrepostos.
- Executar testes de permissões, tipos, regressão do Studio e fluxo de reserva.