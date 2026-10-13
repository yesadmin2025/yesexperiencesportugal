# Studio: entrada mais suave, reveal mobile, pagamento e fecho da auditoria SEO

## Diagnóstico atual
Hoje o Studio abre em **Logística**: data exata, zona de recolha e número de pessoas, num só ecrã. É o passo mais "compromisso" de todo o fluxo, e aparece primeiro. Só depois vêm Sentimento, Quem viaja, Interesses e Ritmo.

## 1. Nova ordem de entrada (mais emocional, menos compromisso)
Nova ordem:

```text
Feeling (o que quer sentir)  ->  Who (casal, família, amigos, negócios)
->  Interests  ->  Rhythm  ->  Logistics (data, recolha, pessoas)  ->  Your Day (reveal)
```

- A primeira pergunta passa a ser "o que quer sentir hoje", com as opções que já existem. Não há texto novo.
- A data, a recolha e o grupo aparecem **antes do reveal**, porque o dia mostrado tem de poder ser reservado de imediato. Isto mantém a regra de checkout instantâneo.
- Os botões "Back" e os passos guardados de visitas anteriores continuam a funcionar.
- Os preços, as regras de reserva e a forma como o dia é composto ficam iguais.

## 2. Teste completo em modo teste (393px e desktop)
- Percorrer 3 perfis (vinho, património, família) até ao reveal e ao pagamento, com cartão de teste 4242.
- Confirmar que:
  - o pagamento abre e é concluído;
  - a reserva fica criada como paga;
  - a página de confirmação aparece;
  - o email é enviado;
  - a conversão aparece no relatório da administração.
- Se o pagamento falhar, corrijo apenas o ponto exato que falha e repito o teste.

## 3. Reveal no telemóvel
- Verificar:
  - o botão de reservar fica sempre visível e não é tapado pela barra fixa;
  - os toques têm pelo menos 44px;
  - há contraste suficiente;
  - nada fica cortado de lado;
  - leitores de ecrã anunciam o dia;
  - o movimento reduzido é respeitado.
- Corrigir só o que falhar, sem redesenhar.

## 4. Fechar a auditoria SEO
- Publicar as melhorias já feitas: homepage mais rápida, cartões de Experiences estáveis e texto visível no Studio. Só publico com a sua confirmação no fim.
- Depois de publicar, medir a velocidade real da homepage.
- Melhorar o título e a descrição do guia "What to do in Sesimbra" com factos que já estão no guia. Proponho 2 opções.
- Corrigir o registo de 17 reservas pagas que não têm o estado de pagamento preenchido. Só altero o estado, nada mais.
- O FAQ e o Studio aparecem no Google como "Soft 404". Para isso, o pedido de indexação tem de ser feito por si no Search Console. Deixo os passos.

## Detalhes técnicos
- Ordem das fases em `STUDIO_V3_PHASE_ORDER` (`curation.ts`): mover `logistics` para depois de `rhythm` e antes de `refinement`/`storyboard`. Ajustar `getNextPhase`, `prevPhase` e a entrada inicial em `StudioV3.tsx`.
- Atualizar os testes que fixam a ordem e o teste e2e `studio-v3-walk-to-reveal`.
- Pagamento: confirmar `create-signature-checkout` (HTTP 200, `clientSecret`), o webhook e o evento `secure_confirm`.
- Backfill de `payment_status` com SQL só para reservas que têm uma sessão `cs_live_` paga.
