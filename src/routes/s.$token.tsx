import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { loadStudioSession } from "@/lib/studio-v2/sessions.functions";
import { StudioV2 } from "@/components/studio-v2/StudioV2";
import { emptyProfile, type TravelerProfile } from "@/lib/studio-v2/profile";

export const Route = createFileRoute("/s/$token")({
  head: ({ params }) => ({
    meta: [
      { title: `Your Studio experience · ${params.token.slice(0, 6)} · YES Experiences` },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ResumeStudio,
  errorComponent: () => <Shell title="We couldn't open this experience." />,
  notFoundComponent: () => <Shell title="This experience is no longer available." />,
});

function Shell({ title }: { title: string }) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-6"
      style={{ background: "var(--ivory)", color: "var(--charcoal)" }}>
      <div className="max-w-md text-center">
        <p className="text-[10px] uppercase tracking-[0.28em] font-bold"
          style={{ color: "var(--gold)" }}>YES Experiences</p>
        <h1 className="serif mt-3 text-[1.8rem] font-semibold leading-tight">{title}</h1>
        <a href="/studio-v2"
          className="mt-6 inline-block text-[12px] uppercase tracking-[0.22em] font-semibold underline underline-offset-4">
          Design a new experience
        </a>
      </div>
    </div>
  );
}

function ResumeStudio() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const load = useServerFn(loadStudioSession);
  const [profile, setProfile] = useState<TravelerProfile | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    load({ data: { shareToken: token } })
      .then((r) => {
        if (cancelled) return;
        if (!r.found) { setMissing(true); return; }
        setProfile({ ...emptyProfile(), ...(r.profile as Partial<TravelerProfile>) });
      })
      .catch(() => setMissing(true));
    return () => { cancelled = true; };
  }, [token, load]);

  if (missing) throw notFound();
  if (!profile) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center"
        style={{ background: "var(--ivory)" }}>
        <p className="text-[12px] uppercase tracking-[0.22em]"
          style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}>
          Opening your experience…
        </p>
      </div>
    );
  }
  return (
    <StudioV2
      initialProfile={profile}
      startAtReveal
      onExit={() => { void navigate({ to: "/" }); }}
    />
  );
}
