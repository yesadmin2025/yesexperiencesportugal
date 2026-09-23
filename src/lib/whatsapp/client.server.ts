/**
 * Server-only WhatsApp Business reader.
 *
 * Every call goes through the Lovable connector gateway — no Meta tokens exist
 * in this codebase and nothing here is reachable from the browser. Until the
 * owner links the WhatsApp Business connection, `whatsappConfigured()` is false
 * and the admin surface shows a setup state instead of failing.
 */
const GATEWAY_URL = "https://connector-gateway.lovable.dev/whatsapp";

function credentials(): { lovableKey: string; connectionKey: string } | null {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["WHATSAPP_API_KEY"];
  if (!lovableKey || !connectionKey) return null;
  return { lovableKey, connectionKey };
}

export function whatsappConfigured(): boolean {
  return credentials() !== null;
}

async function gateway(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<unknown> {
  const creds = credentials();
  if (!creds) throw new Error("whatsapp_not_configured");
  const response = await fetch(`${GATEWAY_URL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${creds.lovableKey}`,
      "X-Connection-Api-Key": creds.connectionKey,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const text = await response.text();
  if (!response.ok) {
    // Surface the provider's own status and body — never a generic 500.
    throw new Error(`whatsapp_request_failed [${response.status}]: ${text.slice(0, 500)}`);
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export type WhatsAppNumberInfo = {
  displayPhoneNumber: string | null;
  qualityRating: string | null;
  platformType: string | null;
  isOnBusinessApp: boolean | null;
};

/** The connected business number, or null when the connection is not linked. */
export async function getWhatsAppNumber(): Promise<WhatsAppNumberInfo | null> {
  if (!whatsappConfigured()) return null;
  const raw = (await gateway(
    "/phone_number?fields=display_phone_number,quality_rating,platform_type,is_on_biz_app",
  )) as Record<string, unknown>;
  return {
    displayPhoneNumber: typeof raw["display_phone_number"] === "string" ? raw["display_phone_number"] : null,
    qualityRating: typeof raw["quality_rating"] === "string" ? raw["quality_rating"] : null,
    platformType: typeof raw["platform_type"] === "string" ? raw["platform_type"] : null,
    isOnBusinessApp: typeof raw["is_on_biz_app"] === "boolean" ? (raw["is_on_biz_app"] as boolean) : null,
  };
}

/**
 * Asks Meta to replay past chats and the phone's contacts to our webhook.
 * Meta only accepts this within 24 hours of connecting a number that is also
 * on the WhatsApp Business app, so a rejection here is expected outside that
 * window and is reported verbatim.
 */
export async function requestWhatsAppHistorySync(): Promise<{
  requested: Array<"smb_app_state_sync" | "history">;
  errors: string[];
}> {
  const requested: Array<"smb_app_state_sync" | "history"> = [];
  const errors: string[] = [];
  for (const syncType of ["smb_app_state_sync", "history"] as const) {
    try {
      await gateway("/smb_app_data", {
        method: "POST",
        body: { messaging_product: "whatsapp", sync_type: syncType },
      });
      requested.push(syncType);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return { requested, errors };
}
