# Comparador de imagens no admin — antes de substituir

Nova página `/admin/image-swap` (mesmo gate admin de `/admin/photos`) que permite, para cada slot editorial do site, ver a imagem **atual** lado a lado com as **melhores alternativas reais do stock** e aplicar a troca com um clique — sem editar código à mão.

## Fluxo

1. Selecionar módulo no topo (`Homepage Moments`, `About Moments`, `Corporate Moments`, `Multi-day Moments`, `Corporate Ambient`, `Proposal Ambient`, `Multi-day Ambient`, `Tour hero/cover` por tour).
2. Ver a lista de slots do módulo. Cada slot mostra:
  - Imagem atual (thumb grande) + legenda/alt atual + dimensões + score de qualidade.
  - Botão **"Ver alternativas"** que abre um painel com candidatos do stock ordenados por adequação.
3. Painel de candidatos mostra até 12 alternativas com:
  - Miniatura, dimensões, fonte (`owner-photo` / `admin-upload` / `tour-gallery`).
  - Motivo do ranking (ex.: "mesma paleta costeira", "orientação vertical", "resolução 2400px", "ainda não usada em nenhum módulo").
  - Aviso se a alternativa já está a ser usada noutro módulo (evita novo duplicado).
4. Selecionar candidato → abre **modo Comparar** ecrã inteiro (antes | depois) com slider arrastável (estilo before/after), no viewport mobile por defeito (o utilizador trabalha em mobile) e toggle para desktop.
5. **Aplicar** grava a troca. **Guardar rascunho** deixa a troca pendente para revisão.
6. Após selecionadas, editar para qualidade premium e ao coloca las adicionar animações premmium de alta qualidade 

## Como as trocas são persistidas (sem reescrever ficheiros)

Novo mapa de overrides guardado em Supabase, lido pelos módulos existentes com fallback para os defaults atuais em `guest-moments.ts` / `AmbientLandscapeStrip.tsx`. Zero refactor dos consumidores públicos.

- Nova tabela `public.editorial_image_overrides` com:
  - `module_key` (ex.: `homepage_moments`), `slot_index`, `photo_src`, `alt`, `caption`, `status` (`draft` | `published`), `updated_by`, `updated_at`.
  - Grants: `SELECT` a `anon` + `authenticated` só para `status = 'published'` (via policy); `ALL` para admins via `has_role`; `service_role` total.
  - RLS ligada.
- Novo helper `src/lib/editorial-overrides.ts` + hook `useEditorialOverrides(moduleKey)` que faz merge com o array default. Os módulos existentes passam a chamar esse hook — mudança mínima, comportamento idêntico quando não há overrides.

## Ranking de candidatos

Utilitário puro `src/lib/image-swap/rank.ts`:

- Recolhe pool de: `src/assets/owner-photos/*`, `tour_gallery_photos`, `src/assets/ambient/*`.
- Exclui imagens já usadas em qualquer módulo (via registro do painel de auditoria já planeado) — reaproveita `src/lib/image-audit/registry.ts`.
- Score = resolução (peso alto) + orientação compatível com o slot + tag temática (people/landscape/craft/food) inferida do nome/pasta + bónus se ainda inédita.
- Retorna top-N com razão legível em PT.

## Segurança e permissões

- Rota `admin.image-swap.tsx` com o mesmo padrão de proteção de `admin.photos.tsx` (verifica `has_role admin`).
- Server functions em `src/lib/admin-image-swap.functions.ts`:
  - `listSwapCandidates({ moduleKey, slotIndex })` — admin only.
  - `saveOverride({ moduleKey, slotIndex, photo, status })` — admin only.
  - `publishOverride({ id })` / `revertOverride({ id })` — admin only.
- `service_role` só é usado dentro do handler, depois de confirmar admin via `context.supabase.rpc('has_role', ...)`.

## Ficheiros

- `src/routes/admin.image-swap.tsx` (novo) — UI.
- `src/components/admin/BeforeAfterSlider.tsx` (novo) — comparador arrastável, respeita `prefers-reduced-motion`.
- `src/lib/image-swap/rank.ts` (novo) + teste.
- `src/lib/editorial-overrides.ts` (novo) + hook.
- `src/lib/admin-image-swap.functions.ts` (novo).
- Migração Supabase: cria `editorial_image_overrides` com GRANTs, RLS e policies.
- Pequena edição em `src/content/guest-moments.ts` e `src/components/ui/AmbientLandscapeStrip.tsx` para consumir overrides publicados (fallback = comportamento atual).
- Teste que garante que overrides publicados não introduzem duplicados globais (reaproveita `editorial-image-uniqueness.test.ts`).

## Fora do âmbito

- Não altera arrays default no código — trocas ficam em BD, revertíveis.
- Não gera imagens; só escolhe entre reais existentes.
- Não mexe em capas de tour dentro do `admin/photos` (esse fluxo já existe); apenas as expõe como pool de origem.