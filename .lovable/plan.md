# Próximo plano de execução comercial (3 prioridades) — sem construir

## Dados normalizados por dia
Fonte: tabela própria do site. A = 01–20/10 (20 dias), B = 21/10–05/11 (16 dias). Números por dia; "IDs" são identificadores anónimos distintos, não pessoas.

| Entrada no site (landing, IDs/dia) | A | B | Variação |
|---|---|---|---|
| Homepage | 13,7 | 12,1 | -12% |
| Outras páginas (guias, etc.) | 57,7 | 50,3 | -13% |
| /pt | 3,1 | 3,4 | +12% |
| /experiences | 1,9 | 1,4 | -26% |
| Páginas de tour | 13,1 | 7,6 | **-42%** |
| Tailor | 4,4 | 1,4 | **-68%** |
| Studio | 2,3 | 0,8 | **-64%** |

| Outros sinais (por dia) | A | B |
|---|---|---|
| Studio: sessões com entrada | 2,75 | 1,13 (-59%) |
| Studio: revelação vista | 0,30 | 0,19 |
| Cliques em botões principais (eventos) | 6,35 | 2,75 |

**Observado**
- No site em geral, as entradas caíram cerca de 12–13%.
- As entradas diretas em páginas de tour, Tailor e Studio caíram entre 42% e 68%.
- A perda concentra-se em quem chegava diretamente a páginas de reserva.

**Hipótese**
- Desapareceu ou enfraqueceu uma fonte que mandava visitantes diretamente para tours, Tailor e Studio: links partilhados, perfis externos, campanhas ou mensagens.
- O referrer está quase sempre vazio, por isso esta hipótese não se prova com esta tabela.

**Observado no código, com impacto na medição**
- O contador de cliques só reconhece links com textos ou destinos específicos: "Tailor", "Design your day", "See dates", `/studio`, `/experiences/...`.
- Os cartões da homepage levam a `/tours/<id>` e por isso não são contados.
- A descida dos cliques na homepage (de 5,1% para 2,6% dos IDs de entrada) pode ser em parte um efeito de medição da mudança dos cartões. Hipótese, não confirmada.

## Prioridade 1 — Teste controlado Safari iPhone + checkout sandbox completo
- **O quê:** um percurso Signature e um Tailor até ao pagamento confirmado, com um cartão de teste e um Multibanco de teste, só na pré-visualização (Stripe sandbox). Mais um percurso em Safari num iPhone real, feito por ti, a seguir um guião de 8 passos que eu escrevo. Não é criada nenhuma cobrança real.
- **Aceitação:**
  - a página de confirmação aparece;
  - a reserva fica registada como sandbox;
  - o email de teste é recebido;
  - o date picker do iPhone funciona.
- **Custo:** só testes, sem código.

## Prioridade 2 — RESULTADO (executado pela proprietária, só SELECT e GSC)
Entradas por página, em IDs anónimos/dia, A (20 dias) contra B (16 dias):

| Página de entrada | A | B | Variação |
|---|---|---|---|
| Arrábida Wine All Inclusive | 3,25 | 1,25 | -62% |
| Studio | 2,25 | 0,81 | -64% |
| Tiles Workshop | 1,70 | 0,63 | -63% |
| Arrábida Wine, Tailor | 1,45 | 0,31 | -78% |
| Southwest Vicentine Coast | 1,05 | 0,19 | -82% |
| Tróia & Comporta, Tailor | 0,80 | 0 | -100% |

Entradas sem referrer: Arrábida 60→17, Studio 35→13, Arrábida Tailor 31→5.

Cliques Google (GSC), 05–18/10 contra 19/10–01/11: Arrábida 1→3, Studio 0→0, Tiles 2→1, /experiences 1→0, Southwest 0→0.

**Observado:** a queda de entradas diretas nestas páginas não se explica por menos cliques do Google nessas páginas.

**Por investigar, sem assumir a origem:** ligações diretas, campanhas, entradas sem referrer, medição e bots.

## Prioridade 2 — plano original (já executado)
- **Observado:** as maiores quedas estão nas entradas diretas em Tailor, Studio e tours (tabela acima).
- **Primeiro passo (só leitura):** listar, para cada tipo de rota, as páginas exatas de entrada em A contra B (top 10 por IDs/dia). Cruzar com:
  - datas de mudanças em links externos (Google Business, Viator, GetYourGuide, WhatsApp, emails de reserva);
  - os anúncios ativos em A e em B.
  
  Objetivo: encontrar que página de entrada deixou de receber visitas e porquê. Não se muda design nem SEO antes disso.

## Prioridade 1 — AUTORIZADA pela proprietária (sandbox + Safari)
Âmbito estrito: só a pré-visualização com Stripe sandbox. Sem cobranças reais, sem alterações de código e sem mexer em métodos de pagamento.

1. **Signature (Arrábida Wine), mobile 393px:** data a mais de 24h, 2 adultos, dados de teste e cartão de teste `4242 4242 4242 4242`, até à página de confirmação. Verificar:
   - a confirmação mostra "paid";
   - a reserva fica registada como sandbox;
   - os dados aparecem abreviados;
   - o email de teste é recebido.
2. **Tailor (Arrábida):** remover uma paragem e pagar com cartão de teste. Verificar o total, as inclusões ajustadas e a confirmação.
3. **Multibanco sandbox:** abrir o checkout e escolher Multibanco. Registar o que o cliente vê (referência, instruções, estado). Não há alteração de configuração.
4. **Recusa:** cartão de teste `4000 0000 0000 0002`. A mensagem de erro deve ser clara e deve ser possível tentar de novo.
5. **Guião Safari em iPhone real (feito por ti, na pré-visualização):**
   1. Abrir /experiences.
   2. Tocar em "See dates & reserve" na Arrábida.
   3. Escolher a data no date picker nativo.
   4. Mudar os adultos.
   5. Tocar em "Reserve this day".
   6. Preencher os dados.
   7. Tocar em "Continue to payment" e confirmar que o cartão de teste aparece.
   8. Pagar com `4242…` e ver a confirmação.
   
   Anotar em que passo algo falha.

**Evidência a entregar:** capturas por passo, estado final de cada sessão sandbox (agregado) e tabela PASSOU/FALHOU.

**Limpeza:** os registos sandbox ficam marcados como teste. Não se apaga nada sem pedido teu.

## Prioridade 3 — Quick wins (máximo 2, só com autorização)
1. **Medição (código pequeno, invisível para o cliente):** passar a contar como clique de reserva os links dos cartões que levam a `/tours/<id>`.
   - Aceitação: um clique num cartão da homepage gera 1 evento de clique.
   - Rollback: reverter uma linha.
   - Porquê: sem isto, não se consegue avaliar a homepage depois das mudanças de outubro.
2. **Multibanco (decisão tua, sem código para já):** com base no teste sandbox da Prioridade 1, decidir se o Multibanco se mantém visível a clientes estrangeiros.
   - Observado: 6 recusas genéricas.
   - Hipótese: pode estar a confundir clientes não portugueses.
   - Aceitação: decisão documentada e, se houver mudança, configuração revertível.

Fora deste plano: os retoques do Studio (rótulo de região) e da mensagem do Travel Designer ficam para confirmar visualmente, porque não explicam a queda.

Aguardo autorização expressa antes de qualquer construção, teste sandbox ou edição. O registo no `roadmap.md` fica para quando autorizares, porque o modo plano não permite escrever nesse ficheiro.
