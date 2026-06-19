import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /builder → /studio-v3 (canonical cinematic Studio).
 */
export const Route = createFileRoute("/builder")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/studio-v3", search: search as Record<string, unknown> });
  },
});
