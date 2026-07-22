## Inventário (auditoria completa)

Testadas as 55 URLs do sitemap + rotas suspeitas com `curl -I` em produção. Verificadas todas as `beforeLoad: redirect(...)` no `src/routes/`.

### Problemas encontrados

**1. Redirects 307 (temporários) que deveriam ser 301 (permanentes)**
GSC marca-os como "Página com redirecionamento". Ficheiros afetados:
- `src/routes/faq.tsx` → `/about` (307)
- `src/routes/moments.tsx` → `/proposal-in-portugal` (307)
- `src/routes/pt.$.tsx` → `/pt` (307)
- `src/routes/pt.faq.tsx` → `/pt/about` (307)
- `src/routes/pt.moments.tsx` → `/pt/contact` (307)
- `src/routes/pt.proposals.tsx` → `/pt/contact` (307)

**2. URLs no sitemap.xml que redirecionam (violam "sitemap = HTTP 200")**
- `/faq` → 307 → `/about`
- `/moments` → 307 → `/proposal-in-portugal`

**3. Cadeia de redirect em parâmetros literais**
- `/local-stories/$tourId` → 307 → `/local-stories/undefined` → 404
  (hospedagem substitui `$tourId` por `undefined`; a rota destino já devolve 404 via `notFound()`, mas a cadeia 307→404 não é limpa)
- `/local-stories/$slug` → 307 → `/local-stories/%24slug` → 404 (mesma dinâmica; termina em 404 correto)

**4. OK — sem alterações**
- `/local-stories/%24slug` → **404** ✅
- `/local-stories/slug|undefined|null` → **404** ✅ (loader já bloqueia)
- `robots.txt` → 200 ✅, já exclui rotas técnicas e `/local-stories/$slug`
- Todas as outras 53 URLs do sitemap → 200 ✅
- 301s existentes (`/builder`, `/wine-tours-lisbon`, `/day-trips-from-lisbon`, etc.) → OK ✅
- Nenhum link interno para `/faq` ou `/moments` (`rg` confirmou)
- Nenhum redirect loop real
- Canonicals self-referencing OK nas rotas verificadas
- `sitemap.xml` já filtra slugs placeholder via `isRealSlug()`

---

## Correções (mínimas, cirúrgicas)

### A. Marcar redirects como permanentes (301)
Adicionar `statusCode: 301` (e `replace: true` onde faz sentido) nos 6 ficheiros de redirect ainda com 307:
- `src/routes/faq.tsx`
- `src/routes/moments.tsx`
- `src/routes/pt.$.tsx`
- `src/routes/pt.faq.tsx`
- `src/routes/pt.moments.tsx`
- `src/routes/pt.proposals.tsx`

### B. Remover URLs que redirecionam do sitemap
Em `src/routes/sitemap[.]xml.ts`, remover as entradas `/faq` e `/moments` do array `staticEntries` (o conteúdo real vive em `/about` e `/proposal-in-portugal`, ambos já no sitemap).

### C. Curto-circuito de segmentos com parâmetro literal
Em `src/start.ts` adicionar um `requestMiddleware` que devolve **404 direto** (sem redirect) quando qualquer segmento do path começa por `$` (ou `%24` decodificado) seguido de nome de parâmetro (`$slug`, `$tourId`, `$token`, `$postId`, etc.). Aplicado antes do handler da app — elimina a cadeia 307→404 para uma resposta 404 única. Não afeta URLs válidas (nenhum slug legítimo começa por `$`).

### D. Nada mais
- Não altero design, copy, Studio, checkout, preços, animações, tipografia.
- Não removo/renomeio rotas válidas.
- Não toco em `robots.txt` (já correto).
- Não mexo nos canonicals existentes.

---

## Verificação pós-alteração

Corro em produção após publish (o utilizador confirma quando republicar):

```bash
# 1. Todos os URLs do sitemap devolvem 200
curl -s /sitemap.xml | grep -oE '<loc>[^<]+' | sed 's/<loc>//' | \
  xargs -I{} sh -c 'curl -sI "{}" -o /dev/null -w "%{http_code} {}\n"' | grep -v ^200

# 2. Redirects agora são 301
for p in /faq /moments /pt/foobar /pt/faq /pt/moments /pt/proposals; do
  curl -sI "https://yesexperiencesportugal.com$p" -o /dev/null -w "$p -> %{http_code}\n"
done

# 3. Segmentos $param retornam 404 direto (sem cadeia)
for p in '/local-stories/$slug' '/local-stories/$tourId' '/tours/$tourId'; do
  curl -sI "https://yesexperiencesportugal.com$p" -o /dev/null -w "$p -> %{http_code}\n"
done
```

Resultado esperado: todos sitemap = 200; grupo 2 = 301; grupo 3 = 404 direto.

---

## Ficheiros a alterar
1. `src/routes/faq.tsx` — adicionar `statusCode: 301`
2. `src/routes/moments.tsx` — adicionar `statusCode: 301`
3. `src/routes/pt.$.tsx` — adicionar `statusCode: 301`
4. `src/routes/pt.faq.tsx` — adicionar `statusCode: 301`
5. `src/routes/pt.moments.tsx` — adicionar `statusCode: 301`
6. `src/routes/pt.proposals.tsx` — adicionar `statusCode: 301`
7. `src/routes/sitemap[.]xml.ts` — remover `/faq` e `/moments` de `staticEntries`
8. `src/start.ts` — novo middleware `literalParamSegment404`

Total: 8 ficheiros. Nenhum ficheiro criado ou eliminado.