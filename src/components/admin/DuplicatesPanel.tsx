/**
 * Duplicates audit tab for /admin/image-swap.
 *
 * Lists exact / content / name-stem duplicate groups across all editorial
 * modules and suggests a top-1 replacement for the module with the lowest
 * ranking score (reusing rankCandidates).
 */
import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import type { EditorialModuleKey, EditorialSlot } from "@/lib/editorial-overrides";
import type { PoolPhoto } from "@/lib/image-swap/pool";
import { findDuplicateGroups, type SlotRef } from "@/lib/image-swap/duplicates";
import { rankCandidates } from "@/lib/image-swap/rank";
import { EDITORIAL_MODULES } from "@/lib/image-swap/registry";

export function DuplicatesPanel({
  effectiveByModule,
  pool,
  usageIndex,
  onApply,
  onJumpToSlot,
}: {
  effectiveByModule: Map<EditorialModuleKey, EditorialSlot[]>;
  pool: PoolPhoto[];
  usageIndex: Map<string, string[]>;
  onApply: (moduleKey: EditorialModuleKey, slotIndex: number, candidate: PoolPhoto) => void;
  onJumpToSlot: (moduleKey: EditorialModuleKey, slotIndex: number) => void;
}) {
  const moduleLabels = useMemo(
    () => new Map(EDITORIAL_MODULES.map((m) => [m.key, m.label])),
    [],
  );
  const groups = useMemo(
    () => findDuplicateGroups(effectiveByModule, moduleLabels, pool),
    [effectiveByModule, moduleLabels, pool],
  );

  const totalDuplicates = groups.length;
  const modulesAffected = new Set(groups.flatMap((g) => g.usedIn.map((r) => r.moduleKey))).size;

  if (groups.length === 0) {
    return (
      <div className="border border-[color:var(--border)] bg-white p-6 text-center">
        <p className="text-sm text-[color:var(--charcoal-soft)]">
          Nenhum duplicado detectado entre os módulos editoriais.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
        <AlertTriangle size={12} className="text-[color:var(--gold)]" />
        {modulesAffected} módulos · {totalDuplicates} grupos de duplicados
      </div>

      {groups.map((group) => {
        const primary = group.photos[0];
        return (
          <div key={group.key} className="border border-[color:var(--border)] p-4 bg-white">
            <div className="flex gap-4">
              <div className="w-24 flex-shrink-0">
                <div className="aspect-square bg-[color:var(--sand)] overflow-hidden">
                  {primary && (
                    <img
                      src={primary.src}
                      alt={primary.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]">
                  <span className="bg-[color:var(--gold)] text-[color:var(--charcoal)] px-1.5 py-0.5">
                    {group.kind}
                  </span>
                  {primary && (
                    <span className="text-[color:var(--charcoal-soft)] truncate">
                      {primary.name}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-[color:var(--charcoal-soft)]">
                  Aparece em:
                </p>
                <ul className="mt-1 space-y-1">
                  {group.usedIn.map((ref) => (
                    <li
                      key={`${ref.moduleKey}-${ref.slotIndex}`}
                      className="flex items-center gap-2 text-[12px]"
                    >
                      <button
                        type="button"
                        onClick={() => onJumpToSlot(ref.moduleKey, ref.slotIndex)}
                        className="underline text-[color:var(--teal)] hover:text-[color:var(--charcoal)]"
                      >
                        {ref.moduleLabel} · slot {ref.slotIndex + 1}
                      </button>
                      <Suggestion
                        moduleKey={ref.moduleKey}
                        slot={ref.slot}
                        pool={pool}
                        usageIndex={usageIndex}
                        onApply={(c) => onApply(ref.moduleKey, ref.slotIndex, c)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Suggestion({
  moduleKey,
  slot,
  pool,
  usageIndex,
  onApply,
}: {
  moduleKey: EditorialModuleKey;
  slot: EditorialSlot;
  pool: PoolPhoto[];
  usageIndex: Map<string, string[]>;
  onApply: (candidate: PoolPhoto) => void;
}) {
  const suggestion = useMemo(() => {
    const module = EDITORIAL_MODULES.find((m) => m.key === moduleKey);
    if (!module) return null;
    const ranked = rankCandidates(
      pool,
      {
        currentSrc: slot.src,
        desiredOrientation: module.orientation,
        desiredTags: module.desiredTags,
      },
      usageIndex,
      1,
    );
    return ranked[0] ?? null;
  }, [moduleKey, slot.src, pool, usageIndex]);

  if (!suggestion) return null;
  return (
    <button
      type="button"
      onClick={() => onApply(suggestion.photo)}
      className="text-[10px] uppercase tracking-[0.18em] border border-[color:var(--border)] px-2 py-0.5 hover:bg-[color:var(--sand)]"
      title={suggestion.reason}
    >
      Substituir por sugestão
    </button>
  );
}
