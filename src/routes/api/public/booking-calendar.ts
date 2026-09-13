/**
 * Operator calendar subscription feed (iCalendar).
 *
 * Public prefix so Google/Apple Calendar can poll it without a login session,
 * but every request must carry the secret CALENDAR_FEED_TOKEN. No token, no
 * data. Read-only: it never writes, refunds, or reprices anything.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  buildBookingCalendar,
  type CalendarBookingRow,
} from "@/lib/booking-calendar-feed.server";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/booking-calendar")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const expected = process.env["CALENDAR_FEED_TOKEN"] ?? "";
        if (!expected) {
          return new Response("Calendar feed is not configured", { status: 503 });
        }
        const url = new URL(request.url);
        const token =
          url.searchParams.get("token") ??
          (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (!token || !safeEqual(token, expected)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const from = new Date();
        from.setUTCDate(from.getUTCDate() - 90);
        const { data, error } = await supabaseAdmin
          .from("bookings")
          .select(
            "id, created_at, source_tour_id, customer_name, customer_email, customer_phone, guests, preferred_date, status, stripe_session_id, booking_details",
          )
          .in("status", ["paid", "pending"])
          .not("preferred_date", "is", null)
          .gte("preferred_date", from.toISOString().slice(0, 10))
          .order("preferred_date", { ascending: true })
          .limit(1000);

        if (error) {
          console.error("[booking-calendar] query failed", error.message);
          return new Response("Calendar unavailable", { status: 500 });
        }

        const siteUrl = process.env["SITE_URL"] ?? "https://yesexperiencesportugal.com";
        const ics = buildBookingCalendar(
          (data ?? []) as unknown as CalendarBookingRow[],
          siteUrl,
        );

        return new Response(ics, {
          status: 200,
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Robots-Tag": "noindex, nofollow",
            "Content-Disposition": 'inline; filename="yes-reservations.ics"',
          },
        });
      },
    },
  },
});
