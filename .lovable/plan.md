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

## Prioridade 2 — Rotas com queda e primeiro passo
- **Observado:** as maiores quedas estão nas entradas diretas em Tailor, Studio e tours (tabela acima).
- **Primeiro passo (só leitura):** listar, para cada tipo de rota, as páginas exatas de entrada em A contra B (top 10 por IDs/dia). Cruzar com:
  - datas de mudanças em links externos (Google Business, Viator, GetYourGuide, WhatsApp, emails de reserva);
  - os anúncios ativos em A e em B.
  
  Objetivo: encontrar que página de entrada deixou de receber visitas e porquê. Não se muda design nem SEO antes disso.

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
