/**
 * Studio v2 — Invitation surface (F.11).
 *
 * Distinct from `/s/$token` (editor resume). This is the cinematic
 * "received invitation" view: a named composer line, region whisper,
 * and one CTA to accept the composition and open the live Studio.
 *
 * No editor chrome, no controls. Read-only until the visitor explicitly
 * chooses to make it theirs.
 */

import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { loadStudioSession } from "@/lib/studio-v2/sessions.functions";
import { trackBuilderEvent } from "@/lib/builder-analytics";

export const Route = createFileRoute("/studio-v2/i/$token")({
  head: ({ params }) => ({
    meta: [
      { title: `Invitation · ${params.token.slice(0, 6)} · YES Experiences` },
      {
        name: "description",
        content: "A private Portuguese composition, hand-shaped for you by YES Experiences.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: InvitationPage,
  errorComponent: () => <Shell title="We couldn’t open this invitation." />,
  notFoundComponent: () => <Shell title="This invitation is no longer available." />,
});

function Shell({ title }: { title: string }) {
  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-6"
      style={{ background: "var(--ivory)", color: "var(--charcoal)" }}
    >
      <div className="max-w-md text-center">
        <p
          className="text-[10px] uppercase tracking-[0.28em] font-bold"
          style={{ color: "var(--gold)" }}
        >
          YES Experiences
        </p>
        <h1 className="serif mt-3 text-[1.8rem] font-semibold leading-tight">{title}</h1>
        <a
          href="/studio-v2"
          className="mt-6 inline-block text-[12px] uppercase tracking-[0.22em] font-semibold underline underline-offset-4"
        >
          Open the Studio
        </a>
      </div>
    </div>
  );
}

function formatComposerLine(updatedAt: string | null): string {
  if (!updatedAt) return "Composed for you by YES";
  try {
    const d = new Date(updatedAt);
    const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
    const hour = d.getHours();
    const partOfDay =
      hour < 6
        ? "before dawn"
        : hour < 12
          ? "morning"
          : hour < 17
            ? "afternoon"
            : hour < 21
              ? "evening"
              : "late evening";
    return `Composed for you by YES · ${weekday} ${partOfDay}`;
  } catch {
    return "Composed for you by YES";
  }
}

function regionWhisper(region: string | null): string {
  if (!region) return "a private composition, shaped to your rhythm";
  const key = region.toLowerCase();
  if (key.includes("douro")) return "the Douro, slow light over terraced wine";
  if (key.includes("alentejo")) return "the Alentejo, long horizons and quiet tables";
  if (key.includes("arrabida") || key.includes("setubal"))
    return "Arrábida, the Atlantic close enough to taste";
  if (key.includes("sintra")) return "Sintra, granite and salt mist on the same breath";
  if (key.includes("lisboa") || key.includes("lisbon"))
    return "Lisbon, hidden streets after the crowds";
  if (key.includes("porto")) return "Porto, granite light and river-quiet cellars";
  return "a private composition, shaped to your rhythm";
}

function InvitationPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const load = useServerFn(loadStudioSession);
  const [data, setData] = useState<{
    region: string | null;
    archetype: string | null;
    updatedAt: string | null;
  } | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void trackBuilderEvent("studio_v2_invitation_view", { token: token.slice(0, 6) });
    load({ data: { shareToken: token } })
      .then((r) => {
        if (cancelled) return;
        if (!r.found) {
          setMissing(true);
          return;
        }
        setData({
          region: r.region ?? null,
          archetype: r.archetype ?? null,
          updatedAt: r.updatedAt ?? null,
        });
      })
      .catch(() => setMissing(true));
    return () => {
      cancelled = true;
    };
  }, [token, load]);

  if (missing) throw notFound();

  if (!data) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center"
        style={{ background: "var(--ivory)" }}
      >
        <p
          className="text-[12px] uppercase tracking-[0.22em]"
          style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
        >
          Opening your invitation…
        </p>
      </div>
    );
  }

  const composerLine = formatComposerLine(data.updatedAt);
  const whisper = regionWhisper(data.region);

  return (
    <main
      className="min-h-[100dvh] flex items-center justify-center px-6 py-16"
      style={{ background: "var(--ivory)", color: "var(--charcoal)" }}
    >
      <article className="w-full max-w-xl text-center">
        <p
          className="text-[10.5px] uppercase tracking-[0.32em] font-bold"
          style={{ color: "var(--gold)" }}
        >
          A private invitation
        </p>

        <h1 className="serif mt-6 text-[2.2rem] md:text-[2.8rem] leading-[1.06] tracking-[-0.01em] font-semibold">
          <span
            className="italic font-normal"
            style={{ color: "color-mix(in oklab, var(--charcoal) 75%, transparent)" }}
          >
            For you —
          </span>
          <br />
          {whisper}.
        </h1>

        <p
          className="mt-7 text-[12px] uppercase tracking-[0.26em] font-semibold"
          style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
        >
          {composerLine}
        </p>

        <div
          className="mx-auto mt-10 h-px w-16"
          style={{ background: "color-mix(in oklab, var(--gold) 60%, transparent)" }}
        />

        <p
          className="serif italic mt-10 text-[1.05rem] leading-[1.6]"
          style={{ color: "color-mix(in oklab, var(--charcoal) 80%, transparent)" }}
        >
          The composition is set, but still yours to shape. Open it and the day will continue to
          listen.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void trackBuilderEvent("studio_v2_invitation_accept", {
                token: token.slice(0, 6),
              });
              void navigate({ to: "/s/$token", params: { token } });
            }}
            className="inline-flex items-center justify-center rounded-[2px] border px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.24em] transition-colors"
            style={{
              borderColor: "var(--charcoal)",
              background: "var(--charcoal)",
              color: "var(--ivory)",
            }}
          >
            Make this composition mine
          </button>
          <p
            className="text-[10.5px] uppercase tracking-[0.24em] font-semibold"
            style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
          >
            No edits required · Composer remains on hand
          </p>
        </div>

        <footer
          className="mt-20 text-[10px] uppercase tracking-[0.32em] font-bold"
          style={{ color: "var(--gold)" }}
        >
          YES Experiences Portugal
        </footer>
      </article>
    </main>
  );
}
