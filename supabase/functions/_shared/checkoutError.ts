// Shared checkout error envelope for Signature + Builder edge functions.
// Emits { error: { code, message, retryable, requestId }, error_legacy }
// while also exposing `error` as the legacy string alias so older clients
// keep working during the rollout.

export type CheckoutErrorCode =
  | "quote_stale"
  | "quote_expired"
  | "quote_mismatch"
  | "quote_token_invalid"
  | "signature_unavailable"
  | "amount_below_minimum"
  | "return_url_not_allowed"
  | "bokun_unreachable"
  | "slot_unavailable"
  | "capacity_exceeded"
  | "category_not_ready"
  | "pricing_unavailable"
  | "config_missing"
  | "validation_failed"
  | "method_not_allowed"
  | "enquiry_only_required"
  | "internal_error";

interface CodeMeta {
  message: string;
  retryable: boolean;
}

const CODE_MAP: Record<CheckoutErrorCode, CodeMeta> = {
  quote_stale: {
    message: "Your quote just refreshed. Take a fresh look and try again.",
    retryable: true,
  },
  quote_expired: {
    message: "Your quote expired while you were deciding. We'll pull a fresh one.",
    retryable: true,
  },
  quote_mismatch: {
    message: "The saved price no longer matches this journey. Refresh to continue.",
    retryable: true,
  },
  quote_token_invalid: {
    message: "That checkout link expired. Start again to get a fresh one.",
    retryable: true,
  },
  signature_unavailable: {
    message: "This journey isn't available for that date. Try another date.",
    retryable: true,
  },
  amount_below_minimum: {
    message: "This combination is below our minimum booking. Add a moment or extend the day.",
    retryable: true,
  },
  return_url_not_allowed: {
    message: "We couldn't return you safely after checkout. Please retry from the site.",
    retryable: false,
  },
  bokun_unreachable: {
    message: "Our booking partner is briefly unreachable. Give it a moment and try again.",
    retryable: true,
  },
  slot_unavailable: {
    message: "That time slot filled while you were choosing. Pick another and we'll hold it.",
    retryable: true,
  },
  capacity_exceeded: {
    message: "This slot no longer fits your party size. Pick another time or fewer guests.",
    retryable: true,
  },
  category_not_ready: {
    message: "One of your options isn't ready to book. Refresh and try again.",
    retryable: true,
  },
  pricing_unavailable: {
    message: "We couldn't price this journey right now. Please try again.",
    retryable: true,
  },
  config_missing: {
    message: "Checkout is temporarily unavailable. Our team has been notified.",
    retryable: false,
  },
  validation_failed: {
    message: "Some details need a second look before we can continue.",
    retryable: true,
  },
  method_not_allowed: {
    message: "That action isn't supported here.",
    retryable: false,
  },
  internal_error: {
    message: "Something went wrong on our side. Please try again in a moment.",
    retryable: true,
  },
};

// Legacy raw-string → code mapping. New call sites should pass a code
// directly; this fallback keeps the ~50 pre-existing call sites working
// without a mass rewrite.
export function codeFromLegacy(raw: string): CheckoutErrorCode {
  const m = String(raw ?? "").toLowerCase();
  if (m.startsWith("quote_stale") || m.includes("quote is stale")) return "quote_stale";
  if (m.includes("expired")) return "quote_expired";
  if (m.startsWith("quote_token_mismatch") || m.startsWith("quote_total_mismatch")) return "quote_mismatch";
  if (m.startsWith("quote_token") || m.includes("quote token invalid")) return "quote_token_invalid";
  if (m.startsWith("quote_not_found") || m.startsWith("quote_lookup_failed") || m.startsWith("quote_already_consumed")) return "quote_mismatch";
  if (m.includes("journey is unavailable") || m.includes("signature")) return "signature_unavailable";
  if (m.includes("below minimum")) return "amount_below_minimum";
  if (m.includes("return url") || m.includes("cancel url")) return "return_url_not_allowed";
  if (m.startsWith("bokun_unreachable") || m.includes("bokun")) return "bokun_unreachable";
  if (m.startsWith("slot_unavailable")) return "slot_unavailable";
  if (m.startsWith("capacity_exceeded")) return "capacity_exceeded";
  if (m.startsWith("category_not_ready") || m.includes("no billable")) return "category_not_ready";
  if (m.includes("pricing unavailable")) return "pricing_unavailable";
  if (m.includes("not configured") || m.includes("invalid environment")) return "config_missing";
  if (m.includes("method not allowed")) return "method_not_allowed";
  if (
    m.startsWith("invalid ") ||
    m.includes("guests must be") ||
    m.includes("invalid body")
  )
    return "validation_failed";
  return "internal_error";
}

export interface CheckoutErrorBody {
  error: string; // legacy alias
  code: CheckoutErrorCode;
  message: string;
  retryable: boolean;
  requestId: string;
  detail?: string;
}

function newRequestId(): string {
  // Not a security token; only used for support correlation in logs.
  const rand = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(rand, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildCheckoutError(
  codeOrRaw: CheckoutErrorCode | string,
  status: number,
  corsHeaders: Record<string, string>,
  opts?: { detail?: string; requestId?: string },
): Response {
  const isKnownCode = (Object.keys(CODE_MAP) as string[]).includes(codeOrRaw);
  const code = (isKnownCode ? codeOrRaw : codeFromLegacy(String(codeOrRaw))) as CheckoutErrorCode;
  const meta = CODE_MAP[code];
  const requestId = opts?.requestId ?? newRequestId();
  const body: CheckoutErrorBody = {
    error: meta.message, // legacy string alias for old clients
    code,
    message: meta.message,
    retryable: meta.retryable,
    requestId,
    ...(opts?.detail ? { detail: opts.detail } : {}),
  };
  // Log the raw slug on the server for support correlation; never in the body.
  console.warn(
    `[checkout-error] request=${requestId} status=${status} code=${code} raw=${String(codeOrRaw).slice(0, 200)}`,
  );
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
