import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics-events";
import { LivingAtlasJourneyPreview } from "@/components/studio-v3/LivingAtlasJourneyPreview";

/**
 * Shared page body for the public Experience Studio.
 *
 * Mounted by the canonical route (`/experience-studio`) and the legacy alias
 * (`/studio-v3`). Both routes render the production Living Atlas journey.
 * Route-level metadata (canonical, JSON-LD, robots) lives in each route file.
 */

const STUDIO_START_KEY = "yes.studio.started.v1";

export function StudioExperiencePage() {
  useEffect(() => {
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
      <header className="sr-only">
        <h1>Design your private Portugal day.</h1>
        <p>
          Build a private day through the Living Atlas by choosing your date, destination and the
          experiences that matter most to you. The route, moments and booking summary respond as
          your choices take shape.
        </p>
        <p>
          Standard compositions can be reserved securely online. Preferences for wineries,
          experiences or details not shown in the Studio travel with the reservation for the local
          team to review.
        </p>
        <p>
          For a complete journey across Portugal rather than a single private day, a human designer
          composes it with you —{" "}
          <a href="/portugal-travel-designer">work with our Portugal Travel Designer</a>. Advisors
          and agencies planning for clients can work with us directly through{" "}
          <a href="/trade">our travel trade partnerships</a>.
        </p>
      </header>
      <div data-testid="studio-v3-root">
        <LivingAtlasJourneyPreview />
      </div>
    </>
  );
}
