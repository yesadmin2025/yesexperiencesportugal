import { useCallback, useMemo, useState } from "react";
import { useSearch, useNavigate } from "@tanstack/react-router";
import { EditorialMap, type EditorialMapStop } from "@/components/maps/EditorialMap";
import { lookupStopGeo } from "@/lib/studio/stop-lookup";
import { useRouteLegMinutes, type RouteLegStop } from "@/hooks/use-route-leg-minutes";
import type { SignatureTour } from "@/data/signatureTours";

interface Props {
  /** All featured Signature tours for this destination — the first is the default map anchor. */
  tours: SignatureTour[];
  /** Regional caption shown along the map bottom (e.g. "Setúbal · Arrábida"). */
  regionLabel: string;
}

/**
 * PlanDestinationMap — geographic route preview with shareable URL state.
 *
 * URL contract (read via `useSearch({ strict: false })`, so it works
 * under any /plan/* child route without adding a per-route schema):
 *
 *   ?tour=<signature-id>&stop=<index>
 *
 *   - `tour` selects which of the destination's featured Signature
 *     tours drives the map. Falls back to the first tour when absent
 *     or unresolvable.
 *   - `stop` (0-based) focuses one pin — it renders larger with an
 *     ivory core + persistent pulse and is included in the pageload
 *     aria label. Out-of-range values are ignored.
 *
 * A "Copy link" button writes the current tour + stop state to the URL
 * and copies it to the clipboard so travellers can share the exact
 * route/pin they're looking at.
 *
 * Coordinates come from the real `REGION_STOPS` catalog via
 * `lookupStopGeo` — never invented. Drive-time chips use real OSRM
 * minutes via `useRouteLegMinutes`. If fewer than two stops resolve
 * to real coordinates for the active tour, the component renders
 * nothing (no placeholder map, no fabricated geography).
 */
