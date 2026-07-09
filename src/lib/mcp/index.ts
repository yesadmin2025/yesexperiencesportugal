import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSignatureToursTool from "./tools/list-signature-tours";
import listMyBookingsTool from "./tools/list-my-bookings";
import getMyBookingTool from "./tools/get-my-booking";

// The OAuth issuer MUST be the direct Supabase host. On publish, SUPABASE_URL
// is rewritten to the `.lovable.cloud` proxy, which mcp-js rejects (RFC 8414
// issuer mismatch). The project ref is the only Supabase value that survives
// publish unchanged. It is inlined by Vite at build time as a literal.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "yes-experiences-portugal-mcp",
  title: "YES Experiences Portugal",
  version: "0.1.0",
  instructions:
    "Tools for YES Experiences Portugal — a premium tourism site. `list_signature_tours` browses the public Signature tour catalog. `list_my_bookings` and `get_my_booking` return the signed-in traveller's own bookings (matched by verified email; RLS enforced).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listSignatureToursTool, listMyBookingsTool, getMyBookingTool],
});
