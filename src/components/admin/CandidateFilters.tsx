/**
 * Filters for the /admin/image-swap candidate grid.
 * Controlled component — parent owns state.
 */
import type { PoolSource } from "@/lib/image-swap/pool";
import type { QualityTier } from "@/lib/image-swap/quality";

export type CandidateFilterState = {
  sources: Set<PoolSource>;
  tags: Set<string>;
  qualities: Set<QualityTier>;
  onlyFresh: boolean;
  onlyOrientationMatch: boolean;
};

export const ALL_SOURCES: PoolSource[] = ["owner-photo", "admin-upload"];
export const ALL_TAGS = [
  "people",
  "place",
  "landscape",
  "coast",
  "craft",
  "wine",
  "food",
] as const;
export const ALL_QUALITIES: QualityTier[] = ["alta", "media", "baixa", "desconhecida"];

const SOURCE_LABEL: Record<PoolSource, string> = {
  "owner-photo": "Owner",
  "admin-upload": "Uploads",
};
const QUALITY_LABEL: Record<QualityTier, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
  desconhecida: "?",
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] border ${
        active
          ? "bg-[color:var(--charcoal)] text-[color:var(--ivory)] border-[color:var(--charcoal)]"
          : "bg-white text-[color:var(--charcoal-soft)] border-[color:var(--border)]"
      }`}
    >
      {children}
    </button>
  );
}

export function CandidateFilters({
  value,
  onChange,
}: {
  value: CandidateFilterState;
  onChange: (v: CandidateFilterState) => void;
}) {
  function toggle<T>(set: Set<T>, item: T): Set<T> {
    const next = new Set(set);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next;
  }

  return (
    <div className="space-y-2 text-[10px]">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)] mr-1">
          Fonte
        </span>
        {ALL_SOURCES.map((s) => (
          <Chip
            key={s}
            active={value.sources.has(s)}
            onClick={() => onChange({ ...value, sources: toggle(value.sources, s) })}
          >
            {SOURCE_LABEL[s]}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)] mr-1">
          Qualidade
        </span>
        {ALL_QUALITIES.map((q) => (
          <Chip
            key={q}
            active={value.qualities.has(q)}
            onClick={() => onChange({ ...value, qualities: toggle(value.qualities, q) })}
          >
            {QUALITY_LABEL[q]}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)] mr-1">
          Tags
        </span>
        {ALL_TAGS.map((t) => (
          <Chip
            key={t}
            active={value.tags.has(t)}
            onClick={() => onChange({ ...value, tags: toggle(value.tags, t) })}
          >
            {t}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={value.onlyFresh}
            onChange={(e) => onChange({ ...value, onlyFresh: e.target.checked })}
          />
          <span className="uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
            Só não usadas
          </span>
        </label>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={value.onlyOrientationMatch}
            onChange={(e) => onChange({ ...value, onlyOrientationMatch: e.target.checked })}
          />
          <span className="uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
            Só orientação certa
          </span>
        </label>
      </div>
    </div>
  );
}

export function defaultFilterState(): CandidateFilterState {
  return {
    sources: new Set(ALL_SOURCES),
    tags: new Set(),
    qualities: new Set<QualityTier>(["alta", "media", "desconhecida"]),
    onlyFresh: false,
    onlyOrientationMatch: false,
  };
}
