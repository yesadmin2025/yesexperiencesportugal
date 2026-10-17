# Testar todos os checkouts em mobile, corrigir e publicar

Objetivo: confirmar no telemóvel (393px) que todas as formas de reservar chegam ao pagamento, corrigir só o que bloquear ou atrapalhar, e publicar.

## 1. Percursos a testar (modo de teste, sem cobrar)
1. Signature: página do tour → «Reserve this day» → data → hóspedes → dados → formulário de pagamento Stripe.
2. /book: escolher tour → «See dates & reserve» → mesmo percurso até ao pagamento.
3. Tailor: ajustar um dia → preço ao vivo → pagamento.
4. Studio: perfis vinho, queijo, Fátima, Sesimbra, património e grupo de 6 → revelação → dados → pagamento.
5. Casos de bloqueio: sem data, data com menos de 48h (deve mostrar mensagem visível + WhatsApp), menores sem idade, campos em falta, duplo toque no botão de pagar, recolha "confirmar mais tarde".
6. Verificação rápida em ecrã de computador (Signature e Studio).

Em cada passo verifico: botão visível sem esconder nada, mensagens de erro visíveis no ecrã, sem texto cortado nem deslocamento lateral, formulário Stripe abre.

## 2. Corrigir
- Só corrijo o ponto exato que bloqueia ou cria fricção (mensagens escondidas, botões fora do ecrã, campos confusos).
- Não mexo em preços, regras de reserva, Stripe nem dados dos tours.
- Paro sempre antes de submeter o cartão: nenhuma cobrança.

## 3. Verificar e publicar
- Correr os testes automáticos de checkout/Studio e o build.
- Análise de segurança antes de publicar.
- Publicar em yesexperiencesportugal.com (inclui as melhorias pendentes: Corporate, /book, mensagens de bloqueio e medição de abandono) e confirmar as páginas principais no domínio oficial.

## Detalhes técnicos
- Playwright em localhost:8080, viewport 393x852; specs existentes `studio-v3-checkout-always-reaches-payment`, `instant-booking-checkout(-negative)`, `book-direct-handoff`, `studio-v3-mobile-guest-to-checkout`.
- Sucesso = `create-signature-checkout` HTTP 200 com clientSecret + iframe Stripe montado.
- Suites vitest do studio-checkout-gate + `tsgo`.
