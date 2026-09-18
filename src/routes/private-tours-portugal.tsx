import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /private-tours-portugal → /portugal-tours (301).
 *
 * Both pages answered "private Portugal tours"; /portugal-tours is the hub
 * with the full Signature inventory, so it owns the intent.
 */
export const Route = createFileRoute("/private-tours-portugal")({
  loader: () => {
    throw redirect({ href: "/portugal-tours", statusCode: 301 });
  },
});
