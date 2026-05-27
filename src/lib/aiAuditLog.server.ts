import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AiUsageStatus = "success" | "failure" | "rate_limited" | "fallback";

export interface AiUsageLogInput {
  provider: "openai" | "lovable_ai" | "none";
  model?: string | null;
  feature: string;
  status: AiUsageStatus;
  latencyMs?: number;
  configHash?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}

/** Hash a configuration object so we can group identical requests without
 *  storing personal data. */
export function hashConfig(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value ?? null))
    .digest("hex")
    .slice(0, 16);
}

/** Insert an audit row. Never throws — logging failure must never break
 *  the user-facing call. */
export async function logAiUsage(entry: AiUsageLogInput): Promise<void> {
  try {
    await supabaseAdmin.from("ai_usage_logs").insert({
      provider: entry.provider,
      model: entry.model ?? null,
      feature: entry.feature,
      status: entry.status,
      latency_ms: entry.latencyMs ?? null,
      config_hash: entry.configHash ?? null,
      error_code: entry.errorCode ?? null,
      error_message: entry.errorMessage?.slice(0, 500) ?? null,
      metadata: (entry.metadata ?? {}) as never,
    } as never);
  } catch (err) {
    console.error("[aiAuditLog] failed to record usage:", err);
  }
}
