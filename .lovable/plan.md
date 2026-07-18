## Contexto

Levantamento confirmou que os heroes de `/corporate` e `/proposal-in-portugal` já usam owner-photos com pessoas reais, e `/multi-day` não tem hero fotográfico (é preview do PDF). O banco novo `tour_gallery_photos` traz paisagens (Comporta, Cabo Espichel, Vicentine, picnic) que não devem substituir retratos — mas podem enriquecer as páginas como blocos ambientais.

Escopo aprovado:

1. Manter todos os retratos/casais/grupos que já lá estão.
2. Adicionar as paisagens do banco em blocos secundários onde reforcem a narrativa.
3. Nos "corporate moments" (`GuestMomentsStrip` em `/corporate` e homepage), garantir que só passam as melhores fotos com pessoas + alta conversão.

## O que muda

### 1. `/corporate` — reforçar prova social + paisagem

- **GuestMomentsStrip**: auditar o `CORPORATE_SET` em `src/content/guest-moments.ts` e reduzir aos 6-8 momentos mais fortes com pessoas (grupos, brindes, refeições partilhadas). Retirar naturezas-mortas fracas se existirem.
- **Novo bloco ambiental "The landscapes you'll host in"** entre "Where it fits" e o CTA final: mini-galeria 3-up com Comporta boardwalk + Arrábida Espichel cliffs + Setúbal winery landscape (Viator). Legenda editorial curta, sem CTA. Sinaliza escala do território.

### 2. `/proposal-in-portugal` — adicionar cenário

- Novo bloco "The settings we work with" após os 3 cards de casais: 3 paisagens (Cabo Espichel sunset, palm-fronds turquoise bay Vicentine, Comporta cabanas) apresentadas como "onde o momento pode acontecer". Mantém todos os retratos actuais intactos.

### 3. `/multi-day` — enriquecer "Where it can go"

- Substituir o `imgCorkHarvest` isolado por uma tira de 3 paisagens (Comporta aerial, Vicentine cove, Sesimbra/Arrábida) mostrando amplitude geográfica dos itinerários multi-dia. Cork harvest passa para dentro do fluxo do texto como imagem pequena secundária, ou é removido se ficar redundante.

### 4. Homepage — curadoria dos "moments"

- Auditar `HOMEPAGE_SET` em `src/content/guest-moments.ts`: só as 8 fotos com pessoas de maior qualidade e emocionalmente ricas (brindes, casais, grupos em viewpoint, artesãos em acção). Fotos ambientais/paisagem saem daqui — vão para os novos blocos das páginas de conversão.
- CinematicHero (vídeo) fica intocado, conforme pedido.

### 5. Utilitário partilhado

- Novo componente `<AmbientLandscapeStrip>` em `src/components/ui/` (padrão editorial, 3 fotos, sem CTA, aspect 3:2, `buildResponsiveSrc` já integrado, `sizes="(min-width: 1024px) 33vw, 100vw"`). Usado nos 3 blocos ambientais acima — evita triplicar markup.

### 6. Fotos do banco → assets renderizáveis

As fotos do banco vivem em Supabase Storage privado (signed URLs, `useAdminTourPhotos`). Para páginas públicas sem tour associado, preciso:

- **Opção A (rápida)**: fazer download das 6-8 paisagens escolhidas e uploadar via `lovable-assets` como CDN pointers (`.asset.json`), consumo directo por `<AmbientLandscapeStrip>`. Zero signed-URL churn, cache CDN forte.
- **Opção B**: server fn pública que devolve signed URLs para um subset marcado como "public showcase". Mais infra, sem benefício visível.

**Recomendação: Opção A** — as fotos ficam no banco (fonte de verdade), e as duplicamos como assets CDN para uso editorial em páginas públicas.

## Regras editoriais (sem invenção)

- Cada foto ambiental usa a `alt` já registada em `tour_gallery_photos` (fiel ao local).
- Legendas curtas descrevem o **lugar**, não a experiência (evita implicar itinerários que não existem).
- Nenhum bloco novo introduz CTA, preço ou promessa.
- Motion: só o `reveal` padrão editorial (fade + translateY ≤16px).

## Testes

- `src/__tests__/image-alt-coverage.test.ts` já exige alt — o novo componente passa naturalmente.
- Snapshot de `<AmbientLandscapeStrip>` para lock de estrutura.

## Fora do escopo

- Trocar retratos actuais por paisagens.
- Mexer em hero video da homepage.
- Alterar `/about` (retrato da fundadora fica).
- Novas fotos além das já no banco.

## Entregáveis

- 1 componente novo (`AmbientLandscapeStrip`).
- 6-8 novos `.asset.json` (paisagens do banco em CDN).
- Blocos ambientais em `/corporate`, `/proposal-in-portugal`, `/multi-day`. /moments
- Curadoria de `HOMEPAGE_SET` + `CORPORATE_SET` em `guest-moments.ts`.
- 1 snapshot test.

Fotos com Alta qualidade nas páginas e Motion 