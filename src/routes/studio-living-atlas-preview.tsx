import { createFileRoute } from "@tanstack/react-router";

import { LivingAtlasPreview } from "@/components/studio-v3/LivingAtlasPreview";

export const Route = createFileRoute("/studio-living-atlas-preview")({
  head: () => ({
    meta: [
      { title: "Living Atlas Preview | YES Experience Studio" },
      {
        name: "description",
        content:
          "Private, noindex prototype of the YES Experience Studio Living Atlas decision flow.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: LivingAtlasPreview,
});
