import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { getOrCreateAnonId } from "@/lib/ab-testing";

export type BuilderEvent =
  | "reset"
  | "review_reset"
  | "pro_share_created"
  | "studio_v2_save_click"
  | "studio_v2_save_success"
  | "studio_v2_save_error"
  | "studio_v2_secure_click"
  | "studio_v2_refine_click"
  | "studio_v2_refine_swap"
  | "studio_v2_refine_remove"
  | "studio_v2_refine_reorder"
  | "studio_v2_predict_signal"
  | "studio_v2_predict_signal_error"
  | "studio_v2_booking_draft_create"
  | "studio_v2_booking_submit"
  | "studio_v2_checkout_view"
  | "studio_v2_checkout_abandon"
  | "studio_v2_checkout_back_to_refine"
  | "studio_v2_map_reveal"
  | "studio_v2_daybreak_shown"
  | "studio_v2_multiday_composed"
  | "studio_v2_warm_resume"
  | "studio_v2_invitation_view"
  | "studio_v2_invitation_accept";

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
