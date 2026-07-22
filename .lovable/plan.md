# Desbloquear checkout live

## Acção única
Apagar o secret **`STRIPE_RESTRICTED_API_KEY`** (contém `rk_live_…3zjwUm`, já expirada).

Efeito: `supabase/functions/_shared/stripe.ts` passa a cair no fallback `STRIPE_LIVE_API_KEY` (a `sk_live_…` válida, já guardada). Sem alterações de código, sem redeploy.

## Verificação imediata
1. Nova probe live a `create-signature-checkout` — deve devolver `url: https://checkout.stripe.com/c/pay/cs_live_…` em vez do erro `Expired API Key`.
2. Reportar PASS por fluxo (Signature / Tailored / Studio V3 — todos usam a mesma edge function, portanto passam em conjunto).

## Próximo passo do teu lado (fora deste plano)
1 reserva real de €1 em `/tours/arrabida-wine-allinclusive` para confirmar `checkout.session.completed` no `/admin` e uma linha nova em `bookings`.

## Fora de âmbito
- Rotação de chaves Stripe (fica para depois do teste real, como combinado).
- DNS de `notify.yesexperiencesportugal.com` (assunto separado).
