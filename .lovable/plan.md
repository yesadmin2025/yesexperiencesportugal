
## Inventário de inconsistências encontradas

### 1. Política de cancelamento — quatro variantes diferentes para o MESMO produto (Signature)

| Local | String atual |
|---|---|
| `src/config/business-nap.ts` `CANCELLATION_SIGNATURE` | "Signature days usually include free cancellation up to 24h before the experience." |
| `src/components/checkout/TrustStrip.tsx:45` | "Free cancellation — up to 24h before" (hardcoded) |
| `src/routes/tours.$tourId.tsx:378` | "Free cancellation up to 24h" (hardcoded, sem "when applicable") |
| `src/routes/tours.$tourId.tsx:909` | "Instant confirmation · Free cancellation up to 24h · …" (hardcoded) |
| `src/components/checkout/BrandedCheckoutDrawer.tsx:227` | "Free cancellation up to 24h" (hardcoded) |
| `src/routes/about.tsx:383-385` | Prosa manual "Signature days usually include free cancellation up to 24h before…" |

**Pior violação da regra do utilizador** — `src/routes/terms.tsx:80` e `src/routes/pt.terms.tsx:79` renderizam `{CANCELLATION_SHORT} {CANCELLATION_SIGNATURE} {CANCELLATION_STUDIO}` numa única frase, ou seja mostram **"24h" + "terms at checkout" para os mesmos produtos**, exatamente o que o utilizador proíbe.

Também: não existe versão PT das constantes `CANCELLATION_*`.

### 2. Trust one-liner legal — sem versão PT

- `TRUST_LINE` (EN) existe em `business-nap.ts`.
- Não existe `TRUST_LINE_PT`. As páginas `pt.*` compõem manualmente ("Operador turístico licenciado · RNAAT nº 31/2023") — a frase pedida ("Operador de animação turística licenciado em Portugal · RNAAT n.º 31/2023 · Sedeado em Sesimbra, Portugal.") não existe em lado nenhum.
- Nota: o utilizador pediu "n.º" (com ponto) em PT vs "nº" em EN — atualmente só temos "nº".

### 3. Links sociais / plataformas de reviews — duplicados em 5 ficheiros

Mesmos URLs (Instagram, Facebook, Tripadvisor) repetidos em:
- `src/components/Footer.tsx:112-122`
- `src/components/Navbar.tsx:32-34`
- `src/routes/press.tsx:70-73`
- `src/lib/jsonld.ts:217-219`
- `src/routes/api/public/hooks/import-tripadvisor-reviews.ts:24-26`

**Faltam ainda**: perfil oficial Google (GBP), URL Viator do operador — nunca centralizados. Viator só aparece como texto ("Tripadvisor & Viator") em `day-tours.tsx`, `about.tsx`, `reviews.tsx`, `cookies.tsx` sem link.

### 4. Website canónico — nunca exportado

`https://yesexperiencesportugal.com` aparece como literal em `terms.tsx`, `pt.terms.tsx`, `contact.tsx`, `unsubscribe.tsx`, `__root.tsx`, JSON-LD, sitemap, canonicals, og:url etc.

### 5. Menores

- `BUSINESS_NAME` = "YES experiences Portugal" (e minúsculo) vs `BUSINESS_LEGAL_NAME` = "YES Experiences Portugal" — a discrepância parece intencional (marca vs legal) mas não está documentada.
- `booking-confirmed.tsx:223` "guide will introduce themselves on WhatsApp within 24h" — SLA de resposta, não cancelamento, mas usa a mesma numeração; ficará como está (não é política).

---

## O que vai mudar (só código, zero design)

### A. `src/config/business-nap.ts` — expandir a fonte única

Adicionar sem quebrar exports existentes:

```ts
// Website
export const WEBSITE_URL = "https://yesexperiencesportugal.com" as const;

// Perfis oficiais — únicos e canónicos
export const SOCIAL = {
  instagram: "https://www.instagram.com/yesexperiencesportugal",
  facebook:  "https://www.facebook.com/yesexperiencesportugal",
  tripadvisor: "https://www.tripadvisor.com/Attraction_Review-g227946-d34430097-Reviews-Yes_Experiences_Portugal-Sesimbra_Setubal_District_Alentejo.html",
  viator:    "", // deixado vazio até o utilizador confirmar o URL oficial do operador
  google:    "", // idem, GBP público
} as const;

// PT trust one-liner (com "n.º" como pedido)
export const LICENSE_LABEL_PT = "RNAAT n.º 31/2023" as const;
export const TRUST_LINE_PT =
  `Operador de animação turística licenciado em Portugal · ${LICENSE_LABEL_PT} · Sedeado em ${BASED_IN}.` as const;

// Política de cancelamento — UMA frase por variante de produto, EN + PT
export const CANCELLATION = {
  signature: {
    en: "Free cancellation up to 24h before, when applicable.",
    pt: "Cancelamento gratuito até 24 horas antes, quando aplicável.",
  },
  custom: { // studio + travel designer + corporate + moments + tailor
    en: "Cancellation terms are shown clearly before checkout or confirmation.",
    pt: "Condições de cancelamento apresentadas claramente antes do checkout ou confirmação.",
  },
} as const;
```

