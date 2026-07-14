/**
 * parseCheckoutError — normalises anything a Supabase functions.invoke() or
 * fetch() throw might carry into a stable, guest-safe shape.
 *
 * Handles:
 *   (a) New envelope: { error, code, message, retryable, requestId }
 *   (b) Legacy envelope: { error: "human string" }
 *   (c) FunctionsHttpError with a Response context (SDK v2)
 *   (d) Native TypeError / network / abort
 *   (e) Unknown throws
 */

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
  | "network_error"
  | "enquiry_only_required"
  | "internal_error";

export interface ParsedCheckoutError {
  code: CheckoutErrorCode;
  userMessage: string;
  retryable: boolean;
  supportId?: string;
}

const COPY: Record<CheckoutErrorCode, { message: string; retryable: boolean }> = {
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
  network_error: {
    message: "Your connection dropped for a moment. Try again — nothing has been charged.",
    retryable: true,
  },
  enquiry_only_required: {
    message:
      "This journey needs a quick human review before we can hold your date. Send us a message and we'll confirm within a few hours.",
    retryable: false,
  },
  internal_error: {
    message: "Something went wrong on our side. Please try again in a moment.",
    retryable: true,
  },
};

const KNOWN_CODES = new Set(Object.keys(COPY));

function codeFromLegacyString(raw: string): CheckoutErrorCode {
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
  if (m.includes("network") || m.includes("failed to fetch") || m.includes("load failed"))
    return "network_error";
  if (
    m.startsWith("enquiry_only_required") ||
    m.startsWith("manual_pricing_forbidden_in_production") ||
    m.startsWith("manual_source_forbidden")
  )
    return "enquiry_only_required";
  if (
    m.startsWith("invalid ") ||
    m.includes("guests must be") ||
    m.includes("invalid body")
  )
    return "validation_failed";
  return "internal_error";
}

function toParsed(code: CheckoutErrorCode, supportId?: string): ParsedCheckoutError {
  const meta = COPY[code];
  return { code, userMessage: meta.message, retryable: meta.retryable, supportId };
}

async function readContextResponse(context: unknown): Promise<Record<string, unknown> | null> {
  if (!context || typeof context !== "object") return null;
  const resp = context as { json?: () => Promise<unknown>; clone?: () => Response };
  try {
    if (typeof resp.clone === "function") {
      const cloned = resp.clone();
      const parsed = (await cloned.json()) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    }
    if (typeof resp.json === "function") {
      const parsed = (await resp.json()) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function parseCheckoutError(err: unknown): Promise<ParsedCheckoutError> {
  if (!err) return toParsed("internal_error");

  // Envelope object literal (already-parsed body).
  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;
    const code = typeof obj.code === "string" && KNOWN_CODES.has(obj.code) ? (obj.code as CheckoutErrorCode) : null;
    if (code) return toParsed(code, typeof obj.requestId === "string" ? obj.requestId : undefined);

    // FunctionsHttpError shape: { message, context?: Response }
    const context = (obj as { context?: unknown }).context;
    if (context) {
      const body = await readContextResponse(context);
      if (body) {
        const bodyCode = typeof body.code === "string" && KNOWN_CODES.has(body.code) ? (body.code as CheckoutErrorCode) : null;
        if (bodyCode) {
          return toParsed(bodyCode, typeof body.requestId === "string" ? body.requestId : undefined);
        }
        if (typeof body.error === "string") {
          return toParsed(codeFromLegacyString(body.error));
        }
      }
    }

    // AbortError / network TypeError
    const name = typeof obj.name === "string" ? obj.name : "";
    if (name === "AbortError" || name === "TypeError") return toParsed("network_error");

    if (typeof obj.error === "string") return toParsed(codeFromLegacyString(obj.error));
    if (typeof obj.message === "string") return toParsed(codeFromLegacyString(obj.message));
  }

  if (typeof err === "string") return toParsed(codeFromLegacyString(err));

  return toParsed("internal_error");
}

/** Sync fallback for call sites that can't await (e.g. inside render). */
export function parseCheckoutErrorSync(err: unknown): ParsedCheckoutError {
  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;
    if (typeof obj.code === "string" && KNOWN_CODES.has(obj.code)) {
      return toParsed(obj.code as CheckoutErrorCode, typeof obj.requestId === "string" ? obj.requestId : undefined);
    }
    if (typeof obj.error === "string") return toParsed(codeFromLegacyString(obj.error));
    if (typeof obj.message === "string") return toParsed(codeFromLegacyString(obj.message));
  }
  if (typeof err === "string") return toParsed(codeFromLegacyString(err));
  return toParsed("internal_error");
}
