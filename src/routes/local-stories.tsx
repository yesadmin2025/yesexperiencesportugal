import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout-only parent route. The `/local-stories` URL is served by
// `local-stories.index.tsx` (the hub listing) and `/local-stories/$slug`
// is served by `local-stories.$slug.tsx` (individual articles). This file
// exists solely so the child route has an <Outlet /> to mount into.
//
// Do NOT add head() here — parent head entries concatenate into every
// child match and produce duplicate <title>/canonical tags on articles.
export const Route = createFileRoute("/local-stories")({
  component: () => <Outlet />,
});