Manter (deprecated internos, sem remoção brusca): `CANCELLATION_SHORT`, `CANCELLATION_SIGNATURE`, `CANCELLATION_STUDIO` como aliases apontando para o novo objeto para não partir imports; guardrail test continua a passar.

### B. Cancelamento — substituir strings hardcoded pela fonte

Alterações **só de string / import**, sem tocar em JSX estrutural, tokens ou classes:

- `src/components/checkout/TrustStrip.tsx` — usar `CANCELLATION.signature.en` / `.custom.en` em vez do map local.
- `src/routes/tours.$tourId.tsx:378, 909` — usar `CANCELLATION.signature.en`.
- `src/components/checkout/BrandedCheckoutDrawer.tsx:227` — idem.
- `src/routes/about.tsx:383-385` — frase única (`CANCELLATION.signature.en` para Signature, `.custom.en` para o resto), sem "24h + terms at checkout" juntos.
- `src/routes/terms.tsx:80` e `src/routes/pt.terms.tsx:79` — substituir a concatenação tripla por **duas linhas separadas** (uma por família de produto), eliminando a violação do "não mostrar 24h e terms at checkout para o mesmo produto".
- `src/content/seo-faq.ts:104` — resposta FAQ passa a listar as duas famílias com clareza (Signature: 24h; restantes: antes do checkout).

### C. Links sociais — passar todos a consumir `SOCIAL`

- `src/components/Footer.tsx` → `SOCIAL.instagram/facebook/tripadvisor`.
- `src/components/Navbar.tsx` → idem.
- `src/routes/press.tsx` → idem.
- `src/lib/jsonld.ts` (`sameAs`) → array construído a partir de `SOCIAL` (Viator/Google entram automaticamente se preenchidos).
- `src/routes/api/public/hooks/import-tripadvisor-reviews.ts` → usar `SOCIAL.tripadvisor` como fonte, mantendo a variante "or10" só onde é necessária para paginação.

### D. Website canónico

Substituir os literais `https://yesexperiencesportugal.com` por `WEBSITE_URL` em `terms.tsx`, `pt.terms.tsx`, `contact.tsx`, `unsubscribe.tsx`, e onde aparecer em compor de canonical/og:url em rotas simples. Não tocar em ficheiros gerados (`sitemap[.]xml.ts` mantém as suas próprias constantes se depender delas — se já usar literal, migrar).

### E. Trust line PT

Aplicar `TRUST_LINE_PT` onde as páginas `pt.*` compõem a frase manualmente (footer PT, `pt.contact.tsx:110`, `pt.about.tsx`, `pt.terms.tsx`, meta descriptions relevantes).

---

## O que fica de fora (fora do âmbito ou fica pendente de decisão do utilizador)

- **Não adiciono URLs Viator / Google Business Profile inventados**. Ficam `""` no `SOCIAL` e a UI condiciona-os (`if link`). Precisamos que confirmes:
  - URL público do perfil Viator do operador.
  - URL público do Google Business Profile (Maps) atual.
- Nenhuma alteração de layout, tokens, tipografia, animações, copy comercial, preços, Studio ou checkout.
- `booking-confirmed.tsx` SLA "24h" fica (não é política de cancelamento).

---

## Validação final

- Typecheck.
- Grep pós-alteração: nenhuma ocorrência de "Free cancellation up to 24h" ou "24h" fora de `business-nap.ts`, `booking-confirmed.tsx` e `admin.*`; nenhum literal `instagram.com/yesexperiencesportugal`, `facebook.com/yesexperiencesportugal` ou `tripadvisor.com/Attraction_Review-...Yes_Experiences_Portugal...` fora de `business-nap.ts`.
- Guardrail existente `src/__tests__/nap-consistency.test.ts` continua verde.

---

**Antes de implementar, confirma:**
1. URL oficial Viator do operador (para `SOCIAL.viator`) — deixo vazio se não tiveres agora?
2. URL do Google Business Profile atual (para `SOCIAL.google` e `sameAs` JSON-LD) — idem?
