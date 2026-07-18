/**
 * Floating summary bar for the /admin/image-swap batch mode. Shows how
 * many slots have a pending replacement and lets the admin publish or
 * clear the whole batch. Publishing routes through a single Sonner toast
 * with one undo that reverts every slot in the batch at once.
 */
import { Loader2, X, CheckCheck } from "lucide-react";

export type BatchPending = {
  slotIndex: number;
  photoSrc: string;
  photoName: string;
};

export function BatchSelectionBar({
  pending,
  saving,
  onClear,
  onPublish,
  onRemove,
}: {
  pending: BatchPending[];
  saving: boolean;
  onClear: () => void;
  onPublish: () => void;
  onRemove: (slotIndex: number) => void;
}) {
  if (pending.length === 0) return null;
  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[min(720px,calc(100vw-1.5rem))]">
      <div className="bg-[color:var(--charcoal)] text-[color:var(--ivory)] shadow-2xl border border-[color:var(--charcoal)]">
        <div className="p-3 flex items-center justify-between gap-3">
          <div className="text-[11px] uppercase tracking-[0.22em]">
            {pending.length} substituição{pending.length === 1 ? "" : "ões"} pronta
            {pending.length === 1 ? "" : "s"}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClear}
              disabled={saving}
              className="text-[11px] uppercase tracking-[0.22em] border border-white/30 px-3 py-1.5 disabled:opacity-60"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={onPublish}
              disabled={saving}
              className="inline-flex items-center gap-1.5 bg-[color:var(--gold)] text-[color:var(--charcoal)] text-[11px] uppercase tracking-[0.22em] px-3 py-1.5 disabled:opacity-60"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
              Publicar tudo
            </button>
          </div>
        </div>
        <ul className="px-3 pb-3 flex flex-wrap gap-1.5">
          {pending.map((p) => (
            <li
              key={p.slotIndex}
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] bg-white/10 px-2 py-1"
            >
              Slot {p.slotIndex + 1} · <span className="normal-case tracking-normal truncate max-w-[10rem]">{p.photoName}</span>
              <button
                type="button"
                onClick={() => onRemove(p.slotIndex)}
                aria-label={`Remover slot ${p.slotIndex + 1} do batch`}
                className="opacity-70 hover:opacity-100"
              >
                <X size={11} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
