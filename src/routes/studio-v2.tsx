import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { StudioV2, type PersistedSession } from "@/components/studio-v2/StudioV2";
import { loadStudioDraft } from "@/lib/studio-v2/draft.functions";

/**
 * /studio-v2 — guided consultation prototype.
 *
 * SSR note: the page renders a server-visible <header> with the H1,
 * subtitle, host trust strip and FAQ block BEFORE the cinematic splash,
 * so crawlers (and users with JS disabled) get the full intent of the
 * page from the raw HTML source — not only after the React app boots.
 */

const CANONICAL_URL = "https://yesexperiencesportugal.com/studio";

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does the YES Studio work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You pick a mood, tell us who's coming and your rhythm. The Studio builds a real private itinerary with stops, timing and a live price you can see and adjust before booking.",
      },
    },
    {
      "@type": "Question",
      name: "Can I book the itinerary directly?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Once the day looks right, you can reserve instantly with a single click — no forms, no waiting. You receive your confirmation and full details immediately.",
      },
    },
    {
      "@type": "Question",
      name: "Can a local designer help me refine it?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Always. A local designer based in Portugal is one message away on WhatsApp and replies within the hour. They can refine stops, pace, lunch, pickup and anything else before you confirm.",
      },
    },
    {
      "@type": "Question",
      name: "What is the cancellation policy?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Free changes and full refund up to 48 hours before your experience. After that, reach out to your host directly and we'll do everything we can to reshape, reschedule or refund within the conditions shared at confirmation.",
      },
    },
  ],
};

export const Route = createFileRoute("/studio-v2")({
  validateSearch: (search) =>
    z
      .object({ resume: z.string().min(8).max(64).optional() })
      .parse(search),
  head: () => ({
    meta: [
      { title: "Studio — YES experiences Portugal" },
      {
        name: "description",
        content:
          "Design your private Portugal day in real time — pick a mood, who's coming and your rhythm. Real itinerary, live price, book instantly or refine with a local.",
      },
      { property: "og:title", content: "Design your private Portugal day." },
      {
        property: "og:description",
        content:
          "Pick a mood, who's coming and your rhythm — we build a real itinerary with stops, timing and a live price.",
      },
      { property: "og:url", content: CANONICAL_URL },
    ],
    links: [{ rel: "canonical", href: CANONICAL_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(FAQ_JSONLD),
      },
    ],
  }),
  component: StudioV2Page,
});


function StudioV2Page() {
  const navigate = useNavigate({ from: "/studio-v2" });
  const { resume } = Route.useSearch();
  const load = useServerFn(loadStudioDraft);
  const [hydrated, setHydrated] = useState<PersistedSession | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "missing">(
    resume ? "loading" : "ready",
  );

  useEffect(() => {
    if (!resume) return;
    let cancelled = false;
    load({ data: { token: resume } })
      .then((r) => {
        if (cancelled) return;
        if (!r.ok || !r.draftJson) {
          setStatus("missing");
          return;
        }
        try {
          const parsed = JSON.parse(r.draftJson) as HydratedDraft;
          if (typeof parsed?.beatIndex !== "number") {
            setStatus("missing");
            return;
          }
          setHydrated(parsed);
          setStatus("ready");
        } catch {
          setStatus("missing");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [resume, load]);

  if (status === "loading") {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center"
        style={{ background: "var(--ivory)" }}
      >
        <p
          className="text-[11px] uppercase tracking-[0.28em] font-semibold"
          style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
        >
          Opening your saved draft…
        </p>
      </div>
    );
  }
  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          SSR-visible intent block. Rendered in the server HTML so
          crawlers and no-JS users see the full proposition above the
          cinematic splash. Visually hidden in the browser because the
          splash takes the full viewport — the content is preserved
          for accessibility and SEO via the .sr-only utility.
          ───────────────────────────────────────────────────────────── */}
      <header className="sr-only">
        <h1>Design your private Portugal day.</h1>
        <p>
          Pick a mood, who's coming and your rhythm — we build a real
          itinerary with stops, timing and a live price. Book it instantly,
          or refine it with a local designer first.
        </p>
        <figure>
          <img
            src="/brand/svg/yes-experiences-portugal-centered-mono-dark.svg"
            alt="Your host in Portugal, a YES local designer"
            width={64}
            height={64}
          />
          <figcaption>
            Your host in Portugal — replies on WhatsApp within the hour.
          </figcaption>
        </figure>

        <section aria-label="Frequently asked questions">
          <h2>How the Studio works</h2>
          <dl>
            <dt>How does the YES Studio work?</dt>
            <dd>
              You pick a mood, tell us who's coming and your rhythm. The Studio
              builds a real private itinerary with stops, timing and a live
              price you can see and adjust before booking.
            </dd>
            <dt>Can I book the itinerary directly?</dt>
            <dd>
              Yes. Once the day looks right, you can reserve instantly with a
              single click — no forms, no waiting.
            </dd>
            <dt>Can a local designer help me refine it?</dt>
            <dd>
              Always. A local designer based in Portugal is one message away on
              WhatsApp and replies within the hour.
            </dd>
            <dt>What is the cancellation policy?</dt>
            <dd>
              Free changes and full refund up to 48 hours before your
              experience. After that, your host will do everything possible to
              reshape, reschedule or refund within the confirmation conditions.
            </dd>
          </dl>
        </section>
      </header>

      {status === "missing" && (
        <div
          role="status"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 text-[11px] uppercase tracking-[0.22em] font-semibold rounded-[2px]"
          style={{
            background: "var(--charcoal)",
            color: "var(--ivory)",
          }}
        >
          That resume link is no longer available — starting fresh.
        </div>
      )}

      <StudioV2
        onExit={() => {
          void navigate({ to: "/" });
        }}
        hydratedDraft={hydrated ?? undefined}
      />
    </>
  );
}
