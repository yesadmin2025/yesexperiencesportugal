## Problema

As páginas hero (corporate, proposal, multi-day, about) e os novos blocos `AmbientLandscapeStrip` estão a reutilizar as mesmas fotos do banco (Comporta boardwalk, Espichel cliffs, Vicentine bay) em vários sítios. Além disso, várias imagens do banco (`tour_gallery_photos` + `owner-photos`) são de qualidade média (compressão iPhone, enquadramento amador, luz plana) e não passam o padrão editorial "Aman / Cereal magazine".

## Objectivo

1. **Zero repetição** — cada foto aparece só numa página em todo o site público.
2. **Só imagens premium** — banir do site qualquer foto que não tenha qualidade editorial (nítida, luz cinemática, composição limpa, sem duplicados temáticos).

## Plano

### 1. Auditoria completa (primeiro passo, sem código)

Vou listar **todas** as imagens actualmente usadas nas páginas de conversão e no banco:

- `src/assets/owner-photos/*` (18 fotos)
- `src/assets/ambient/*` (8 fotos novas)
- `tour_gallery_photos` no Supabase (fotos admin)
- Referências em: `index.tsx`, `about.tsx`, `corporate.tsx`, `proposal-in-portugal.tsx`, `multi-day.tsx`, `experiences.tsx`, `tours.$tourId.tsx`, `AmbientLandscapeStrip.tsx`, `guest-moments.ts`, `SignatureCarousel`.

Entrego uma **tabela** com: ficheiro · onde é usada · quantas vezes · veredicto de qualidade (keep / replace / retire).

### 2. Curadoria (tu decides)

Depois da tabela, peço-te para:

- Confirmar quais fotos **retiras** do site (qualidade insuficiente).
- Indicar de que categorias precisas de **novas fotos** (ex: corporate premium, proposta romântica, multi-day Douro).

Podes enviar fotos novas ou eu proponho gerar hero images editoriais premium (IA fotorrealista, estilo Aman/Cereal) para preencher os buracos até teres o material real.

### 3. Regra de unicidade (implementação após tua aprovação)

- Cada asset entra numa única página. Se uma foto é hero em `/corporate`, não pode aparecer em `AmbientLandscapeStrip` nem em Guest Moments.
- Crio um teste `src/__tests__/image-uniqueness.test.ts` que falha o build se a mesma URL aparecer em >1 rota de conversão (corporate, proposal, multi-day, about, index, experiences).

### 4. Substituições concretas

Com o mapa de curadoria aprovado, faço num único commit:

- Trocar imagens repetidas por únicas.
- Retirar do código as fotos rejeitadas (delete via `lovable-assets delete`).
- Actualizar `AmbientLandscapeStrip` presets (Corporate/Proposal/Multi-day) para usarem 3 fotos exclusivas cada, sem overlap.
- Actualizar `guest-moments.ts` para não repetir nenhuma foto usada em heroes.

### 5. Qualidade responsiva (sanity check final)

Confirmar que todas as fotos finais servem via `buildResponsiveSrc` com AVIF/WebP e `srcSet` correcto, e que os heroes têm `fetchPriority="high"`.

## Antes de avançar preciso de duas respostas

1. **Autorizas gerar hero images premium por IA** (fotorrealistas, estilo editorial Aman/Cereal) para preencher lacunas onde não temos foto real de qualidade, ou preferes esperar até enviares mais fotos tuas?
2. **A auditoria (passo 1) — queres a tabela em português, no chat, ou preferes num ficheiro `docs/image-audit.md` para reveres com calma?**  

Quero que melhores a qualidade das imagens que são boas para cada contexto e que lhes dês Motion 