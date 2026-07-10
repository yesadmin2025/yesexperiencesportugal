import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pt/faq")({
  beforeLoad: () => {
    throw redirect({ to: "/pt/about" });
  },
});
