## O que está realmente a acontecer

Pelo que descreves e pela screenshot:

1. O **Google Business Profile (GBP) é o novo**, mas no campo "Website" dele ainda está `http://www.yesexperiences.pt` em vez de `https://yesexperiencesportugal.com`.
2. O domínio `.pt` está, de alguma forma, a servir o conteúdo do site novo (provavelmente por redirect/proxy ou por estar ligado ao mesmo backend), e por isso o Google mostra-o como resultado principal da marca.
3. O domínio novo `yesexperiencesportugal.com` quase não aparece — porque o Google está a indexar o `.pt` como sendo "o site oficial" e a tratá-lo como o canónico de facto.

Resultado: a marca tem dois sinais a competir, e o Google escolheu o errado.

## Estratégia

Em vez de manter a estratégia "410 Gone no `.pt`" (que assume que controlamos o servidor do `.pt`), vamos fazer o oposto, que é mais rápido e seguro:

1. **Mudar o link do GBP novo para `yesexperiencesportugal.com`.**
2. **Consolidar o sinal canónico** para o domínio novo em todo o lado (schema, sitemap, robots, social, press, footer, autoridade externa, Tripadvisor listing se possível).
3. **Forçar reindexação** via Search Console no domínio novo.
4. **Tratar o `.pt**` de forma coerente com o que realmente controlas (ainda não sabemos se controlas o servidor `.pt` ou só o DNS).

## Plano de execução

### Fase 1 — Ações tuas (fora do código, mas críticas)

Sem isto nada do resto resolve o que vês no Google:

- **GBP novo → editar campo Website** e mudar de `yesexperiences.pt` para `https://yesexperiencesportugal.com`. Guardar.
- **GBP → editar nome** se aparecer "Yes Experiences Portugal" com link `.pt`: confirmar nome consistente com o site novo.
- **Tripadvisor listing** (`Yes Experiences Portugal - O que saber antes de ir`): editar "Website" para `yesexperiencesportugal.com`.
- **VisitPortugal listing**: pedir/atualizar URL para `yesexperiencesportugal.com`.
- Confirmar comigo o que controlas no `.pt`:
  - controlas DNS? (Cloudflare/registrar)
  - controlas o servidor/host antigo (WordPress)?
  - queres manter email forwarding `@yesexperiences.pt`?

A resposta à última pergunta decide se o `.pt` faz 410, 301, ou simplesmente desaparece.

### Fase 2 — Auditoria e limpeza canónica no código (quando passarmos a build)

Tudo isto reforça o domínio novo como o único legítimo:

- Auditar `src/`, `public/`, JSON-LD, schemas (`Organization`, `LocalBusiness`, `Person`, `Product`, `TouristTrip`), `sameAs`, footer, press page, `externalAuthorityMentions.ts`, sitemap, robots, manifest e og:url.
- Garantir que **nenhuma referência ao `.pt**` sobra (só o handler de 410, que é interno e sem efeito visual).
- Confirmar que o `GBP novo` é o único listado em `sameAs` dentro do `LocalBusiness`, e remover qualquer link para o perfil antigo.
- Confirmar que o `canonical` e `og:url` em cada route são auto-referenciados ao domínio novo.
- Confirmar `Host: https://yesexperiencesportugal.com` no `robots.txt` (já está).
- Adicionar `<link rel="alternate" hreflang>` se aplicável (en/pt) — todos a apontar ao novo domínio.

### Fase 3 — Search Console (apenas no domínio novo)

- Confirmar `yesexperiencesportugal.com` como propriedade verificada.
- Submeter `sitemap.xml` (já existe a rota).
- Inspeção de URL + "Request indexing" para:
  - `/`
  - `/experiences`
  - `/studio-v3`
  - `/multi-day`
  - `/wine-tours-lisbon`
  - `/arrabida-wine-tour`
  - `/sintra-day-tour-from-lisbon`
  - `/private-wine-tour-lisbon`
  - todas as `tours/$tourId` principais
- Verificar relatório de "Páginas" e tratar erros (canonical mismatch, duplicate, soft 404).

Tudo via o conector Google Search Console já ligado a `yesexperiences@gmail.com`.

### Fase 4 — Tratar o `.pt` conforme o que controlas

Três cenários, com base na tua resposta na Fase 1:

