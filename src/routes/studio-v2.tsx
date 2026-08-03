import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /studio-v2 is superseded by /experience-studio (Cinematic Journey Composer).
 *
 * All historical CTAs across the site (Navbar, homepage hero, ThreePaths,
 * StudioLivePreview, PathfinderQuiz, ShapeYourDay, etc.) still target
 * /studio-v2. Rather than touch every entry point, this route now
 * redirects to /experience-studio so the published site lands every visitor on
 * the current Studio.
 *
 * Any incoming search params (intent / group / pickup from ShapeYourDay
 * or session tokens) are forwarded so deep links keep working.
 */
export const Route = createFileRoute("/studio-v2")({
  head: () => ({
    meta: [
      { title: "Studio — YES Experiences Portugal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/experience-studio",
      search: search as Record<string, unknown>,
      statusCode: 301,
    });
  },
});
