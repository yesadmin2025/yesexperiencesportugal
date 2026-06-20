import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { validateAllTours, type TourValidation, type Severity } from "@/lib/viatorValidation";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Eyebrow } from "@/components/ui/Eyebrow";

const SEVERITY_ORDER: Severity[] = ["critical", "major", "minor", "clean"];

const SEVERITY_META: Record<
  Severity,
  { label: string; short: string; bg: string; border: string; text: string; dot: string }
> = {
  critical: {
    label: "Critical",
    short: "CRIT",
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  major: {
    label: "Major",
    short: "MAJ",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  minor: {
    label: "Minor",
    short: "MIN",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  clean: {
    label: "Clean",
    short: "OK",
    bg: "bg-[color:var(--teal)]/5",
    border: "border-[color:var(--teal)]/30",
    text: "text-[color:var(--teal)]",
    dot: "bg-[color:var(--teal)]",
  },
};

export const Route = createFileRoute("/admin/viator-validation")({
  head: () => ({
    meta: [
      { title: "Viator validation report — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ViatorValidationPage,
});

function ViatorValidationPage() {
  const report = validateAllTours();
  const [filter, setFilter] = useState<Severity | "all">("all");

  const withMeta = report.filter((r) => r.hasViatorMeta);
  const missingMeta = report.filter((r) => !r.hasViatorMeta);
  const totalIssues = withMeta.reduce((sum, r) => sum + r.issueCount, 0);

  const severityCounts = {
    critical: withMeta.filter((r) => r.severity === "critical").length,
    major: withMeta.filter((r) => r.severity === "major").length,
    minor: withMeta.filter((r) => r.severity === "minor").length,
    clean: withMeta.filter((r) => r.severity === "clean").length,
  };

  const filtered = filter === "all" ? withMeta : withMeta.filter((r) => r.severity === filter);

  // Sort: critical → major → minor → clean
  const sorted = [...filtered].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );

  return (
    <SiteLayout>
      <section className="container-x max-w-6xl py-16 md:py-24">
        <Eyebrow>Admin · Source-of-truth check</Eyebrow>
        <SectionTitle>Viator validation report</SectionTitle>
        <p className="mt-4 text-[14.5px] text-[color:var(--charcoal-soft)] max-w-2xl">
          Compares every Signature tour's <strong>stops</strong> and <strong>inclusions</strong>{" "}
          against the canonical Viator product page. Severity prioritizes invented claims (critical)
          over missing mentions (major/minor).
        </p>

        {/* Severity stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          <Stat label="Tours" value={report.length} />
          <SeverityStat severity="critical" value={severityCounts.critical} />
          <SeverityStat severity="major" value={severityCounts.major} />
          <SeverityStat severity="minor" value={severityCounts.minor} />
          <Stat label="Total issues" value={totalIssues} accent={totalIssues > 0} />
        </div>

        {/* Filter tabs */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <FilterPill
            label="All"
            count={withMeta.length}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          {SEVERITY_ORDER.filter((s) => s !== "clean" || severityCounts.clean > 0).map((s) => (
            <FilterPill
              key={s}
              label={SEVERITY_META[s].label}
              count={severityCounts[s]}
              active={filter === s}
              onClick={() => setFilter(s)}
              severity={s}
            />
          ))}
        </div>

        {missingMeta.length > 0 && (
          <div className="mt-8 border border-[color:var(--border)] p-5 bg-[color:var(--sand)]/40">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
              No Viator meta yet
            </p>
            <p className="mt-2 text-[13.5px]">{missingMeta.map((m) => m.title).join(" · ")}</p>
          </div>
        )}

        <div className="mt-8 space-y-5">
          {sorted.map((r) => (
            <TourCard key={r.tourId} v={r} />
          ))}
          {sorted.length === 0 && (
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
      <div className="mt-2 text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
        {label}
      </div>
    </div>
  );
}

function SeverityStat({ severity, value }: { severity: Severity; value: number }) {
  const m = SEVERITY_META[severity];
  return (
    <div className={["border p-4", m.border, m.bg].join(" ")}>
      <div className={["serif text-[2rem] leading-none", m.text].join(" ")}>{value}</div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
        {m.label}
      </div>
    </div>
  );
}

function FilterPill({
  label,
  count,
  active,
  onClick,
  severity,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  severity?: Severity;
}) {
  const m = severity ? SEVERITY_META[severity] : null;
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors",
        active
          ? m
            ? `${m.bg} ${m.border} ${m.text} border`
            : "bg-[color:var(--charcoal)] text-white"
          : "bg-[color:var(--card)] border border-[color:var(--border)] text-[color:var(--charcoal-soft)] hover:border-[color:var(--charcoal)]/30",
      ].join(" ")}
    >
      <span>{label}</span>
      <span
        className={[
          "inline-flex items-center justify-center rounded-full min-w-[1.25rem] h-5 px-1 text-[10px] font-medium",
          active
            ? m
              ? "bg-white/60 text-[color:var(--charcoal)]"
              : "bg-white/20 text-white"
            : "bg-[color:var(--sand)] text-[color:var(--charcoal-soft)]",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const m = SEVERITY_META[severity];
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] border",
        m.bg,
        m.border,
        m.text,
      ].join(" ")}
    >
      <span className={["inline-block w-1.5 h-1.5 rounded-full", m.dot].join(" ")} />
      {m.label}
    </span>
  );
}

function TourCard({ v }: { v: TourValidation }) {
  const clean = v.issueCount === 0;
  const m = SEVERITY_META[v.severity];
  return (
    <div
      className={[
        "border p-5 md:p-6 transition-colors",
        clean ? "border-[color:var(--teal)]/40 bg-[color:var(--teal)]/5" : `${m.border} ${m.bg}`,
      ].join(" ")}
    >
      <div className="flex items-start md:items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <SeverityBadge severity={v.severity} />
          <h3 className="serif text-[1.15rem] md:text-[1.3rem] text-[color:var(--charcoal)] leading-tight">
            {v.title}
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[10.5px] uppercase tracking-[0.22em]">
          <Link
            to="/tours/$tourId"
            params={{ tourId: v.tourId }}
            className="underline text-[color:var(--teal)]"
          >
            View page
          </Link>
          <span className={clean ? "text-[color:var(--teal)]" : "text-[color:var(--charcoal)]"}>
            {clean
              ? "✓ Matches Viator"
              : `${v.issueCount} mismatch${v.issueCount === 1 ? "" : "es"}`}
          </span>
        </div>
      </div>

      {!clean && (
        <div className="mt-5 grid md:grid-cols-2 gap-6 text-[13px]">
          <DiffBlock title="Stops" diff={v.stops} />
          <DiffBlock title="Inclusions" diff={v.included} />
        </div>
      )}
    </div>
  );
}

function DiffBlock({ title, diff }: { title: string; diff: TourValidation["stops"] }) {
  const hasInvented = diff.onlyInternal.length > 0;
  const hasMissing = diff.onlyViator.length > 0;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
          {title}
        </p>
        {hasInvented && (
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] bg-red-100 text-red-700 border border-red-200">
            <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
            Critical
          </span>
        )}
        {hasMissing && !hasInvented && (
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] bg-amber-100 text-amber-700 border border-amber-200">
            <span className="inline-block w-1 h-1 rounded-full bg-amber-500" />
            {title === "Stops" ? "Major" : "Minor"}
          </span>
        )}
      </div>

      {diff.onlyInternal.length === 0 && diff.onlyViator.length === 0 && (
        <p className="italic text-[color:var(--charcoal-soft)]">All matched.</p>
      )}
      {diff.onlyInternal.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] font-semibold text-red-700 mb-1">
            On our page but NOT on Viator ({diff.onlyInternal.length})
          </p>
          <ul className="list-disc pl-5 space-y-0.5 text-[color:var(--charcoal)]">
            {diff.onlyInternal.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {diff.onlyViator.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-[color:var(--charcoal)] mb-1">
            On Viator but NOT on our page ({diff.onlyViator.length})
          </p>
          <ul className="list-disc pl-5 space-y-0.5 text-[color:var(--charcoal)]">
            {diff.onlyViator.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
