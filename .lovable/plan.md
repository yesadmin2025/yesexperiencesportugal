## Objetivo

Evoluir `/admin/image-swap` de ferramenta funcional para painel de curadoria editorial com filtros, comparação rápida e deteção de duplicados — reduzindo o número de cliques para publicar uma troca e tornando visível *porquê* cada candidata foi sugerida.

Todas as alterações são no painel admin (protegido por `has_role admin`). Nenhum componente público muda; a leitura via `useEditorialOverrides` já funciona.

---

## 1. Filtros e ranking visível nos candidatos

No painel de candidatos (lado direito, por slot):

- **Barra de filtros** acima da grelha de candidatos:
  - **Fonte**: `owner-photo` · `admin-upload` · `ambient` (chips toggle).
  - **Tags**: chips derivados de `pool.ts` (`people`, `landscape`, `coast`, `craft`, `wine`, `food`, `place`) — multi-select AND.
  - **Qualidade estimada**: `alta` (≥1600px lado maior) · `média` (≥1000px) · `baixa` (<1000px ou desconhecida). Cálculo derivado de `width`/`height` do pool; para assets estáticos sem dimensões, marcar `desconhecida` e permitir excluir.
  - **Só não usadas**: toggle que esconde imagens já presentes em qualquer módulo (usa `buildUsageIndex`).
  - **Só orientação correta**: toggle já implícito no ranking, agora exposto.

- **Cartão de candidata** passa a mostrar:
  - Badge de qualidade (alta/média/baixa) + resolução real (`1920×2400`).
  - Badges de tags.
  - **Motivo do ranking**: linha compacta com `reason` já produzido por `rank.ts` (ex.: "combina com o tema (people, place) · orientação portrait correta · ainda não é usada").
  - Se `alreadyUsedIn.length > 0`, aviso âmbar com os módulos onde já aparece.

- Ordenação: manter score decrescente; adicionar toggle secundário `Mais recentes primeiro` (apenas para `admin-upload`, por `created_at`).

## 2. Comparação rápida e "Aplicar ao módulo"

- **Modo comparação rápida**: novo botão `Comparar` em cada cartão candidato abre um painel lateral (não modal bloqueante) com:
  - Slider antes/depois (`BeforeAfterSlider` existente).
  - Grelha secundária "Aplicar a outros slots deste módulo" com checkboxes por slot — permite substituir várias posições numa só publicação.
  - Ações: `Publicar troca` · `Guardar como rascunho` · `Descartar`.
- **Atalho "Aplicar ao módulo"**: botão inline no cartão candidato que aplica a candidata ao slot activo e publica em um clique (com toast `undo` durante 8s que reverte para o override anterior).
- **Navegação por teclado**: `←/→` para percorrer candidatas dentro do painel de comparação; `Enter` aplica; `Esc` fecha.
- **Contador de cliques poupados**: pequeno indicador `-N cliques hoje` apenas cosmético, ajuda a validar que o fluxo ficou mais curto.

## 3. Secção "Duplicados entre módulos"

Nova tab no topo do painel: **Auditoria de duplicados**.

- Lista agrupada por chave de duplicação:
  - **Duplicado exato (mesma origem)**: mesmo `src` em ≥2 módulos — resultado directo de `buildUsageIndex`.
  - **Duplicado de conteúdo**: para `admin-upload`, agrupar por `content_hash` já existente em `tour_gallery_photos`. Para assets estáticos, agrupar por nome de ficheiro base (ex.: `arrabida-viewpoint-*`) como aproximação — sem re-hash de imagens no browser.
- Cada grupo mostra:
  - Miniatura + nome + dimensões.
  - Lista de módulos/slots onde aparece (com link "Ir para slot").
  - **Sugestão de substituição**: top-1 candidata do stock para o módulo com pior encaixe temático (score mais baixo), reutilizando `rankCandidates` com o contexto desse módulo/slot.
  - Botão `Aplicar sugestão` que publica o override directamente (mesmo fluxo do atalho da secção 2).
- Contador global no cabeçalho: `X módulos com duplicados · Y imagens repetidas`.

---

## Detalhes técnicos

**Ficheiros novos**
- `src/lib/image-swap/quality.ts` — helper `estimateQuality(photo): 'alta'|'media'|'baixa'|'desconhecida'` a partir de `width/height` e heurística por nome.
- `src/lib/image-swap/duplicates.ts` — `findDuplicateGroups(modules, pool)` devolve `{ key, kind: 'exact'|'content'|'name', photos, usedIn: Slot[] }[]`.
- `src/components/admin/CandidateFilters.tsx` — barra de filtros controlada.
- `src/components/admin/CandidateCard.tsx` — extraído do route file, mostra badges + motivo + atalhos.
- `src/components/admin/QuickCompareDrawer.tsx` — painel lateral com slider + multi-slot apply.
- `src/components/admin/DuplicatesPanel.tsx` — tab de auditoria.

**Ficheiros editados**
- `src/routes/admin.image-swap.tsx` — introduzir tabs (`Slots` · `Duplicados`), estado de filtros, integrar novos componentes, atalho `applyAndPublish(slot, photo)`.
- `src/lib/image-swap/rank.ts` — expor `reason` já existente sem alterações de assinatura; adicionar campo opcional `qualityBoost` para dar leve preferência a `alta`.
- `src/lib/editorial-overrides.ts` — expor helper `publishOverride(moduleKey, slots)` que aceita batch (usado pelo multi-slot apply e pelo undo).

**Base de dados**
- Nenhuma migração nova necessária. Reutiliza `editorial_image_overrides` (com `status: 'published'|'draft'`) e `tour_gallery_photos.content_hash/width/height` já existentes.

**Testes**
- `src/__tests__/image-swap-duplicates.test.ts` — cobre exact/content/name grouping.
- `src/__tests__/image-swap-quality.test.ts` — thresholds e casos `desconhecida`.
- Reutilizar `editorial-image-uniqueness.test.ts` para garantir que a política global continua a passar após uma sessão de aplicação de sugestões.

**Fora de âmbito** (não fazer neste plano)
- Re-hash de assets estáticos no cliente.
- Alterar componentes públicos ou o `pool`/`registry` de módulos.
- Novas fontes de stock (Viator, uploads adicionais).
