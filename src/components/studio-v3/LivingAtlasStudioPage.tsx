import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics-events";
import { LivingAtlasJourney } from "@/components/studio-v3/LivingAtlasJourneyPreview";

/**
 * Page body for the public Experience Studio at /studio-v3.
 *
 * Wraps the Living Atlas journey with the SSR-visible intent copy crawlers
 * and no-JS visitors need, plus the once-per-session `studio_started`
 * analytics beat. Route metadata (canonical, JSON-LD, robots) lives in the
 * route file, not here.
 */

const STUDIO_START_KEY = "yes.studio.started.v1";

export function LivingAtlasStudioPage() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      if (window.sessionStorage.getItem(STUDIO_START_KEY)) return;
      window.sessionStorage.setItem(STUDIO_START_KEY, "1");
    } catch {
      /* storage blocked — still fire once per mount */
    }
    trackEvent("studio_started", { placement: "experience_studio" });
  }, []);

  return (
    <>
      {/* SSR-visible intent for crawlers and no-JS users. */}
      <header className="sr-only">
        <h1>Design your private Portugal day.</h1>
        <p>
          A cinematic composer in three quiet steps — choose how the day should feel, who is
          travelling and the rhythm you want. The map and stops reveal themselves as you go.
        </p>
        <p>
          As you choose, the route, the stops and the price move with you. When the configuration is
          standard you can reserve it directly; when it needs local judgement, the same team reviews
          it and confirms before anything is charged.
        </p>
        <p>
          For a complete journey across Portugal rather than a single private day, a human designer
          composes it with you —{" "}
          <a href="/portugal-travel-designer">work with our Portugal Travel Designer</a>. Advisors
          and agencies planning for clients can work with us directly through{" "}
          <a href="/trade">our travel trade partnerships</a>.
        </p>
      </header>
      <div
        data-testid="living-atlas-app"
        data-hydrated={hydrated ? "true" : "false"}
        aria-busy={!hydrated}
        className={hydrated ? undefined : "pointer-events-none"}
      >
        <LivingAtlasJourney />
      </div>
    </>
  );
}

export default LivingAtlasStudioPage;
