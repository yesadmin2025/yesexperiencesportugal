# Plano de recuperação do checkout

Não precisas de fazer mais tentativas agora. Os dados confirmam que a Stripe já consegue chegar ao sistema: um evento real `payment_intent.processing` foi verificado. O vermelho atual é sobretudo um falso negativo do teste sintético, porque o site e a função de webhook estão a ler cópias diferentes da signing secret.

## 1. Corrigir o diagnóstico do webhook
- Remover a dependência do teste atual entre dois ambientes com cópias separadas da signing secret.
- Executar a assinatura e verificação sintética no mesmo ambiente do webhook.
- Manter os eventos reais da Stripe como sinal principal de saúde.
- No admin, separar claramente:
  - endpoint a receber eventos reais;
  - assinatura válida;
  - último `checkout.session.completed`;
  - processamento da reserva;
  - envio dos emails.
- Um teste sintético indisponível deixará de transformar um evento real verificado num estado geral vermelho.

## 2. Fechar o fluxo de reserva
- Rever todos os checkouts Signature, Tailor, Studio e Builder.
- Corrigir o Builder para aceitar os domínios atuais `yesexperiencesportugal.com` e `www.yesexperiencesportugal.com`; neste momento a allowlist dessa função ainda contém apenas os domínios antigos e Lovable.
- Confirmar que `checkout.session.completed` pago cria ou atualiza exatamente uma reserva, com idempotência por sessão Stripe.
- Registar no webhook o resultado de cada etapa: evento verificado, pagamento confirmado, reserva persistida e notificação solicitada.

## 3. Recuperação operacional no admin
- Mostrar eventos pagos verificados que ainda não produziram uma reserva.
- Adicionar uma ação segura para reprocessar um evento concluído sem duplicar a cobrança nem a reserva.
- Adicionar reenvio de confirmação ao cliente e de notificação à equipa, também idempotente.

## 4. Desbloquear os emails
- O domínio `notify.yesexperiencesportugal.com` continua pendente; os envios estão a falhar com `403`, portanto nem o cliente nem a equipa recebem mensagens.
- Concluir a verificação em **Project Settings → Email** com os registos já atribuídos ao domínio.
- Depois da verificação, repetir os emails falhados através da ação de recuperação, sem repetir pagamentos.

## 5. Validação final
- Executar um checkout controlado e confirmar, por esta ordem:
  1. sessão Stripe criada;
  2. pagamento concluído;
  3. `checkout.session.completed` verificado;
  4. reserva criada com cliente, data, viajantes e valor;
  5. email do cliente entregue;
  6. email interno entregue;
  7. admin totalmente verde.
- Testar também falha, repetição do webhook e reprocessamento para garantir ausência de duplicados.

## 6. Segurança após estabilização
- Rodar a chave `sk_live` que apareceu nas imagens.
- Atualizar a chave segura e repetir apenas o ping da conta e a validação final, sem alterar novamente a signing secret que estiver funcional.