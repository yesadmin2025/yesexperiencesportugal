# Plano: Studio e checkouts sem confusão, a converter em mobile

Objetivo: o que o cliente escolhe é exatamente o que vê no final, no resumo e no pagamento. Cada checkout do site deve ser rápido, claro e de confiança a 393px. Preços, Stripe, regras de reserva e dados dos tours ficam iguais.

## Fase 1 — Diagnóstico confirmado (antes de mexer)
- Percorrer no telemóvel 9 perfis do Studio e registar, para cada um: escolhas feitas, paragens do itinerário, "Incluído" na revelação, no resumo e no que segue para o pagamento.
- Confirmar no código a origem de cada lista "Incluído" (revelação, resumo, dados do hóspede) e onde divergem.
- Medir o abandono por passo (últimos 30 dias): entrada → sentimento → quem → interesses → ritmo → logística → o seu dia → data/recolha → dados → pagamento. Separar telemóvel e computador.
- Repetir para Signature, Tailor e `/book`.
Resultado: lista curta das falhas reais, com a causa de cada uma.

## Fase 2 — Uma única verdade para "o que está incluído"
- Uma só lista de inclusões, gerada a partir do dia composto (paragens que ficaram, provas, almoço, transporte, guia), usada na revelação, no resumo, nos dados do hóspede e no registo da reserva.
- Paragens fechadas ou retiradas nunca aparecem.
- Só inclusões verificadas no conteúdo dos tours; nada inventado.
- Teste automático: escolhas → paragens → inclusões iguais em todos os ecrãs.

## Fase 3 — Studio em mobile: menos esforço, mais certeza
- Rever os passos com maior abandono (sobretudo data e recolha): menos texto, escolhas maiores, datas disponíveis visíveis logo, recolha "definir depois" em destaque.
- Revelação final: título do dia, 3 a 5 paragens, preço total claro, um só botão principal "Love this day · Reserve it"; secundário discreto "Enviar este dia para o meu WhatsApp" para quem precisa de partilhar.
- Dados do hóspede: só campos essenciais, resumo recolhido (regra já guardada), erros claros junto ao campo.
- Quando não há dia reservável: "Try another date" com datas válidas, sem becos sem saída.

## Fase 4 — Restantes checkouts
- Signature, Tailor e `/book`: mesmo resumo (data, pessoas, inclusões, cancelamento, pagamento seguro), botão fixo visível, sem duplo clique, abertura rápida do Stripe.
- Página de Contacto: atalho no topo para reservar já (Signature/Studio) e WhatsApp para datas em menos de 48h, sem retirar o formulário.

## Fase 5 — Medição e verificação
- Eventos de abandono sem dados pessoais em cada passo novo, visíveis no painel do funil.
- Teste no telemóvel de todos os fluxos até ao formulário Stripe em modo de teste, sem pagamento.
- Testes automáticos, análise de segurança e só depois pedido de publicação.

## Fora de âmbito
Preços, regras de reserva, lógica do Stripe, horários, tours, base de dados e textos do Hero.

## Detalhes técnicos
- Fonte única de inclusões derivada do resultado de `bookableRouteAdmission` / composição, consumida por `FinalRevealStory`, `CheckoutSummary`, `GuestDetailsStep` e pelo snapshot de compra.
- Testes Vitest para paridade de inclusões; Playwright mobile 393x596 para os fluxos.
- Partilha por WhatsApp usa link `wa.me` com resumo do dia, sem dados pessoais.
