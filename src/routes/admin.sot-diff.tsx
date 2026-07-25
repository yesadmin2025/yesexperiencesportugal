/**
 * Admin — SoT vs. Viator (legacy) field-by-field diff.
 *
 * For each Signature tour that has a Source-of-Truth entry, compare every
 * field against the legacy VIATOR_META + signatureTours blueprint and show
 * which YES surfaces would render differently.
 *
 * Read-only. No mutations. Complements /admin/sot-refresh (extract + paste)
 * and /admin/viator-validation (stop/inclusion presence).
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SIGNATURE_SOURCE_OF_TRUTH } from "@/data/signatureToursSourceOfTruth";
import { signatureTours } from "@/data/signatureTours";
import { VIATOR_META } from "@/data/signatureToursViator";

export const Route = createFileRoute("/admin/sot-diff")({
  head: () => ({
    meta: [
      { title: "SoT vs Viator diff — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SotDiffPage,
});

type FieldStatus = "match" | "diff" | "sot-only" | "legacy-only" | "no-legacy";

type FieldDiff = {
  field: string;
  status: FieldStatus;
  sotValue: unknown;
  legacyValue: unknown;
  surfaces: string[];
  note?: string;
};

/** Which surfaces read each field via getTourContent / direct legacy. */
const SURFACE_MAP: Record<string, string[]> = {
  overview: ["Tour detail intro", "Studio V3 reveal", "Checkout summary"],
  highlights: ["Tour detail highlights", "Homepage cards"],
  included: [
    "Tour detail inclusions",
    "Tailor page inclusions",
    "Checkout summary",
    "Builder V3 investment reveal",
  ],
  notIncluded: ["Tour detail exclusions block"],
  itinerary: [
    "Tour detail chapter timeline",
    "Studio V3 story-of-day",
    "SignatureRouteMap notes",
    "tourProductLd JSON-LD",
  ],
  durationMinutes: ["Tour detail duration chip", "Studio V3 timing"],
  title: ["Tour detail H1", "og:title"],
};

function normalize(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return JSON.stringify(v.map((x) => normalize(x)));
  if (typeof v === "object") return JSON.stringify(v);
  return String(v).trim().toLowerCase().replace(/\s+/g, " ");
}

function arrayDiff(sot: string[], legacy: string[]) {
  const s = new Set(sot.map(normalize));
  const l = new Set(legacy.map(normalize));
  const onlySot = sot.filter((x) => !l.has(normalize(x)));
  const onlyLegacy = legacy.filter((x) => !s.has(normalize(x)));
  return { onlySot, onlyLegacy, equal: onlySot.length === 0 && onlyLegacy.length === 0 };
}

function buildDiffs(tourId: string): FieldDiff[] {
  const sot = SIGNATURE_SOURCE_OF_TRUTH[tourId]!;
  const tour = signatureTours.find((t) => t.id === tourId) ?? null;
  const meta = VIATOR_META[tourId];
  const rows: FieldDiff[] = [];

  const push = (
    field: string,
    status: FieldStatus,
    sotValue: unknown,
    legacyValue: unknown,
    note?: string,
  ) =>
    rows.push({
      field,
      status,
      sotValue,
      legacyValue,
      surfaces: SURFACE_MAP[field] ?? [],
      note,
    });

  // Title
  if (tour) {
    push(
      "title",
      normalize(sot.title) === normalize(tour.title) ? "match" : "diff",
      sot.title,
      tour.title,
    );
  }

  // Overview
  const legacyOverview = meta?.overview ?? null;
  if (legacyOverview == null) push("overview", "sot-only", sot.overview, null);
  else
    push(
      "overview",
      normalize(sot.overview) === normalize(legacyOverview) ? "match" : "diff",
      sot.overview,
      legacyOverview,
    );

  // Highlights
  const legacyHi = tour?.highlights ?? [];
  const hi = arrayDiff(sot.highlights, legacyHi);
  push(
    "highlights",
    legacyHi.length === 0 ? "sot-only" : hi.equal ? "match" : "diff",
    sot.highlights,
    legacyHi,
    hi.equal
      ? undefined
      : `${hi.onlySot.length} added, ${hi.onlyLegacy.length} removed`,
  );

  // Included
  const legacyIncluded =
    meta?.included && meta.included.length > 0 ? meta.included : (tour?.included ?? []);
  const inc = arrayDiff(sot.included, legacyIncluded);
  push(
    "included",
    legacyIncluded.length === 0 ? "sot-only" : inc.equal ? "match" : "diff",
    sot.included,
    legacyIncluded,
    inc.equal
      ? undefined
      : `${inc.onlySot.length} added, ${inc.onlyLegacy.length} removed`,
  );

  // Not included — legacy has none
  push(
    "notIncluded",
    sot.notIncluded.length === 0 ? "match" : "sot-only",
    sot.notIncluded,
    [],
    sot.notIncluded.length > 0 ? "New exclusions block from SoT" : undefined,
  );

  // Itinerary vs legacy stops
  const legacyStops = tour?.stops?.map((s) => s.label) ?? [];
  const sotLabels = sot.itinerary.map((c) => c.label);
  const it = arrayDiff(sotLabels, legacyStops);
  push(
    "itinerary",
    legacyStops.length === 0
      ? "sot-only"
      : it.equal && sotLabels.length === legacyStops.length
        ? "match"
        : "diff",
    sotLabels,
    legacyStops,
    it.equal
      ? undefined
      : `${it.onlySot.length} added, ${it.onlyLegacy.length} removed, real per-chapter minutes now available`,
  );

  // Duration
  if (tour) {
    const legacyMin = parseDurationHours(tour.durationHours);
    push(
      "durationMinutes",
      legacyMin != null && Math.abs(legacyMin - sot.durationMinutes) <= 15
        ? "match"
        : "diff",
      `${sot.durationMinutes} min (${sot.durationText})`,
      tour.durationHours,
      legacyMin != null && legacyMin !== sot.durationMinutes
        ? `Δ ${sot.durationMinutes - legacyMin} min vs legacy`
        : undefined,
    );
  }

  return rows;
}

