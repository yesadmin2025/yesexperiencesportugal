import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { getOrCreateAnonId } from "@/lib/ab-testing";

export type BuilderEvent = "reset" | "review_reset" | "pro_share_created";

/** Fire-and-forget builder analytics. Never blocks UX. */
export async function trackBuilderEvent(
  event: BuilderEvent,
  meta?: Record<string, unknown>,
): Promise<void> {
  if (typeof window === "undefined") return;
  const anonId = getOrCreateAnonId();
  if (!anonId) return;
  try {
    await supabase.from("builder_events").insert([
      {
        anonymous_id: anonId,
        event,
        route: window.location.pathname,
        meta: meta ? (JSON.parse(JSON.stringify(meta)) as Json) : null,
      },
    ]);
  } catch {
    /* swallow */
  }
}
