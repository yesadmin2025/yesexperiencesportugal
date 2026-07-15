/**
 * Phase 0B audit helper.
 *
 * Records ONLY the caller uid, tool name, and outcome. NO request payload,
 * NO response payload, NO free-text messages. Fire-and-forget: failures are
 * swallowed so an audit outage never breaks a tool call.
 */

export type AuditOutcome = "allowed" | "denied" | "error";

export async function recordAudit(
  userId: string,
  toolName: string,
  outcome: AuditOutcome,
): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("mcp_owner_audit_log").insert({
      user_id: userId,
      tool_name: toolName,
      outcome,
    });
  } catch {
    // Never throw from the audit path.
  }
}
