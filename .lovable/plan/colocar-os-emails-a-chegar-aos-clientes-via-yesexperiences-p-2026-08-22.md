# Colocar os emails a chegar aos clientes via yesexperiences.pt

## Situação

O código já envia a partir de `notify.yesexperiences.pt`. Falta apenas registar esse domínio para email e adicionar 3 registos no DNS do `yesexperiences.pt` (que controla). O `info@yesexperiencesportugal.com` mantém-se como email público de contacto e como endereço de resposta — nada muda no site.

## Passos

1. **Registar o domínio de email** `yesexperiences.pt` (abro o assistente; recebe os registos exactos).
2. **Você adiciona 3 registos** no gestor de DNS do `yesexperiences.pt`:
   - TXT em `_lovable-email`
   - NS em `notify` (dois valores `nsX.lovable.cloud`)
   Os valores exactos aparecem no assistente — não invento valores de memória.
3. **Verificação** — confirmo o estado assim que propagar.
4. **Infraestrutura de email** reprovisionada para o novo domínio (filas, log de envios, supressões, processador).
5. **Reply-to explícito**: todos os emails passam a responder para `info@yesexperiencesportugal.com`, mesmo enviando tecnicamente pelo `.pt`.
6. **Desligar o remetente temporário** (fallback em modo de teste) assim que o envio real funcionar.
7. **Reenviar tudo o que ficou parado** (reserva de hoje, welcome, desenhos do Studio, alertas internos) a partir da fila de emails diferidos.
8. **Teste final**: um desenho no Studio + um checkout de teste, confirmando no log `sent` para o cliente e para as duas moradas da equipa.

## Notas técnicas

- Remetente: `noreply@notify.yesexperiences.pt`; reply-to `info@yesexperiencesportugal.com`.
- Fallback: `EMAIL_USE_RESEND_FALLBACK` desligado no fim.
- Reenvio: endpoint de drenagem já existente sobre `email_deferred_sends`.
- O site e os domínios web continuam exactamente como estão.

## Critérios de aceitação

- `notify.yesexperiences.pt` verificado e activo.
- Emails a clientes aceites pelo fornecedor (sem rejeições no log).
- Respostas dos clientes chegam a `info@yesexperiencesportugal.com`.
- Emails parados das últimas 48h entregues.
