import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { validateAllTours, type TourValidation } from "@/lib/viatorValidation";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Eyebrow } from "@/components/ui/Eyebrow";

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
  const withMeta = report.filter((r) => r.hasViatorMeta);
  const withIssues = withMeta.filter((r) => r.issueCount > 0);
  const totalIssues = withIssues.reduce((sum, r) => sum + r.issueCount, 0);
  const missingMeta = report.filter((r) => !r.hasViatorMeta);

  return (
    <SiteLayout>
      <section className="container-x max-w-6xl py-16 md:py-24">
        <Eyebrow>Admin · Source-of-truth check</Eyebrow>
        <SectionTitle>Viator validation report</SectionTitle>
        <p className="mt-4 text-[14.5px] text-[color:var(--charcoal-soft)] max-w-2xl">
          Compares every Signature tour's <strong>stops</strong> and{" "}
          <strong>inclusions</strong> against the canonical Viator product page.
          The booking flow uses the Viator list when present; this page surfaces
          drift between the two so copy stays honest.
        </p>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <Stat label="Tours" value={report.length} />
          <Stat label="With Viator meta" value={withMeta.length} />
          <Stat label="With mismatches" value={withIssues.length} accent={withIssues.length > 0} />
          <Stat label="Total mismatches" value={totalIssues} accent={totalIssues > 0} />
        </div>

        {missingMeta.length > 0 && (
          <div className="mt-10 border border-[color:var(--border)] p-5 bg-[color:var(--sand)]/40">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
              No Viator meta yet
            </p>
            <p className="mt-2 text-[13.5px]">
              {missingMeta.map((m) => m.title).join(" · ")}
            </p>
          </div>
        )}

        <div className="mt-10 space-y-6">
          {withMeta.map((r) => (
            <TourCard key={r.tourId} v={r} />
          ))}
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

function TourCard({ v }: { v: TourValidation }) {
  const clean = v.issueCount === 0;
  return (
    <div
      className={[
        "border p-5 md:p-6",
        clean
          ? "border-[color:var(--teal)]/40 bg-[color:var(--teal)]/5"
          : "border-[color:var(--gold)] bg-[color:var(--ivory)]",
      ].join(" ")}
    >
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h3 className="serif text-[1.3rem] text-[color:var(--charcoal)]">{v.title}</h3>
        <div className="flex gap-3 text-[10.5px] uppercase tracking-[0.22em]">
          <Link
            to="/tours/$tourId"
            params={{ tourId: v.tourId }}
            className="underline text-[color:var(--teal)]"
          >
            View page
          </Link>
          <span className={clean ? "text-[color:var(--teal)]" : "text-[color:var(--charcoal)]"}>
            {clean ? "✓ Matches Viator" : `${v.issueCount} mismatch${v.issueCount === 1 ? "" : "es"}`}
          </span>
        </div>
      </div>

      {!clean && (
        <div className="mt-4 grid md:grid-cols-2 gap-5 text-[13px]">
          <DiffBlock title="Stops" diff={v.stops} />
          <DiffBlock title="Inclusions" diff={v.included} />
        </div>
      )}
    </div>
  );
}

function DiffBlock({
  title,
  diff,
}: {
  title: string;
  diff: TourValidation["stops"];
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)] mb-2">
        {title}
      </p>
      {diff.onlyInternal.length === 0 && diff.onlyViator.length === 0 && (
        <p className="italic text-[color:var(--charcoal-soft)]">All matched.</p>
      )}
      {diff.onlyInternal.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] font-semibold text-[color:var(--charcoal)] mb-1">
            On our page but NOT on Viator ({diff.onlyInternal.length})
          </p>
          <ul className="list-disc pl-5 space-y-0.5">
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
          <ul className="list-disc pl-5 space-y-0.5">
            {diff.onlyViator.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
