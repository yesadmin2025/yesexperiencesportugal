import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics-events";
import { StudioV3 } from "@/components/studio-v3/StudioV3";
import {
  clearStudioDraftPersistence,
  consumeDurableStudioDraftRestore,
  installStudioSessionPrivacyGuard,
} from "@/components/studio-v3/studioSessionPrivacy";
import { toast } from "sonner";

/**
 * Page body for the public Experience Studio at /studio-v3.
 *
 * Studio V3 is the production architecture: progressive phases, progress
 * stepper, Travel File, guest details, pricing and Stripe checkout. The
 * Living Atlas reasoning layer is integrated *inside* it (see
 * `src/lib/studio-v3/livingAtlasBridge.ts`), not mounted as a separate
 * surface — the traveller only ever sees one Experience Studio.
 *
 * Route metadata (canonical, JSON-LD, robots) lives in the route file.
 */

const STUDIO_START_KEY = "yes.studio.started.v1";

export function LivingAtlasStudioPage() {
  // Synchronous and idempotent: protects the Studio composition key before
  // the child StudioV3 component can run its first persistence effect. P12
  // also restores a privacy-safe durable draft into that same session channel
  // before StudioV3 mounts, so there is no parallel hydration state machine.
  installStudioSessionPrivacyGuard();

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);

    let shouldTrackStart = true;
    try {
      if (window.sessionStorage.getItem(STUDIO_START_KEY)) {
        shouldTrackStart = false;
      } else {
        window.sessionStorage.setItem(STUDIO_START_KEY, "1");
      }
    } catch {
      /* storage blocked — still fire once per mount */
    }
    if (shouldTrackStart) {
      trackEvent("studio_started", { placement: "experience_studio" });
    }

    if (consumeDurableStudioDraftRestore()) {
      trackEvent("studio_draft_resumed", {
        placement: "experience_studio",
        source: "durable_local_draft",
      });
      toast("Welcome back. Your Portugal day is exactly where you left it.", {
        duration: 8000,
        action: {
          label: "Start fresh",
          onClick: () => {
            clearStudioDraftPersistence();
            window.location.assign("/studio-v3");
          },
        },
      });
    }
  }, []);

  return (
    <>
      {/* SSR-visible intent for crawlers and no-JS users. */}
      <header className="sr-only">
        <h1>Design your private Portugal day.</h1>
        <p>
          A cinematic composer that reads how you want the day to feel, who is travelling and the
          rhythm you want, then proposes a private Portugal day built from real Signature routes.
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
        data-studio="v3"
        data-hydrated={hydrated ? "true" : "false"}
        aria-busy={!hydrated}
        className={hydrated ? undefined : "pointer-events-none"}
      >
        <StudioV3 />
      </div>
    </>
  );
}

export default LivingAtlasStudioPage;