function parseDurationHours(s: string): number | null {
  // "8-9 hours" | "7 hours" | "6h" — return midpoint minutes
  const m = s.match(/(\d+(?:\.\d+)?)(?:\s*(?:to|-|–)\s*(\d+(?:\.\d+)?))?\s*h/i);
  if (!m) return null;
  const a = parseFloat(m[1]);
  const b = m[2] ? parseFloat(m[2]) : a;
  return Math.round(((a + b) / 2) * 60);
}

const STATUS_META: Record<FieldStatus, { label: string; bg: string; border: string; text: string }> = {
  match: {
    label: "Match",
    bg: "bg-[color:var(--teal)]/5",
    border: "border-[color:var(--teal)]/30",
    text: "text-[color:var(--teal)]",
  },
  diff: {
    label: "Changed",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
  },
  "sot-only": {
    label: "New in SoT",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
  },
  "legacy-only": {
    label: "Removed",
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
  },
  "no-legacy": {
    label: "No legacy",
    bg: "bg-[color:var(--sand)]",
    border: "border-[color:var(--border)]",
    text: "text-[color:var(--charcoal-soft)]",
  },
};

function SotDiffPage() {
  const [filter, setFilter] = useState<"all" | "changed">("changed");

  const tourDiffs = useMemo(() => {
    const ids = Object.keys(SIGNATURE_SOURCE_OF_TRUTH).sort();
    return ids.map((id) => {
      const diffs = buildDiffs(id);
      const changed = diffs.filter((d) => d.status !== "match").length;
      return { id, sot: SIGNATURE_SOURCE_OF_TRUTH[id]!, diffs, changed };
    });
  }, []);

  const totalChanged = tourDiffs.reduce((s, t) => s + t.changed, 0);
  const cleanTours = tourDiffs.filter((t) => t.changed === 0).length;
  const shown = filter === "all" ? tourDiffs : tourDiffs.filter((t) => t.changed > 0);

  return (
    <SiteLayout>
      <section className="container-x max-w-6xl py-16 md:py-24">
        <Eyebrow>Admin · Source-of-truth diff</Eyebrow>
        <SectionTitle>SoT vs Viator (legacy) field-by-field</SectionTitle>
        <p className="mt-4 text-[14.5px] text-[color:var(--charcoal-soft)] max-w-2xl">
          For every verified Signature tour, compare each SoT field against
          the legacy <code>VIATOR_META</code> / <code>signatureTours</code>{" "}
          blueprint. The "surfaces" column shows which YES pages would render
          differently once the SoT value goes live — every one already reads
          through <code>getTourContent()</code>, so a "Changed" row here is
          what visitors actually see.
        </p>

        <div className="mt-8 grid grid-cols-3 gap-3 text-center">
          <Stat label="Tours in SoT" value={tourDiffs.length} />
          <Stat label="Fully matching" value={cleanTours} />
          <Stat label="Field diffs" value={totalChanged} accent={totalChanged > 0} />
        </div>

        <div className="mt-6 flex items-center gap-2">
          <FilterPill label="With changes" active={filter === "changed"} onClick={() => setFilter("changed")} />
          <FilterPill label="All tours" active={filter === "all"} onClick={() => setFilter("all")} />
          <Link
            to="/admin/viator-validation"
            className="ml-auto text-[11px] uppercase tracking-[0.22em] underline text-[color:var(--teal)]"
          >
            Presence report →
          </Link>
        </div>

        <div className="mt-8 space-y-8">
          {shown.map((t) => (
            <TourDiffCard key={t.id} tourId={t.id} sotTitle={t.sot.title} viatorUrl={t.sot.viatorUrl} diffs={t.diffs} />
          ))}
          {shown.length === 0 && (
            <p className="text-center text-[13.5px] text-[color:var(--charcoal-soft)] py-12">
              No tours match this filter.
            </p>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={[
        "border p-4",
        accent
          ? "border-[color:var(--gold)] bg-[color:var(--gold-soft)]/40"
          : "border-[color:var(--border)] bg-[color:var(--card)]",
      ].join(" ")}
    >
      <div className="serif text-[2rem] text-[color:var(--charcoal)] leading-none">{value}</div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">{label}</div>
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center rounded-full px-3.5 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors border",
        active
          ? "bg-[color:var(--charcoal)] text-white border-[color:var(--charcoal)]"
          : "bg-[color:var(--card)] border-[color:var(--border)] text-[color:var(--charcoal-soft)] hover:border-[color:var(--charcoal)]/30",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function TourDiffCard({
  tourId,
  sotTitle,
  viatorUrl,
  diffs,
}: {
  tourId: string;
  sotTitle: string;
  viatorUrl: string;
  diffs: FieldDiff[];
}) {
  const changed = diffs.filter((d) => d.status !== "match").length;
  return (
    <div className="border border-[color:var(--border)] bg-[color:var(--card)] p-5 md:p-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
            {tourId}
          </p>
          <h3 className="serif text-[1.2rem] md:text-[1.35rem] text-[color:var(--charcoal)] leading-tight mt-1">
            {sotTitle}
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[10.5px] uppercase tracking-[0.22em]">
          <a href={viatorUrl} target="_blank" rel="noreferrer" className="underline text-[color:var(--teal)]">
            Viator page ↗
          </a>
          <Link to="/tours/$tourId" params={{ tourId }} className="underline text-[color:var(--teal)]">
            YES page →
          </Link>
          <span className="text-[color:var(--charcoal)]">
            {changed === 0 ? "✓ All match" : `${changed} field${changed === 1 ? "" : "s"} changed`}
          </span>
        </div>
      </div>

      <div className="mt-5 divide-y divide-[color:var(--border)]">
        {diffs.map((d) => (
          <FieldRow key={d.field} diff={d} />
        ))}
      </div>
    </div>
  );
}

function FieldRow({ diff }: { diff: FieldDiff }) {
  const [open, setOpen] = useState(diff.status !== "match");
  const m = STATUS_META[diff.status];
  return (
    <div className="py-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={[
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] border",
              m.bg,
              m.border,
              m.text,
            ].join(" ")}
          >
            {m.label}
          </span>
          <span className="font-mono text-[12px] text-[color:var(--charcoal)]">{diff.field}</span>
          {diff.note && (
            <span className="text-[11px] text-[color:var(--charcoal-soft)]">{diff.note}</span>
          )}
        </div>
        <span className="text-[color:var(--charcoal-soft)] text-[12px]">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="mt-3 grid md:grid-cols-2 gap-4 text-[12.5px]">
          <ValueBlock label="Legacy (what visitors saw before)" value={diff.legacyValue} muted />
          <ValueBlock label="SoT (what renders now)" value={diff.sotValue} />
          {diff.surfaces.length > 0 && (
            <div className="md:col-span-2 border-t border-[color:var(--border)] pt-3">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
                Surfaces affected
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {diff.surfaces.map((s) => (
                  <li
                    key={s}
                    className="inline-flex items-center rounded-full bg-[color:var(--sand)] px-2.5 py-0.5 text-[11px] text-[color:var(--charcoal)]"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ValueBlock({ label, value, muted }: { label: string; value: unknown; muted?: boolean }) {
  return (
    <div
      className={[
        "border p-3",
        muted
          ? "border-[color:var(--border)] bg-[color:var(--sand)]/40"
          : "border-[color:var(--teal)]/30 bg-[color:var(--teal)]/5",
      ].join(" ")}
    >
      <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">{label}</p>
      <div className="mt-2 text-[color:var(--charcoal)]">
        {Array.isArray(value) ? (
          value.length === 0 ? (
            <span className="italic text-[color:var(--charcoal-soft)]">(empty)</span>
          ) : (
            <ul className="list-disc pl-5 space-y-1">
              {value.map((v, i) => (
                <li key={i}>{typeof v === "string" ? v : JSON.stringify(v)}</li>
              ))}
            </ul>
          )
        ) : value == null || value === "" ? (
          <span className="italic text-[color:var(--charcoal-soft)]">(none)</span>
        ) : (
          <p className="whitespace-pre-wrap">{String(value)}</p>
        )}
      </div>
    </div>
  );
}
