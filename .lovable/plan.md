## Objetivo

Adicionar seleção múltipla no `/admin/image-swap` para publicar várias trocas de uma só vez, com **um único toast de undo** que reverte tudo em bloco. Reforçar que a ferramenta **só substitui slots pre existentes** (nunca adiciona novos ao fim do módulo) e que cada substituição privilegia qualidade premium + movimento editorial já existente. Retirar imagens adicionadas no fim das páginas . 

Sem novas migrações, sem alterações em componentes públicos, sem novos módulos ou slots.

---

## 1. Modo seleção múltipla (batch)

No painel de slots do módulo activo:

- **Toggle "Selecção múltipla"** no topo do módulo. Quando activo:
  - Cada slot mostra uma checkbox.
  - Cada cartão de candidata mostra um botão `Atribuir ao slot X` (dropdown com os slots seleccionados) em vez do `Aplicar` de um clique.
  - Painel flutuante inferior com resumo: `N slots seleccionados · M substituições prontas` e ações `Publicar tudo` · `Limpar`.
- **Regras de segurança (reforço explícito no UI)**:
  - Só é possível atribuir candidatas a slots que **já existem** no `EDITORIAL_MODULES[key].defaults`. Não há botão "adicionar slot".
  - Aviso visível: *"Esta acção substitui a imagem actual do slot. Nunca acrescenta imagens novas ao módulo."*
  - Se a candidata escolhida tiver `estimateQuality === 'baixa'` face à actual (`alta`/`media`), badge âmbar `Qualidade inferior à actual` e confirmação extra antes de entrar no batch.
  - Bloquear a inclusão no batch quando a candidata já é usada noutro slot **do mesmo módulo** (evita duplicar dentro do próprio strip).

## 2. Publicação em lote com um único undo

- Novo helper `publishOverridesBatch(moduleKey, entries[])` em `src/lib/editorial-overrides.ts`:
  - Lê os overrides actuais dos slots afectados (para snapshot de reversão).
  - Faz um único `upsert` na tabela `editorial_image_overrides` com todas as linhas (status `published`).
  - Devolve `{ applied: Entry[], previous: (Entry|null)[] }`.
- `applyBatch()` no route file:
  - Chama o helper.
  - Mostra **um único toast Sonner**: `N substituições publicadas · Desfazer` com 10s de duração.
  - `Desfazer` chama `publishOverridesBatch` com o snapshot `previous` (repõe overrides antigos ou apaga linhas que não existiam antes via `deleteOverrides(moduleKey, slotIndexes)`).
  - Falha parcial: se algum upsert falhar, o toast passa a erro e nenhum override é aplicado (usar transacção via RPC ou upsert único — preferir upsert único, já é atómico por linha; em erro mostrar quais slots falharam e não oferecer undo).

## 3. Reforço "só substituir, nunca acrescentar"

- Remover/ocultar qualquer UI que sugira acrescentar imagens (não existe hoje, mas garantir que o Duplicates panel também usa apenas `Aplicar sugestão` sobre um slot existente).
- Adicionar teste `src/__tests__/image-swap-slot-invariants.test.ts` que garante:
  - `publishOverridesBatch` rejeita `slotIndex >= defaults.length`.
  - Nenhum código-path chama `insert` sem `slot_index` válido dentro do intervalo do módulo.
- Copy no topo do painel: *"Curadoria = substituir imagens actuais por melhores versões reais. O número de imagens de cada módulo é fixo."*

## 4. Qualidade premium + movimento (garantir que já se aplica)

Sem tocar em componentes públicos, garantir que o pipeline actual continua a servir:

- `AmbientLandscapeStrip` e `GuestMomentsStrip` já usam a animação editorial `settle` (ver `src/styles.css`) e `responsive-image.ts` para `srcSet` AVIF/WebP. Confirmar via leitura que continua ligada após overrides (o helper actual só troca `src/alt/caption`, mantém wrapper → OK).
- No painel admin, adicionar badge `Movimento editorial activo` no cabeçalho de cada módulo apenas como lembrete visual (link para a memória `homepage-energy-motion` / `editorial-palette-v2`).
- Priorizar candidatas `alta` no ranking: aumentar peso quando `estimateQuality === 'alta'` (`+2`), penalizar `baixa` (`-2`) em `rank.ts`. Não altera assinatura pública.

---

## Detalhes técnicos

**Ficheiros novos**

- `src/components/admin/BatchSelectionBar.tsx` — barra flutuante inferior com resumo e ações.
- `src/__tests__/image-swap-slot-invariants.test.ts` — invariante "só substituir".

**Ficheiros editados**

- `src/lib/editorial-overrides.ts` — adicionar `publishOverridesBatch()` e `deleteOverrides()` (helpers server-side via `supabase` client já autenticado; RLS admin-only mantém-se).
- `src/lib/image-swap/rank.ts` — incorporar `qualityBoost` já previsto no plano anterior mas ainda não aplicado.
- `src/routes/admin.image-swap.tsx` — estado `selection: Map<slotIndex, PoolPhoto>`, toggle de modo batch, integração da `BatchSelectionBar`, `applyBatch()` + toast único com undo.
- `src/components/admin/CandidateCard.tsx` — quando `batchMode`, mostrar `Atribuir a slot…` em vez de `Aplicar`; badges de qualidade inferior/duplicado no módulo.

**Base de dados**

- Nenhuma migração. Reutiliza `editorial_image_overrides` com upsert por `(module_key, slot_index)`.

**Fora de âmbito**

- Adicionar novos slots ou módulos.
- Alterar componentes públicos, motion tokens, ou pool de stock.
- Batch cross-module (o undo teria de reverter em vários módulos — mantemos batch por módulo activo para o undo ser previsível).