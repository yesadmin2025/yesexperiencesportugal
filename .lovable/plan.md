## Plano: Capa + galeria da Southwest Vicentine Coast

**Escolha da capa**
Uso `IMG_5241.jpeg` (baía turquesa emoldurada por palmeiras, costa selvagem ao fundo) como capa — é a imagem mais cinemática e "signature" das quatro, e representa bem a Costa Vicentina.

**Restantes fotos** vão para a galeria do mesmo tour:
- `IMG_5229.jpeg` — enseada com rochas e escadas de acesso
- `IMG_5221.jpeg` — criança na areia com Ilha do Pessegueiro ao fundo
- `IMG_5202.jpeg` — vista da vila costeira sobre a praia

**Passos técnicos**
1. Upload das 4 imagens para o bucket privado `tour-photos` via CDN pointers.
2. Inserir 4 linhas em `tour_gallery_photos` para `tour_id = 'southwest-vicentine-coast'`:
   - `IMG_5241` → `is_cover = true`, `sort_order = 0`
   - restantes → `is_cover = false`, `sort_order = 1, 2, 3` (alt descritivos por localização)
3. Substituir o pointer atual `src/assets/tours/southwest-vicentine-coast-cover.jpg.asset.json` pela nova capa para que o cartão do tour na página `/experiences` também actualize.
4. `useAdminTourPhotos` já ordena por `is_cover DESC, sort_order ASC`, portanto TourHero + GalleryStrip vão renderizar automaticamente com a capa nova primeiro.

Confirmas a escolha de `IMG_5241` como capa? Se preferires outra das quatro, digo qual e ajusto.
