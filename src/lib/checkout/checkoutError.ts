// Minimal checkout error mapper — no external-service specific codes.

export type CheckoutErrorCode =
  | "tour_id_required"
  | "tour_title_required"
  | "price_from_required"
  | "date_invalid"
  | "composition_required"
  | "environment_invalid"
  | "return_url_not_allowed"
  | "no_billable_guests"
  | "no_billable_lines"
  | "amount_below_minimum"
  | "method_not_allowed"
  | "invalid_json"
  | "network_error"
  | "internal_error";

export interface ParsedCheckoutError {
  code: CheckoutErrorCode;
  userMessage: string;
  retryable: boolean;
}

const COPY: Record<CheckoutErrorCode, { userMessage: string; retryable: boolean }> = {
  tour_id_required: { userMessage: "Missing tour reference — please refresh.", retryable: true },
  tour_title_required: { userMessage: "Missing tour details — please refresh.", retryable: true },
  price_from_required: { userMessage: "Pricing unavailable — please refresh.", retryable: true },
  date_invalid: { userMessage: "Please pick a valid date.", retryable: true },
  composition_required: { userMessage: "Please tell us who is travelling.", retryable: true },
  environment_invalid: { userMessage: "Payment environment unavailable.", retryable: false },
  return_url_not_allowed: { userMessage: "Return URL not allowed.", retryable: false },
  no_billable_guests: { userMessage: "Please add at least one adult, youth or child.", retryable: true },
  no_billable_lines: { userMessage: "No billable items in this booking.", retryable: true },
  amount_below_minimum: { userMessage: "Below the minimum booking amount.", retryable: false },
  method_not_allowed: { userMessage: "Request method not allowed.", retryable: false },
  invalid_json: { userMessage: "Malformed request — please try again.", retryable: true },
  network_error: { userMessage: "Network unavailable. Check your connection and try again.", retryable: true },
  internal_error: { userMessage: "Checkout unavailable right now. Please try again in a moment.", retryable: true },
};

function isKnownCode(v: unknown): v is CheckoutErrorCode {
  return typeof v === "string" && v in COPY;
}

export async function parseCheckoutError(err: unknown): Promise<ParsedCheckoutError> {
  if (err instanceof TypeError) return { code: "network_error", ...COPY.network_error };
  const anyErr = err as { context?: { json?: () => Promise<unknown> }; message?: string } | null;
  if (anyErr?.context?.json) {
    try {
      const body = await anyErr.context.json();
      const code = (body as { code?: string; error?: string })?.code ?? (body as { error?: string })?.error;
      if (isKnownCode(code)) return { code, ...COPY[code] };
    } catch {
      // fall through
    }
  }
  const msg = (anyErr?.message ?? "").toLowerCase();
  if (msg.includes("failed to fetch") || msg.includes("network")) {
    return { code: "network_error", ...COPY.network_error };
  }
  return { code: "internal_error", ...COPY.internal_error };
}

export function toParsedError(code: CheckoutErrorCode): ParsedCheckoutError {
  return { code, ...COPY[code] };
}
