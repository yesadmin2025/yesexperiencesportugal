import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Euro, ArrowRight, Image as ImageIcon } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { signatureTours } from "@/data/signatureTours";
import { ExperienceSeoDraftEditor } from "@/components/admin/ExperienceSeoDraftEditor";
import {
  listExperienceContent,
  saveExperienceContent,
  listExperienceContentHistory,
  type ExperienceContentOverride,
  type ExperienceContentRevision,
} from "@/lib/experienceContent.functions";

export const Route = createFileRoute("/admin/experiences")({
  head: () => ({
    meta: [
      { title: "Experiences & operations — YES Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminExperiencesHub,
});

function AdminExperiencesHub() {
  const [authChecked, setAuthChecked] = useState(false);
  const [session, setSession] = useState<{ id: string; email?: string | null } | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSession(s: { user: { id: string; email?: string | null } } | null) {
      if (!s) {
        if (!cancelled) {
          setSession(null);
          setIsAdmin(null);
          setAuthChecked(true);
        }
        return;
      }
      if (!cancelled) setSession({ id: s.user.id, email: s.user.email });
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", s.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) {
        setIsAdmin(!error && !!data);
        setAuthChecked(true);
      }
    }

    supabase.auth.getSession().then(({ data }) => loadSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setAuthChecked(false);
      loadSession(s);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!authChecked) {
    return (
      <SiteLayout>
        <section className="pt-28 pb-20 container-x max-w-5xl">
          <p className="text-sm text-[color:var(--charcoal-soft)]">Loading…</p>
        </section>
      </SiteLayout>
    );
  }

  if (!session) {
    return (
      <SiteLayout>
        <section className="pt-28 pb-20 container-x max-w-2xl">
          <h1 className="text-3xl">Experiences & operations</h1>
          <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">
            Sign in to open the admin tools.
          </p>
          <Link
            to="/auth"
            className="mt-6 inline-flex min-h-11 items-center bg-[color:var(--charcoal)] px-5 text-sm text-[color:var(--ivory)]"
          >
            Sign in
          </Link>
        </section>
      </SiteLayout>
    );
  }

  if (!isAdmin) {
    return (
      <SiteLayout>
        <section className="pt-28 pb-20 container-x max-w-2xl">
          <h1 className="text-3xl">Not authorized</h1>
          <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">
            This page requires the admin role.
          </p>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="pt-28 pb-24">
        <div className="container-x max-w-5xl">
          <Link
            to="/admin"
            className="text-xs uppercase tracking-[0.16em] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
          >
            ← Admin
          </Link>
          <p className="mt-6 text-[10px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
            Content & operations
          </p>
          <h1 className="mt-1 text-3xl tracking-tight">Experiences & operations</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--charcoal-soft)]">
            Edit the words a guest reads, then jump to rates and dates. Pricing and availability stay
            in their own tools so changing one can never silently change the other.
          </p>

          <ExperienceCopyEditor />
          <ExperienceSeoDraftEditor />

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <ToolCard
              to="/admin/photos"
              search={{ tourId: undefined }}
              icon={<ImageIcon size={20} />}
              title="Manage photos"
              eyebrow="Visuals"
              description="Upload multi-select gallery photos, set a cover image and reorder from your phone."
            />
            <ToolCard
              to="/admin/pricing"
              icon={<Euro size={20} />}
              title="Signature pricing"
              eyebrow="Rates 1–8 guests"
              description="Edit exact 1–8 pax rates, preview the public price card and see group-total inversion warnings before saving."
            />
            <ToolCard
              to="/admin/availability"
              icon={<CalendarDays size={20} />}
              title="Availability calendar"
              eyebrow="Dates & notice"
              description="Close individual dates, set operating weekdays and minimum booking notice for each Signature."
            />
          </div>

          <div className="mt-8 border-t border-[color:var(--border)] pt-5">
            <p className="text-xs leading-relaxed text-[color:var(--charcoal-soft)]">
              Stops, inclusions and itineraries are not editable here on purpose: they must match the
              real operated day. Editing copy changes text inside pages that already exist, so the
              site map is untouched.
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

type Draft = { blurb: string; intro: string; fitsBest: string; highlights: string; isPublished: boolean };

function ExperienceCopyEditor() {
  const load = useServerFn(listExperienceContent);
  const save = useServerFn(saveExperienceContent);
  const loadHistory = useServerFn(listExperienceContentHistory);

  const [tourId, setTourId] = useState(signatureTours[0]?.id ?? "");
  const [overrides, setOverrides] = useState<Record<string, ExperienceContentOverride>>({});
  const [history, setHistory] = useState<ExperienceContentRevision[]>([]);
  const [draft, setDraft] = useState<Draft>({
    blurb: "",
    intro: "",
    fitsBest: "",
    highlights: "",
    isPublished: true,
  });
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const tour = useMemo(() => signatureTours.find((t) => t.id === tourId), [tourId]);

  useEffect(() => {
    let active = true;
    load({})
      .then((rows) => {
        if (!active) return;
        setOverrides(Object.fromEntries(rows.map((r) => [r.tourId, r])));
      })
      .catch((e: unknown) => active && setStatus(e instanceof Error ? e.message : String(e)));
    return () => {
      active = false;
    };
  }, [load]);

  // Draft starts from the saved override, else from the current page copy —
  // so an owner edits what is live instead of an empty box.
  useEffect(() => {
    if (!tour) return;
    const o = overrides[tour.id];
    setDraft({
      blurb: o?.blurb ?? tour.blurb,
      intro: o?.intro ?? tour.intro,
      fitsBest: o?.fitsBest ?? tour.fitsBest,
      highlights: (o?.highlights ?? tour.highlights).join("\n"),
      isPublished: o?.isPublished ?? true,
    });
    setStatus(null);
  }, [tour, overrides]);

  useEffect(() => {
    if (!tourId) return;
    let active = true;
    loadHistory({ data: { tourId } })
      .then((rows) => active && setHistory(rows))
      .catch(() => active && setHistory([]));
    return () => {
      active = false;
    };
  }, [tourId, loadHistory, overrides]);

  async function onSave() {
    if (!tour) return;
    setSaving(true);
    setStatus(null);
    try {
      const row = await save({
        data: {
          tourId: tour.id,
          blurb: draft.blurb,
          intro: draft.intro,
          fitsBest: draft.fitsBest,
          highlights: draft.highlights
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
          isPublished: draft.isPublished,
        },
      });
      setOverrides((prev) => ({ ...prev, [row.tourId]: row }));
      setStatus("Saved. The experience page shows this text now.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function restore(rev: ExperienceContentRevision) {
    setDraft({
      blurb: rev.blurb ?? "",
      intro: rev.intro ?? "",
      fitsBest: rev.fitsBest ?? "",
      highlights: rev.highlights?.join("\n") ?? "",
      isPublished: rev.isPublished,
    });
    setStatus("Earlier version loaded. Save to publish it again.");
  }

  if (!tour) return null;

  return (
    <div className="mt-8 border border-[color:var(--border)] bg-white p-5">
      <h2 className="text-lg font-semibold">Experience description</h2>
      <p className="mt-1 text-xs leading-relaxed text-[color:var(--charcoal-soft)]">
        Four fields a guest actually reads. Leave one empty to fall back to the current site text.
      </p>

      <label className="mt-5 block text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
        Experience
        <select
          value={tourId}
          onChange={(e) => setTourId(e.target.value)}
          className="mt-1 block w-full min-h-11 border border-[color:var(--border)] bg-white px-3 text-sm normal-case tracking-normal text-[color:var(--charcoal)]"
        >
          {signatureTours.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
              {overrides[t.id] ? " · edited" : ""}
            </option>
          ))}
        </select>
      </label>

      <Field
        label="Card teaser"
        hint="One sentence, used on cards and in search results."
        value={draft.blurb}
        rows={3}
        onChange={(v) => setDraft((d) => ({ ...d, blurb: v }))}
      />
      <Field
        label="Highlights"
        hint="One factual highlight per line, up to eight. These appear on the experience page and cards."
        value={draft.highlights}
        rows={6}
        onChange={(v) => setDraft((d) => ({ ...d, highlights: v }))}
      />
      <Field
        label="Opening paragraph"
        hint="Two or three sentences at the top of the experience page."
        value={draft.intro}
        rows={6}
        onChange={(v) => setDraft((d) => ({ ...d, intro: v }))}
      />
      <Field
        label="Who it fits"
        hint="For example: couples · friends · wine-curious travelers."
        value={draft.fitsBest}
        rows={2}
        onChange={(v) => setDraft((d) => ({ ...d, fitsBest: v }))}
      />

      <label className="mt-4 flex items-center gap-3 text-sm text-[color:var(--charcoal)]">
        <input
          type="checkbox"
          checked={draft.isPublished}
          onChange={(e) => setDraft((d) => ({ ...d, isPublished: e.target.checked }))}
          className="size-5"
        />
        Show this text on the live site
      </label>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex min-h-11 items-center bg-[color:var(--charcoal)] px-5 text-sm text-[color:var(--ivory)] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save description"}
        </button>
        <Link
          to="/tours/$tourId"
          params={{ tourId: tour.id }}
          target="_blank"
          className="inline-flex min-h-11 items-center border border-[color:var(--border)] px-5 text-sm"
        >
          View live page
        </Link>
        <Link
          to="/admin/photos"
          search={{ tourId: tour.id }}
          className="inline-flex min-h-11 items-center gap-2 border border-[color:var(--border)] px-5 text-sm"
        >
          <ImageIcon size={15} aria-hidden /> Edit photos &amp; cover
        </Link>
      </div>

      {status ? <p className="mt-3 text-sm text-[color:var(--teal)]">{status}</p> : null}

      {overrides[tour.id]?.updatedAt ? (
        <p className="mt-3 text-xs text-[color:var(--charcoal-soft)]">
          Last edited {new Date(overrides[tour.id]!.updatedAt!).toLocaleString("en-GB")}
        </p>
      ) : null}

      {history.length > 0 ? (
        <details className="mt-5 border-t border-[color:var(--border)] pt-4">
          <summary className="cursor-pointer text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
            Edit history ({history.length})
          </summary>
          <ul className="mt-3 space-y-3">
            {history.map((rev) => (
              <li key={rev.id} className="text-xs text-[color:var(--charcoal-soft)]">
                <span>{new Date(rev.createdAt).toLocaleString("en-GB")}</span>
                <button
                  type="button"
                  onClick={() => restore(rev)}
                  className="ml-3 min-h-11 underline text-[color:var(--teal)]"
                >
                  Load this version
                </button>
                <p className="mt-1 line-clamp-2 text-[color:var(--charcoal)]">{rev.blurb}</p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  rows,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-5 block text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
      {label}
      <span className="mt-1 block text-[11px] normal-case tracking-normal">{hint}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 block w-full border border-[color:var(--border)] bg-white p-3 text-sm normal-case tracking-normal leading-relaxed text-[color:var(--charcoal)]"
      />
    </label>
  );
}

function ToolCard({
  to,
  icon,
  title,
  eyebrow,
  description,
  search,
}: {
  to: "/admin/pricing" | "/admin/availability" | "/admin/photos";
  icon: React.ReactNode;
  title: string;
  eyebrow: string;
  description: string;
  search?: { tourId?: string };
}) {
  return (
    <Link
      to={to}
      search={to === "/admin/photos" ? (search ?? { tourId: undefined }) : undefined}
      className="group border border-[color:var(--border)] bg-white p-5 transition-colors hover:border-[color:var(--gold)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="grid size-10 place-items-center border border-[color:var(--border)] text-[color:var(--teal)]">
          {icon}
        </div>
        <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
      </div>
      <p className="mt-5 text-[9px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--charcoal-soft)]">{description}</p>
    </Link>
  );
}
