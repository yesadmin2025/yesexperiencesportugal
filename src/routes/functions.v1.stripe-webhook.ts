import { createFileRoute } from "@tanstack/react-router";

/**
 * Proxy for Stripe webhooks configured on the custom domain
 * (https://yesexperiencesportugal.com/functions/v1/stripe-webhook).
 *
 * The actual signature verification and handling live in the Supabase Edge
 * Function `stripe-webhook`. This proxy forwards the RAW request body and the
 * `stripe-signature` header unchanged so Stripe's HMAC check still passes on
 * the downstream side. Any transformation of the body (JSON parse, re-stringify,
 * whitespace, headers reordering) would break the signature — do not touch.
 */
const UPSTREAM = "https://kqygnqetygcvkaauwbji.supabase.co/functions/v1/stripe-webhook";

async function forward(request: Request): Promise<Response> {
  // Read raw bytes — do NOT parse or re-serialize.
  const bodyBuffer = await request.arrayBuffer();

  // Preserve only the headers Stripe / the Edge Function need. Strip
  // hop-by-hop headers and anything the upstream infra will re-add.
  const forwardHeaders = new Headers();
  const passThrough = [
    "content-type",
    "content-length",
    "stripe-signature",
    "user-agent",
    "accept",
  ];
  for (const name of passThrough) {
    const value = request.headers.get(name);
    if (value) forwardHeaders.set(name, value);
  }

  const upstream = await fetch(UPSTREAM, {
    method: request.method,
    headers: forwardHeaders,
    body: bodyBuffer.byteLength > 0 ? bodyBuffer : undefined,
  });

  // Mirror the upstream response verbatim to Stripe.
  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    // Drop hop-by-hop and connection-scoped headers.
    if (["transfer-encoding", "connection", "keep-alive"].includes(key.toLowerCase())) return;
    responseHeaders.set(key, value);
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const Route = createFileRoute("/functions/v1/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => forward(request),
      // Stripe's "Fazer ping" and some connectivity checks issue HEAD/GET.
      GET: async () => new Response("stripe-webhook proxy ok", { status: 200 }),
    },
  },
});
