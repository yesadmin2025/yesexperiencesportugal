## Porque é que o site antigo (yesexperiences.pt) ainda aparece no Google

O código já está preparado — o middleware em `src/lib/legacy-domain-redirect.ts` devolve 301 para as URLs mapeadas e 410 Gone para as restantes. **Mas nada disto está a acontecer em produção enquanto o DNS de `yesexperiences.pt` continuar a apontar para o WordPress antigo.** O Google só reprocessa (e retira do índice) quando visita as URLs antigas e recebe 301/410 — hoje ainda recebe 200 OK do WordPress, por isso mantém tudo indexado.

Além disso, a desindexação é sempre lenta: mesmo com tudo bem configurado, o Google demora tipicamente **2 a 8 semanas** a atualizar os resultados.

## Plano de resolução (sem escrever código novo)

### 1. Repontar o DNS de yesexperiences.pt para a Lovable  *(bloqueador — nada funciona sem isto)*
No registrar do domínio `yesexperiences.pt`:
- Apagar registos A/CNAME antigos que apontam para o WordPress
- Registo A: `@` → `185.158.133.1`
- Registo A: `www` → `185.158.133.1`
- Registo TXT: `_lovable` → valor de verificação (dado pela Lovable ao adicionar o domínio)
- Em **Project Settings → Domains** adicionar `yesexperiences.pt` **e** `www.yesexperiences.pt`
- Manter `yesexperiencesportugal.com` como **Primary**

A partir daqui, cada pedido a `https://yesexperiences.pt/qualquer-coisa` cai no middleware que já existe e devolve 301 para a URL equivalente no domínio novo, ou 410 Gone. É este sinal que o Google precisa de ver.

### 2. Manter GBP separado (política híbrida já decidida)
- **NÃO** submeter Change of Address no Google Search Console — é o que mantém o perfil Google Business antigo desassociado.
- Marcar o GBP antigo como **permanentemente encerrado** no Google Maps.
- Não referenciar em lado nenhum do código o place ID, CID ou NAP antigos.

### 3. Acelerar a reindexação no Search Console *(quando o DNS já estiver ativo)*
- Adicionar/verificar `yesexperiencesportugal.com` como propriedade Domain no GSC.
- Submeter o sitemap novo: `https://yesexperiencesportugal.com/sitemap.xml`.
- Na propriedade **antiga** (`yesexperiences.pt`), abrir o relatório *Pages → Not indexed* e pedir **Validate fix** — obriga o Google a recolher as URLs antigas e ver os 301/410.
- Usar **URL Inspection → Request indexing** nas 10–20 URLs mais visitadas do domínio novo.

### 4. Limpar sinais externos que continuam a alimentar o site antigo
- Backlinks importantes (parceiros, imprensa, diretórios de turismo, Viator, TripAdvisor, redes sociais, assinaturas de email): pedir para atualizarem o link para `yesexperiencesportugal.com`.
- Perfis sociais (Instagram, Facebook, LinkedIn): trocar o URL no bio.
- Atualizar Google Ads / Meta Ads se ainda apontarem para o domínio antigo.

### 5. Verificar que os 301/410 estão realmente a sair *(depois do DNS propagar, 24–72h)*
Testes rápidos que confirmam que o middleware está a funcionar em produção:
```
curl -I https://yesexperiences.pt/                    → 301 → https://yesexperiencesportugal.com/
curl -I https://yesexperiences.pt/about-us            → 301 → /about
curl -I https://yesexperiences.pt/tour/sintra-tour    → 301 → /tours/sintra-cascais
curl -I https://yesexperiences.pt/wp-admin            → 410 Gone
```
Os testes automatizados em `src/__tests__/legacy-domain-redirect-exhaustive.test.ts` (418 casos) já validam a lógica — só falta o DNS para chegarem a produção.

### 6. Timeline realista
- Semana 1: DNS propaga, 301/410 começam a servir.
- Semanas 2–4: Google recolhe as URLs antigas, começam a cair do índice.
- Semanas 4–8: substituição nos resultados de pesquisa fica visível.
- Manter 301+410 **no ar até pelo menos 2027-07-10** (mínimo 12 meses, já anotado no código).

## O que preciso de si para avançar

1. Confirma que quer avançar com **repontar o DNS de `yesexperiences.pt` para a Lovable**? (é o único bloqueador real — sem isto, nada acima produz efeito).
2. Já tem acesso ao registrar onde `yesexperiences.pt` está registado, ou é preciso pedir a alguém?
3. Quer que eu prepare também uma **lista de URLs prioritárias** para pedir reindexação manual no Search Console (as 20 páginas mais importantes do domínio novo)?
