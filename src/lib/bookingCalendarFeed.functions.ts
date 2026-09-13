/**
 * Admin-only: reveal the private calendar subscription URL.
 *
 * The token lives server-side; only an authenticated admin can read the URL.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getBookingCalendarFeedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ context }: { context: any }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error || data !== true) throw new Error("Forbidden");

    const token = process.env["CALENDAR_FEED_TOKEN"] ?? "";
    if (!token) return { url: null as string | null };
    const siteUrl = process.env["SITE_URL"] ?? "https://yesexperiencesportugal.com";
    return {
      url: `${siteUrl}/api/public/booking-calendar?token=${encodeURIComponent(token)}`,
    };
  });