export function PlanDestinationMap({ tours, regionLabel }: Props) {
  const search = useSearch({ strict: false }) as {
    tour?: unknown;
    stop?: unknown;
  };
  const navigate = useNavigate();

  const featured = useMemo(() => tours.slice(0, 3), [tours]);

  // Resolve active tour from ?tour= (fallback to first featured).
  const requestedTourId =
    typeof search.tour === "string" ? search.tour : undefined;
  const activeTour =
    featured.find((t) => t.id === requestedTourId) ?? featured[0];

  const resolved = useMemo(() => {
    if (!activeTour) return [] as { label: string; lat: number; lng: number }[];
    const out: { label: string; lat: number; lng: number }[] = [];
    for (const s of activeTour.stops) {
      const geo = lookupStopGeo(s.label);
      if (!geo) continue;
      out.push({ label: s.label, lat: geo.lat, lng: geo.lng });
    }
    return out.filter(
      (p, i, arr) => i === 0 || p.lat !== arr[i - 1].lat || p.lng !== arr[i - 1].lng,
    );
  }, [activeTour]);

  const legStops = useMemo<RouteLegStop[]>(
    () =>
      resolved.map((s, i) => ({
        key: `${activeTour?.id ?? "map"}-${i}`,
        lat: s.lat,
        lng: s.lng,
      })),
    [resolved, activeTour?.id],
  );
  const { legMinutes } = useRouteLegMinutes(legStops, resolved.length >= 2);

  // Focused stop index from ?stop=, clamped to the resolved list.
  const focusedIndex = useMemo(() => {
    const raw =
      typeof search.stop === "string"
        ? parseInt(search.stop, 10)
        : typeof search.stop === "number"
          ? search.stop
          : NaN;
    if (!Number.isFinite(raw)) return -1;
    return raw >= 0 && raw < resolved.length ? raw : -1;
  }, [search.stop, resolved.length]);

  const setStop = useCallback(
    (nextIndex: number) => {
      if (!activeTour) return;
      navigate({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        to: "." as any,
        // Preserve any unrelated search params travellers may be
        // carrying (locale toggles, campaign attribution, etc.).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        search: ((prev: Record<string, unknown>) => ({
          ...prev,
          tour: activeTour.id,
          stop: nextIndex,
        })) as any,
        replace: true,
      });
    },
    [activeTour, navigate],
  );

  const setTour = useCallback(
    (tourId: string) => {
      navigate({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        to: "." as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        search: ((prev: Record<string, unknown>) => {
          const next = { ...prev, tour: tourId };
          // Clear stop when switching tours — the index is only
          // meaningful for the tour it was captured against.
          delete (next as Record<string, unknown>).stop;
          return next;
        }) as any,
        replace: true,
      });
    },
    [navigate],
  );

  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const copyShareLink = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      if (activeTour) url.searchParams.set("tour", activeTour.id);
      if (focusedIndex >= 0) url.searchParams.set("stop", String(focusedIndex));
      else url.searchParams.delete("stop");
      await navigator.clipboard.writeText(url.toString());
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2000);
    }
  }, [activeTour, focusedIndex]);

  if (!activeTour || resolved.length < 2) return null;

  const mapStops: EditorialMapStop[] = resolved.map((s) => ({
    label: s.label,
    lat: s.lat,
    lng: s.lng,
  }));

  const totalMin = (legMinutes ?? []).reduce<number>(
    (acc, m) => acc + (typeof m === "number" ? m : 0),
    0,
  );
  const footerRight =
    totalMin > 0
      ? `${resolved.length} stops · ${Math.round(totalMin)} min drive`
      : `${resolved.length} stops`;

  const focusedLabel =
    focusedIndex >= 0 ? resolved[focusedIndex]?.label : undefined;
  const ariaLabel = focusedLabel
    ? `Route map for ${activeTour.title} — ${resolved.length} stops across ${regionLabel}, focused on ${focusedLabel}`
    : `Route map for ${activeTour.title} — ${resolved.length} stops across ${regionLabel}`;

  return (
    <div>
      {featured.length > 1 ? (
        <div
          role="tablist"
          aria-label="Signature route on the map"
          className="mb-4 flex flex-wrap items-center justify-center gap-2"
        >
          {featured.map((t) => {
            const isActive = t.id === activeTour.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTour(t.id)}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] font-semibold transition-colors ${
                  isActive
                    ? "bg-[color:var(--charcoal)] text-[color:var(--ivory)] border-[color:var(--charcoal)]"
                    : "bg-transparent text-[color:var(--charcoal-soft)] border-[color:var(--gold-soft)]/60 hover:border-[color:var(--gold)]/80"
                }`}
              >
                {t.title}
              </button>
            );
          })}
        </div>
      ) : null}

      <EditorialMap
        stops={mapStops}
        legMinutes={legMinutes ?? undefined}
        eyebrow="Where you'll go"
        meta={regionLabel}
        caption={activeTour.title}
        footerRight={footerRight}
        tone="dark"
        aspectRatio="4 / 5"
        className="w-full h-full rounded-sm"
        ariaLabel={ariaLabel}
        focusedIndex={focusedIndex}
      />

      {/* Stop-focus row + share link. Each chip encodes ?stop=<i>. */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-1.5">
          {resolved.map((s, i) => {
            const isFocused = i === focusedIndex;
            return (
              <li key={`${s.label}-${i}`}>
                <button
                  type="button"
                  onClick={() => setStop(isFocused ? -1 : i)}
                  aria-pressed={isFocused}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] uppercase tracking-[0.22em] font-semibold transition-colors ${
                    isFocused
                      ? "bg-[color:var(--gold)]/15 text-[color:var(--charcoal)] border-[color:var(--gold)]"
                      : "bg-transparent text-[color:var(--charcoal-soft)] border-[color:var(--gold-soft)]/50 hover:border-[color:var(--gold)]/70"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      isFocused ? "bg-[color:var(--gold)]" : "bg-[color:var(--gold-soft)]"
                    }`}
                  />
                  {i + 1}. {s.label}
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={copyShareLink}
          className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--gold-soft)]/60 px-3 py-1.5 text-[10.5px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal)] hover:border-[color:var(--gold)]/80 transition-colors"
          aria-live="polite"
        >
          {copyState === "copied"
            ? "Link copied"
            : copyState === "error"
              ? "Copy failed"
              : "Copy link to this view"}
        </button>
      </div>
    </div>
  );
}
