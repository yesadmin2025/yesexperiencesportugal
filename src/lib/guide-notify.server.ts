import { GUIDE_NOTIFY_KINDS, guideNotifyMessage, type GuideNotifyKind } from "@/lib/guide-notify";

/**
 * Emails every not-yet-emailed guide assignment notification for a booking.
 * Each notification row is claimed atomically (emailed_at) before sending and
 * uses its id as idempotency key, so retries never send twice.
 */
export async function dispatchGuideAssignmentEmails(bookingId: string): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin
    .from("ops_notifications")
    .select("id, guide_id, assignment_id, notification_type")
    .eq("booking_id", bookingId)
    .is("emailed_at", null)
    .in("notification_type", GUIDE_NOTIFY_KINDS);
  if (!rows?.length) return 0;
  const { data: b } = await supabaseAdmin
    .from("bookings")
    .select("preferred_date, start_time, tour_title, source_tour_id, customer_name, guests, pickup_location")
    .eq("id", bookingId)
    .maybeSingle();
  const { guideBriefHtml } = await import("@/lib/guide-brief");
  const { sendTransactionalInternal } = await import("@/lib/email/send-internal.server");
  let sent = 0;
  for (const n of rows) {
    const { data: claimed } = await supabaseAdmin
      .from("ops_notifications")
      .update({ emailed_at: new Date().toISOString(), email_status: "sending" })
      .eq("id", n.id).is("emailed_at", null).select("id");
    if (!claimed?.length || !n.guide_id) continue;
    const { data: g } = await supabaseAdmin.from("guides").select("email").eq("id", n.guide_id).maybeSingle();
    let status = "no_email";
    if (g?.email) {
      const msg = guideNotifyMessage(n.notification_type as GuideNotifyKind, {
        assignmentId: n.assignment_id, preferredDate: b?.preferred_date ?? null, startTime: b?.start_time ?? null,
        tourTitle: b?.tour_title ?? b?.source_tour_id ?? null, guestName: b?.customer_name ?? null,
        guests: b?.guests ?? null, pickup: b?.pickup_location ?? null,
      });
      try {
        const res = await sendTransactionalInternal({
          templateName: "guide-brief", recipientEmail: g.email, idempotencyKey: `guide-notif-${n.id}`,
          rendered: { subject: msg.subject, html: guideBriefHtml(msg.subject, msg.text), text: msg.text },
        });
        status = res.ok ? "sent" : `failed:${"reason" in res ? String(res.reason) : "unknown"}`;
        if (res.ok) sent++;
      } catch (e) {
        status = "failed:error";
        console.error("guide notification email failed", e);
      }
    }
    await supabaseAdmin.from("ops_notifications").update({ email_status: status }).eq("id", n.id);
    await supabaseAdmin.from("operational_activity_log").insert({
      booking_id: bookingId, guide_id: n.guide_id, action: `guide_notified_${n.notification_type}`, new_value: { email_status: status },
    });
  }
  return sent;
}
