// Minimal checkout error mapper — no Bókun-specific codes.

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

const COPY: Record<CheckoutErrorCode, { message: string; retryable: boolean }> = {
  tour_id_required: { message: "Missing tour reference — please refresh.", retryable: true },
  tour_title_required: { message: "Missing tour details — please refresh.", retryable: true },
  price_from_required: { message: "Pricing unavailable — please refresh.", retryable: true },
  date_invalid: { message: "Please pick a valid date.", retryable: true },
  composition_required: { message: "Please tell us who is travelling.", retryable: true },
  environment_invalid: { message: "Payment environment unavailable.", retryable: false },
  return_url_not_allowed: { message: "Return URL not allowed.", retryable: false },
  no_billable_guests: { message: "Please add at least one adult, youth or child.", retryable: true },
  no_billable_lines: { message: "No billable items in this booking.", retryable: true },
  amount_below_minimum: { message: "Below the minimum booking amount.", retryable: false },
  method_not_allowed: { message: "Request method not allowed.", retryable: false },
  invalid_json: { message: "Malformed request — please try again.", retryable: true },
  network_error: { message: "Network unavailable. Check your connection and try again.", retryable: true },
  internal_error: { message: "Checkout unavailable right now. Please try again in a moment.", retryable: true },
};

function isKnownCode(v: unknown): v is CheckoutErrorCode {
  return typeof v === "string" && v in COPY;
}

export async function parseCheckoutError(err: unknown): Promise<ParsedCheckoutError> {
  // Native network error
  if (err instanceof TypeError) {
    return { code: "network_error", ...COPY.network_error };
  }
  // Supabase FunctionsHttpError with context response
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
