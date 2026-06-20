import { Loader2, MapPin, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

export interface RegionStop {
  key: string;
  label: string;
  blurb: string | null;
  tag: string | null;
  lat: number;
  lng: number;
  duration_minutes: number;
}

export interface StopEligibility {
  key: string;
  eligible: boolean;
  reason?: string;
  kmFromLastStop: number;
  driveMinutesFromLastStop: number;
  projectedTotalKm: number;
  projectedExperienceMinutes: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  stops: RegionStop[];
  eligibility: Record<string, StopEligibility>;
  onAdd: (stopKey: string) => void;
  rules: { max_km_between_stops: number; max_total_km_per_day: number } | null;
  /** Initial selection of "showOnly eligible" toggle. Default true. */
  defaultEligibleOnly?: boolean;
  /** AI-suggested keys (badge + boosted to the top). */
  suggestedKeys?: string[];
}

export function AddStopSheet({
  open,
  onClose,
  loading,
  stops,
  eligibility,
  onAdd,
  rules,
  defaultEligibleOnly = true,
  suggestedKeys = [],
}: Props) {
  const [query, setQuery] = useState("");
  const [eligibleOnly, setEligibleOnly] = useState(defaultEligibleOnly);

  const suggestedSet = useMemo(() => new Set(suggestedKeys), [suggestedKeys]);
  const suggestedRank = useMemo(() => {
    const m = new Map<string, number>();
    suggestedKeys.forEach((k, i) => m.set(k, i));
    return m;
  }, [suggestedKeys]);

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stops
      .filter((s) =>
        q ? s.label.toLowerCase().includes(q) || (s.tag ?? "").toLowerCase().includes(q) : true,
      )
      .map((s) => ({ s, e: eligibility[s.key] }))
      .filter(({ e }) => (eligibleOnly ? e?.eligible : true))
      .sort((a, b) => {
        const sa = suggestedRank.has(a.s.key) ? 0 : 1;
        const sb = suggestedRank.has(b.s.key) ? 0 : 1;
        if (sa !== sb) return sa - sb;
        if (sa === 0) {
          return (suggestedRank.get(a.s.key) ?? 0) - (suggestedRank.get(b.s.key) ?? 0);
        }
        const ae = a.e?.eligible ? 0 : 1;
        const be = b.e?.eligible ? 0 : 1;
        if (ae !== be) return ae - be;
        return (a.e?.kmFromLastStop ?? 999) - (b.e?.kmFromLastStop ?? 999);
      });
  }, [stops, eligibility, query, eligibleOnly, suggestedRank]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full sm:max-w-lg max-h-[88svh] overflow-hidden rounded-t-[8px] sm:rounded-[2px] bg-[color:var(--ivory)] shadow-[0_28px_60px_-24px_rgba(46,46,46,0.55)] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[color:var(--charcoal)]/10 px-5 pt-5 pb-4">
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.26em] font-bold text-[color:var(--gold)]">
              Add a stop
            </p>
            <h3 className="serif mt-1 text-[1.25rem] leading-tight font-semibold text-[color:var(--charcoal)]">
              What's reachable from here
            </h3>
            {rules && (
              <p className="mt-1 text-[11px] text-[color:var(--charcoal)]/55">
                Within {rules.max_km_between_stops} km of last stop · max{" "}
                {rules.max_total_km_per_day} km/day
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--charcoal)]/5 hover:bg-[color:var(--charcoal)]/10"
          >
            <X size={16} />
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 border-b border-[color:var(--charcoal)]/10 px-5 py-3">
          <div className="relative flex-1">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[color:var(--charcoal)]/40"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search stops…"
              className="w-full rounded-[2px] border border-[color:var(--charcoal)]/15 bg-[color:var(--ivory)] py-1.5 pl-8 pr-2.5 text-[13px] text-[color:var(--charcoal)] placeholder:text-[color:var(--charcoal)]/40 focus:border-[color:var(--gold)] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setEligibleOnly((v) => !v)}
            aria-pressed={eligibleOnly}
            className={[
              "shrink-0 rounded-full border px-3 py-1.5 text-[10.5px] uppercase tracking-[0.2em] font-bold transition-colors",
              eligibleOnly
                ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10 text-[color:var(--charcoal)]"
                : "border-[color:var(--charcoal)]/20 text-[color:var(--charcoal)]/60",
            ].join(" ")}
          >
            Eligible only
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-[12.5px] text-[color:var(--charcoal)]/60">
              <Loader2 size={14} className="animate-spin text-[color:var(--gold)]" />
              Checking what fits your day…
            </div>
          ) : sorted.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-[color:var(--charcoal)]/60">
              {eligibleOnly
                ? "Nothing else fits within the radius for this day. Try removing a stop or starting a new day."
                : "No matching stops."}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5 px-1">
              {sorted.map(({ s, e }) => {
                const eligible = e?.eligible ?? false;
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      onClick={() => eligible && onAdd(s.key)}
                      disabled={!eligible}
                      className={[
                        "group relative flex w-full items-start gap-3 rounded-[2px] border p-3 text-left transition-colors",
                        eligible
                          ? "border-[color:var(--charcoal)]/12 bg-[color:var(--ivory)] hover:border-[color:var(--gold)] hover:bg-[color:var(--gold)]/5"
                          : "border-[color:var(--charcoal)]/8 bg-[color:var(--sand)]/30 opacity-60 cursor-not-allowed",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                          eligible
                            ? "bg-[color:var(--teal)] text-[color:var(--ivory)]"
                            : "bg-[color:var(--charcoal)]/20 text-[color:var(--charcoal)]/60",
                        ].join(" ")}
                      >
                        <MapPin size={13} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold leading-tight text-[color:var(--charcoal)]">
                          {s.label}
                          {suggestedSet.has(s.key) && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-[color:var(--gold)]/15 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] font-bold text-[color:var(--gold)] align-middle">
                              Suggested
                            </span>
                          )}
                        </p>
                        {s.tag && (
                          <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.18em] text-[color:var(--gold)]">
                            {s.tag}
                          </p>
                        )}
                        <p className="mt-1 text-[11.5px] text-[color:var(--charcoal)]/65">
                          {e
                            ? `${e.kmFromLastStop} km · ${e.driveMinutesFromLastStop} min drive`
                            : ""}
                          {!eligible && e?.reason ? ` · ${e.reason}` : ""}
                        </p>
                      </div>
                      {eligible && (
                        <span className="self-center text-[color:var(--gold)] opacity-0 transition-opacity group-hover:opacity-100">
                          <Plus size={16} />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
