# Emails: pré-visualização, testes e monitorização em tempo real

O domínio `notify.yesexperiences.pt` está verificado, por isso o foco agora é
poder testar cada template, enriquecer os dois emails de cliente e ver
bounces/falhas a chegar ao painel sem recarregar a página.

## 1. Estúdio de templates em `/admin/emails`

Novo separador **Templates**, ao lado de Registo, Bounces e Fila parqueada:

- Lista de todos os templates registados (reserva, recibo, boas-vindas,
contacto, story da signature, internos, e os seis de autenticação).
- Pré-visualização do HTML renderizado com os dados de exemplo de cada
template, dentro de um iframe com alternância telemóvel / desktop.
- Assunto e nome de exibição visíveis por cima da pré-visualização.
- Campo "Enviar teste para" (pré-preenchido com o email do admin com sessão
iniciada) e botão **Enviar teste**. O envio usa `notify.yesexperiences.pt`,
marca a mensagem como teste no registo e responde para
`info@yesexperiencesportugal.com`.
- Resultado do envio mostrado de imediato (entregue, adiado, erro), com a
entrada correspondente a aparecer no separador Registo.

Só admins autenticados conseguem pré-visualizar ou disparar testes.

## 2. Email de confirmação de reserva com links úteis

O template de confirmação passa a fechar com um bloco de ações claro:

- **Ver o meu itinerário online** — página do itinerário com a referência da
reserva, passo a passo, mapa e nota de flexibilidade.
- **Descarregar o PDF** — o mesmo itinerário em ficheiro.
- **Página da experiência** — quando a reserva nasce de uma Signature, link
direto para a página dessa experiência.
- Linha de apoio com o contacto `info@yesexperiencesportugal.com` e a
referência da reserva bem visível.

Nota: o site não tem hoje área de cliente com login. Em vez de inventar uma,
os links acima dão acesso direto à reserva através da referência — é a
"minha conta" na prática. Se quiseres mesmo uma área com sessão iniciada,
trata-se de um projeto à parte e digo-te o que envolve.

Criar uma forma de o cliente poder gerir a reserva e cancelar e ter a opção de criar conta para aceder as suas reservas mais facilmente e poder usufruir de descontos e ofertas 

## 3. Email de boas-vindas com CTA de descoberta

O template de boas-vindas ganha um botão principal **Explorar experiências**
(para a coleção Signature) e uma segunda ligação discreta para o Experience
Studio, mantendo o tom editorial atual: serif Fraunces-equivalente para
títulos, dourado só em detalhe, sem linguagem promocional.

## 4. Bounces e falhas em tempo real no painel

- A rota de webhook que já recebe bounces, queixas e cancelamentos de
subscrição passa a registar também o estado final do envio, para que o
painel mostre a razão exata da falha.
- O painel `/admin/emails` subscreve as alterações do registo de envios e da
lista de supressões e atualiza os cartões de estatísticas e as tabelas
assim que um evento chega — sem recarregar.
- Indicador "ligado ao vivo" no topo, com fallback para atualização
automática a cada 30 s caso a ligação em tempo real caia.
- Aviso destacado quando surge um bounce permanente, porque implica que
aquele destinatário fica bloqueado para envios seguintes.

## Detalhes técnicos

- Novos server functions em `src/lib/emailAdmin.functions.ts`:
`renderTemplatePreview` (renderiza pelo registo de templates com
`previewData`) e `sendTemplateTest` (envia via
`sendTransactionalInternal`, com verificação de papel admin em ambos).
- Separador Templates adicionado a `src/routes/admin.emails.tsx`; iframe com
`srcDoc` e `sandbox` para isolar o HTML pré-visualizado.
- `src/lib/email-templates/booking-confirmation.tsx` e `checkout-receipt.tsx`
recebem props opcionais `bookingReference`, `itineraryUrl`, `pdfUrl` e
`experienceUrl`, com bloco de ações renderizado só quando existem.
Quem envia (`checkout-email.ts`, `bookings.functions.ts`) passa esses
valores a partir do snapshot da reserva.
- `welcome.tsx` ganha botão e link secundário usando os mesmos tokens de cor
já definidos no template.
- Realtime: subscrição Supabase às tabelas `email_send_log` e
`suppressed_emails` a partir do painel, com desduplicação por
`message_id` mantida no cliente.
- `suppression.ts` passa a escrever o estado final no registo de envios com a
mensagem de erro mapeada.
- Sem alterações de base de dados: as tabelas de email já existem.