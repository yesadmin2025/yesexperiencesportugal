# Reposição visual do branding YES aprovado

## Objetivo

Recuperar **apenas a apresentação visual aprovada** do hero e dos Five Ways, sem regressar o projeto inteiro e sem tocar em reservas, preços, pagamentos, fotografias carregadas, administração, SEO, rotas ou lógica de negócio.

## Diagnóstico confirmado

- O hero atual envolve cada linha do título numa máscara com corte; a medição real mostra texto a exceder ligeiramente a caixa no desktop, o que explica letras Fraunces cortadas.
- Os Five Ways atuais usam uma composição assimétrica muito fragmentada, com proporções e alturas diferentes, e deixaram de transmitir a unidade editorial anteriormente aprovada.
- A base correta continua disponível: Fraunces + Inter, ivory/sand/teal/gold/charcoal, fotografias atuais dos cinco caminhos e os componentes editoriais partilhados.

## 1. Recuperar a referência aprovada, sem “desfazer” o site

- Identificar no histórico a última apresentação aprovada anterior à alteração dos cartões.
- Recuperar dessa versão apenas a composição, espaçamento, tipografia, superfícies e movimento do hero e dos Five Ways.
- Reaplicar esses valores seletivamente no código atual, preservando todo o trabalho funcional posterior.

## 2. Hero: corrigir cortes e restaurar a assinatura

- Manter a fotografia/vídeo e o texto atuais.
- Restaurar a hierarquia aprovada: primeira linha ivory em Fraunces regular; ênfase gold-soft em Fraunces italic, com peso 400.
- Retirar máscaras rígidas e `overflow` que cortam ascendentes, descendentes e itálicos.
- Dar às duas linhas espaço vertical real e alinhamento seguro em 393px, tablet e desktop.
- Usar entrada sequencial suave e cinematográfica, sem bounce, loops ou efeitos adicionais; movimento reduzido mostra imediatamente o estado final.
- Confirmar que título, apoio e ações cabem no primeiro ecrã mobile sem colisões.

## 3. Five Ways: voltar ao capítulo editorial aprovado

- Recuperar a superfície editorial ivory/sand e o ritmo de leitura anterior, em vez da atual sensação de grelha fragmentada.
- Manter as cinco fotografias atuais e a fotografia de casal em Proposals.
- Repor a descrição, escala e mistura tipográfica editorial aprovadas: título Fraunces, ênfase itálica pontual, texto Inter e ações discretas em teal.
- Recuperar uma composição coerente entre os cinco caminhos, com proporções de imagem consistentes e leitura clara no telemóvel.
- Manter os riscos dourados laterais animados junto ao eyebrow; não reintroduzir riscos decorativos sob títulos.
- Manter os cartões inteiros clicáveis, os nomes de ação visíveis e a seta canónica.
- Preservar a hierarquia comercial: Studio, Signature e Travel Designer primeiro; Moments e Corporate como caminhos especializados.

## 4. Fundos e continuidade da homepage

- Verificar a passagem do hero para os Five Ways e destes para a secção seguinte.
- Usar apenas ivory e sand nas superfícies claras, sem branco frio nem novos tons.
- Ajustar espaçamento para os Five Ways voltarem a parecer parte da mesma marca, não um módulo independente.
- Não alterar o mapa; apenas confirmar que a sua apresentação continua coerente com a paleta restaurada.

## 5. Guardas de regressão

- Adicionar verificações específicas para impedir novamente:
  - cortes em títulos Fraunces e itálicos;
  - máscaras rígidas sobre headings;
  - fontes fora de Fraunces/Inter;
  - fundos fora da paleta YES;
  - perda das cinco ações ou das fotografias;
  - movimento contínuo ou bounce.

## Validação final

- Rever visualmente a homepage completa em 393×852, 768×1024 e 1280×800.
- Testar fontes lentas, 200% de texto, movimento reduzido e carregamento progressivo das cinco imagens.
- Confirmar zero letras cortadas, zero overflow, zero sobreposição com menu/WhatsApp e ações mínimas de 44px.
- Comparar lado a lado com a versão aprovada recuperada do histórico.
- Percorrer hero, Five Ways, mapa e a transição para Signature antes de publicar.

## Fora de escopo

Nenhuma alteração a preços, inventário, reservas, Stripe, checkout, tour facts, fotografias escolhidas, base de dados, SEO, URLs, conteúdo administrativo ou lógica do Studio/Tailor.
