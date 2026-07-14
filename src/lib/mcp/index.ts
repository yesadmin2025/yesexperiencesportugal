import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listBookingsTool from "./tools/list-bookings";
import listToursTool from "./tools/list-tours";
import whoamiTool from "./tools/whoami";

// The OAuth issuer MUST be the direct Supabase host. On publish, SUPABASE_URL
// is rewritten to the `.lovable.cloud` proxy, which mcp-js rejects (RFC 8414
// issuer mismatch). VITE_SUPABASE_PROJECT_ID is inlined at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "yes-experiences-mcp",
  title: "YES Experiences MCP",
  version: "0.1.0",
  instructions:
    "Tools for YES Experiences Portugal. Use `whoami` to verify the connection, `list_tours` to browse signature tours, `list_bookings` for recent bookings (admin visibility).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listToursTool, listBookingsTool],
});
