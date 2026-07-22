import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pt/moments")({
  beforeLoad: () => {
    throw redirect({ to: "/pt/contact", statusCode: 301 });
  },
});
