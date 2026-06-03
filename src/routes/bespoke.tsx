import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /bespoke — canonical URL for multi-day journey planning.
 *
 * The actual content lives at /multi-day. This route exists so the
 * "Shape your day" widget, the PathfinderQuiz BESPOKE result and any
 * "plan a multi-day journey" links can all use a single, brand-aligned
 * URL ("bespoke") without forking the /multi-day content.
 */
export const Route = createFileRoute("/bespoke")({
  beforeLoad: () => {
    throw redirect({ to: "/multi-day" });
  },
});
