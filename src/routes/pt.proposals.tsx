import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pt/proposals")({
  beforeLoad: () => {
    throw redirect({ to: "/pt/contact" });
  },
});
