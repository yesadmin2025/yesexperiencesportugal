/**
 * YES Experiences MCP server — exposes a small, read-only set of tools that
 * let a signed-in traveller access THEIR OWN Studio V3 Signature journeys
 * from an external AI client (ChatGPT, Claude, Cursor…).
 *
 * Auth: managed Supabase OAuth 2.1. Every tool that touches user data reads
 * the verified email from the OAuth token — never from tool input.
 *
 * IMPORTANT: keep this module import-safe. It is evaluated both at build time
 * (manifest extraction) and at Worker cold-start where secrets aren't set —
 * so no top-level env reads, no throws. Read env inside tool handlers.
 */
import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import listMySignatureJourneysTool from "./tools/list-my-signature-journeys";
import getSignatureJourneyTool from "./tools/get-signature-journey";


// The OAuth issuer MUST be the direct supabase.co host; the SUPABASE_URL
// runtime value is rewritten to a .lovable.cloud proxy on publish, which
// mcp-js rejects (RFC 8414 issuer mismatch). VITE_SUPABASE_PROJECT_ID is
// inlined by Vite at build time as a literal string.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "yes-experiences-mcp",
  title: "YES Experiences Portugal",
  version: "0.1.0",
  instructions:
    "Read-only tools for a signed-in YES Experiences Portugal traveller. Use `list_my_signature_journeys` to see the Signature journeys the user has saved in Studio V3, then `get_signature_journey` with a share token to load the full saved state. Use `echo` to verify connectivity.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [echoTool, listMySignatureJourneysTool, getSignatureJourneyTool, getCurrentMcpIdentityTool],
});
