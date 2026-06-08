import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /studio-v2 is superseded by /studio-v3 (Cinematic Journey Composer).
 *
 * All historical CTAs across the site (Navbar, homepage hero, ThreePaths,
 * StudioLivePreview, PathfinderQuiz, ShapeYourDay, etc.) still target
 * /studio-v2. Rather than touch every entry point, this route now
 * redirects to /studio-v3 so the published site lands every visitor on
 * the current Studio.
 *
 * Any incoming search params (intent / group / pickup from ShapeYourDay
 * or session tokens) are forwarded so deep links keep working.
 */
export const Route = createFileRoute("/studio-v2")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/studio-v3", search: search as Record<string, unknown> });
  },
});
