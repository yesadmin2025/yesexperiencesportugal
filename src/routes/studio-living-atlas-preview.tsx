import { createFileRoute } from "@tanstack/react-router";

import { LivingAtlasPreview } from "@/components/studio-v3/LivingAtlasPreview";

/**
 * The file-router plugin regenerates routeTree.gen.ts during Vite dev/build.
 * This isolated branch route is intentionally not hand-written into the
 * generated file, so direct `tsc --noEmit` needs a temporary path cast until
 * the generated tree is refreshed by the normal router pipeline.
 */
export const Route = createFileRoute("/studio-living-atlas-preview" as never)({
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
