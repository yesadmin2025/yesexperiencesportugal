/**
 * Phase 0A — temporary identity confirmation tool.
 *
 * Returns ONLY masked identity fields for the caller. Requires OAuth + admin
 * role. No allow-list check yet (bootstrap). Removed the moment Phase 0B ships.
 *
 * Business-data forbidden here: this file must NOT reference imported_tours,
 * booking_quotes, bookings, studio_v3_leads, email_send_log,
 * stripe_webhook_events, client_error_logs, supabaseAdmin, or client.server.
 */

import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin } from "../../lib/two-factor-guard";
import { maskEmail, maskUid, safeError } from "../../lib/redact";
import { checkRateLimit } from "../../lib/rate-limit";

export default defineTool({
  name: "get_current_mcp_identity",
  title: "Get current MCP identity (bootstrap)",
  description:
    "Temporary bootstrap tool. Returns the masked identity of the signed-in caller so the owner can confirm the exact account before the allow-list is populated. Requires OAuth + admin role. Removed once the owner allow-list is active.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    try {
      const guard = await requireAdmin(ctx);
      if (!guard.ok) {
        return {
          content: [{ type: "text", text: guard.message }],
          isError: true,
        };
      }

      const rl = checkRateLimit(`identity:${guard.uid}`, 10, 60_000);
      if (!rl.ok) {
        return {
          content: [{ type: "text", text: "Rate limit exceeded." }],
          isError: true,
        };
      }

      const data = {
        authenticated: true as const,
        maskedUserId: maskUid(guard.uid),
        role: "admin" as const,
        verifiedEmailMasked: maskEmail(guard.email),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: data,
      };
    } catch (err) {
      const e = safeError(err);
      return { content: [{ type: "text", text: e.message }], isError: true };
    }
  },
});
