import { createFileRoute } from "@tanstack/react-router";
import { StudioExperiencePage } from "@/components/studio-v3/StudioExperiencePage";

/**
 * /studio-v3 — legacy alias for the public Experience Studio.
 *
 * The canonical public URL is /experience-studio. This alias keeps old
 * deep links, bookmarks and QA specs working; it renders the identical
 * Studio and points canonical + robots at the canonical route so search
 * engines only index /experience-studio.
 */

const CANONICAL_URL = "https://yesexperiencesportugal.com/experience-studio";

export const Route = createFileRoute("/studio-v3")({
  head: () => ({
    meta: [
      { title: "Design Your Portugal Experience | YES Studio" },
      { name: "robots", content: "noindex, follow" },
      { property: "og:url", content: CANONICAL_URL },
    ],
    links: [{ rel: "canonical", href: CANONICAL_URL }],
  }),
  component: StudioExperiencePage,
});
