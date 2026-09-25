import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy multi-day sales URL — permanently consolidate on Travel Designer. */
export const Route = createFileRoute("/multi-day")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/portugal-travel-designer",
      search: search as Record<string, unknown>,
      statusCode: 301,
    });
  },
});
