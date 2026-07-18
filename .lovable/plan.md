# Plano cirúrgico — imagens premium reais, sem créditos

## Diagnóstico confirmado
- A mesma fotografia de grupo da adega aparece no cartão **Corporate da homepage** e no primeiro bloco da página **Corporate**.
- A página **Corporate em português** ficou fora da melhoria: ainda usa três imagens antigas fixas, sem variantes responsivas e sem Ken Burns.
- Na página **Corporate em inglês**, as variantes AVIF/WebP terminam em **1280 px**. A fotografia horizontal da sala de barricas é forçada para um enquadramento vertical 4:5; no iPhone DPR 3 fica ampliada e perde nitidez — é o principal problema visível nas capturas.
- O Ken Burns inglês está tecnicamente ativo, mas passa apenas de escala 1.00 para 1.06 em 22–26 segundos. No tempo normal de visualização do bloco, a mudança é quase impercetível. Não existe crossfade.
- **Multi-day** não tem atualmente qualquer Ken Burns/crossfade nas imagens da página. A homepage também não renderiza a antiga tira `GuestMomentsStrip`; as repetições atuais vêm sobretudo dos cartões de ocasiões face às páginas de destino.

## Implementação

### 1. Curadoria sem gerar nada
- Usar exclusivamente as fotografias reais já existentes da proprietária e imagens reais já associadas aos tours/Viator.
- Reservar cada fotografia para um único módulo de conversão: homepage, Corporate, Proposal ou Multi-day.
- Manter a melhor fotografia de grupo na página Corporate e trocar a miniatura Corporate da homepage por uma fotografia real diferente e contextual.
- Retirar dos blocos verticais as fotografias horizontais de adega que exigem crop agressivo; reutilizá-las apenas onde o formato horizontal seja adequado ou removê-las da seleção pública.
- Não criar stock, IA, novas secções, galerias no fundo ou conteúdo decorativo.

### 2. Um componente de imagem cinematográfica para os slots que já existem
- Evoluir o atual `ResponsiveEditorialImage` para suportar uma pequena sequência editorial dentro do mesmo enquadramento existente.
- Mostrar **uma fotografia de cada vez**, com hold calmo, crossfade suave e Ken Burns contínuo (zoom + pan com direção definida por fotografia).
- Nada de carrossel visível, setas, dots ou movimento chamativo; o bloco continua a ocupar exatamente o mesmo espaço.
- Em `prefers-reduced-motion`, mostrar apenas a melhor fotografia estática.

### 3. Corporate EN + PT como uma única experiência visual
- Aplicar a mesma fonte de imagens curadas, variantes responsivas e movimento às páginas inglesa e portuguesa.
- Corrigir particularmente os três slots Corporate: executivo/grupo, off-site e client hosting/VIP.
- Usar enquadramentos próprios por imagem para proteger rostos e grupos no mobile, sem esticar imagens horizontais em retratos altos.

### 4. Homepage, Proposal e Multi-day sem repetição
- **Homepage:** substituir somente as imagens dos cartões existentes que repetem as páginas de destino; sem adicionar a antiga tira de Moments.
- **Proposal:** manter os três blocos existentes, mas atribuir-lhes fotografias exclusivas e sequências coerentes com casal/celebração/família.
- **Multi-day:** aplicar o crossfade ao slot visual já existente do travel file, alternando páginas reais do dossier; sem criar uma faixa fotográfica adicional.
- Remover do admin os conjuntos legacy “Corporate Moments” e “Multi-day Moments” que hoje parecem módulos públicos mas não são renderizados, evitando novas substituições duplicadas por engano.

### 5. Qualidade iPhone premium
- Acrescentar aos `srcSet` a imagem original real quando esta tiver resolução superior às variantes de 1280 px; nunca gerar uma variante acima dos píxeis disponíveis.
- Definir `sizes` reais por slot e carregar apenas a primeira imagem visível com prioridade.
- Evitar upscaling no DPR 3: cada enquadramento terá fonte suficiente para a área efetivamente apresentada; imagens sem altura útil para crop 4:5 não entram nesses slots.

### 6. Bloqueios de regressão e validação visual
- Atualizar o teste de unicidade para cobrir as imagens que são realmente renderizadas na homepage e em todas as páginas afetadas, incluindo paridade EN/PT.
- Testar que cada sequência mostra uma imagem de cada vez, que o crossfade/Ken Burns está ativo e que reduced motion fica estático.
- Validar visualmente em **393×706, DPR 3**, com capturas da homepage, Corporate EN/PT, Proposal e Multi-day; verificar nitidez, rostos, crops, ausência de duplicados e movimento perceptível.

## Limite de custo
- Esta correção não usa geração de imagem, edição por IA, stock pago nem novas chamadas externas. Trabalha apenas com os ficheiros reais que já estão no projeto, portanto **não gasta créditos de imagem**.