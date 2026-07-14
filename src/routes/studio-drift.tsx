import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StudioDrift } from "@/components/builder/v3/StudioDrift";

/**
 * /studio-drift — standalone prototype.
 *
 * Not linked from the main navigation on purpose. This is a creative R&D
 * surface for testing whether the Studio interaction can feel emotionally
 * alive without behaving like a configurator. The production Studio
 * (v3) remains untouched at /builder.
 */
export const Route = createFileRoute("/studio-drift")({
  head: () => ({
    meta: [{ title: "Drift — YES (prototype)" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: DriftPage,
});

function DriftPage() {
  const navigate = useNavigate({ from: "/studio-drift" });
  return (
    <StudioDrift
      onExit={() => {
        void navigate({ to: "/" });
      }}
    />
  );
}
