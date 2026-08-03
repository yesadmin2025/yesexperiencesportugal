import { createFileRoute } from "@tanstack/react-router";

import { LivingAtlasJourneyPreview } from "@/components/studio-v3/LivingAtlasJourneyPreview";

/**
 * The file-router plugin regenerates routeTree.gen.ts during Vite dev/build.
 * The literal path must remain directly inside createFileRoute so the TanStack
 * generator can discover it. The checked-in generated tree still reflects the
 * production branch until this preview is intentionally integrated.
 */
// @ts-expect-error The isolated preview path is added to routeTree.gen.ts by the Vite router pipeline.
export const Route = createFileRoute("/studio-living-atlas-preview")({
  head: () => ({
    meta: [
      { title: "Living Atlas Preview | YES Experience Studio" },
      {
        name: "description",
        content:
          "Private, noindex prototype of the YES Experience Studio Living Atlas decision and itinerary composition flow.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: LivingAtlasJourneyPreview,
});