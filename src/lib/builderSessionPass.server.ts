import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * True only when `pass` matches the server-issued ownership pass for this
 * builder session. Unclaimed sessions have no uploads, so they never verify.
 */
export async function verifyBuilderSessionPass(
  sessionId: string,
  pass: string | undefined,
): Promise<boolean> {
  if (!pass) return false;
  const { data, error } = await supabaseAdmin
    .from("builder_session_passes")
    .select("pass")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error || !data?.pass) return false;
  return data.pass === pass;
}
