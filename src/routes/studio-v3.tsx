import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Studio URL — permanently redirected to the canonical /studio route. */
export const Route = createFileRoute("/studio-v3")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/studio",
      search: search as Record<string, unknown>,
      statusCode: 301,
    });
  },
});