A. **Controlas DNS + servidor antigo** → opcional: servir `301 → yesexperiencesportugal.com` durante 90 dias para passar autoridade, depois cortar; ou ligar `.pt` ao Lovable para o nosso 410 entrar em vigor.

B. **Controlas só DNS, não o servidor** → ligar `yesexperiences.pt` ao Lovable como custom domain (A record para 185.158.133.1). A partir daí o nosso middleware serve 410 Gone, e o Google despromove. Email forwarding mantém-se se MX/TXT/SPF não forem mexidos.

C. **Não controlas nem DNS nem servidor** → só Fase 2 + Fase 3 + atualizar GBP/Tripadvisor/VisitPortugal. O `.pt` cairá lentamente porque o Google deixa de o ver como ligado à entidade.

### Fase 5 — Monitorização

Vamos usar o `/admin/legacy-domains-monitor` que já existe + estender:

- adicionar uma checagem que diga "GBP novo aponta para domínio canónico?" (manual, lida do GBP via Google API se autorizada);
- relatório semanal automático: o `.pt` ainda indexado? quantos resultados?
- verificar inspeção de URL no GSC para os top 10 URLs do site novo.

## O que preciso de ti antes de avançar para build

Duas respostas curtas:

1. Quem controla o `.pt` hoje (DNS, servidor, ambos, nenhum)?
2. Queres manter o **email forwarding** `@yesexperiences.pt` ou já migraste tudo para `@yesexperiencesportugal.com`?

Assim que respondas, mudo para build mode e executo Fases 2, 3, 4 e 5 de uma vez.

[https://www.google.com/search?q=yes+experiences+portugal%C2%A0&sca_esv=9d11f09b99ad9e2b&rlz=1CDGOYI_enPT1074PT1074&hl=pt-PT&biw=393&bih=665&sxsrf=APpeQnvqbISLeY4FBrzm6fTwT8Q9RtEGlw%3A1782824634270&ei=HMBDatfxH_OokdUPvcSIwQc&cs=1&oq=yes+experiences+portugal%C2%A0&gs_lp=EhNtb2JpbGUtZ3dzLXdpei1zZXJwIhp5ZXMgZXhwZXJpZW5jZXMgcG9ydHVnYWzCoDIEECMYJzIEECMYJzIMECMYgAQYExgnGIoFMgYQABgWGB4yBRAhGKABMgUQIRigATIFECEYoAEyCBAAGIAEGKIESMUZUOwIWKURcAB4AJABAJgB9gGgAe0KqgEFMi44LjG4AQPIAQD4AQGYAgegAvAFwgIHECMYsAMYJ8ICCBAAGLADGO8FwgILEAAYgAQYsAMYogTCAgUQABjvBZgDAIgGAZAGBJIHAzIuNaAHgU2yBwMyLjW4B_AFwgcFMC41LjLIBw-ACAA&sclient=mobile-gws-wiz-serp#ip=1](https://www.google.com/search?q=yes+experiences+portugal%C2%A0&sca_esv=9d11f09b99ad9e2b&rlz=1CDGOYI_enPT1074PT1074&hl=pt-PT&biw=393&bih=665&sxsrf=APpeQnvqbISLeY4FBrzm6fTwT8Q9RtEGlw%3A1782824634270&ei=HMBDatfxH_OokdUPvcSIwQc&cs=1&oq=yes+experiences+portugal%C2%A0&gs_lp=EhNtb2JpbGUtZ3dzLXdpei1zZXJwIhp5ZXMgZXhwZXJpZW5jZXMgcG9ydHVnYWzCoDIEECMYJzIEECMYJzIMECMYgAQYExgnGIoFMgYQABgWGB4yBRAhGKABMgUQIRigATIFECEYoAEyCBAAGIAEGKIESMUZUOwIWKURcAB4AJABAJgB9gGgAe0KqgEFMi44LjG4AQPIAQD4AQGYAgegAvAFwgIHECMYsAMYJ8ICCBAAGLADGO8FwgILEAAYgAQYsAMYogTCAgUQABjvBZgDAIgGAZAGBJIHAzIuNaAHgU2yBwMyLjW4B_AFwgcFMC41LjLIBw-ACAA&sclient=mobile-gws-wiz-serp#ip=1)