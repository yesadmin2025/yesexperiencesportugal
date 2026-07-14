// Server-side error envelope (matches client CheckoutErrorCode set).

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
  | "internal_error";

export interface CheckoutErrorEnvelope {
  error: string;
  code: CheckoutErrorCode;
  message: string;
  retryable: boolean;
}
