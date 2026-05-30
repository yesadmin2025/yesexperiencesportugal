import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StudioV2 } from "@/components/studio-v2/StudioV2";

/**
 * /studio-v2 — guided consultation prototype.
 *
 * Coexists with /studio-drift. Five-stage flow backed by the v2 engine
 * (priority-weighted scoring, archetype derivation, match score). Not yet
 * linked from the main navigation — internal preview while we validate
 * against the cinematic Drift prototype.
 */
export const Route = createFileRoute("/studio-v2")({
  head: () => ({
    meta: [
      { title: "Studio — YES experiences Portugal" },
      {
        name: "description",
        content:
          "Design your Portugal journey in real time with the YES Studio — a guided, cinematic consultation.",
      },
      { property: "og:title", content: "Studio — YES experiences Portugal" },
      {
        property: "og:description",
        content:
          "Design your Portugal journey in real time with the YES Studio — a guided, cinematic consultation.",
      },
      { property: "og:url", content: "https://yesexperiencesportugal.com/studio-v2" },
    ],
    links: [
      { rel: "canonical", href: "https://yesexperiencesportugal.com/studio-v2" },
    ],
  }),
  component: StudioV2Page,
});


function StudioV2Page() {
  const navigate = useNavigate({ from: "/studio-v2" });
  return (
    <StudioV2
      onExit={() => {
        void navigate({ to: "/" });
      }}
    />
  );
}
