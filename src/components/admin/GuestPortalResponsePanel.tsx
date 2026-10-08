import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function GuestPortalResponsePanel({ bookingId }: { bookingId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["guest-portal-response", bookingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("guest_portal_responses")
        .select("attendance_confirmed_at, pickup_update, guest_names, guest_note, updated_at")
        .eq("booking_id", bookingId)
        .maybeSingle();
      return data;
    },
  });
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data?.attendance_confirmed_at)
    return <p className="text-sm text-muted-foreground">Guest has not confirmed attendance yet.</p>;
  return (
    <dl className="grid gap-2 text-sm">
      <div><dt className="text-muted-foreground">Confirmed</dt><dd>{new Date(data.attendance_confirmed_at).toLocaleString("en-GB", { timeZone: "Europe/Lisbon" })}</dd></div>
      {data.pickup_update ? <div><dt className="text-muted-foreground">Pickup (from guest)</dt><dd>{data.pickup_update}</dd></div> : null}
      {data.guest_names?.length ? <div><dt className="text-muted-foreground">Guest names</dt><dd>{data.guest_names.join(", ")}</dd></div> : null}
      {data.guest_note ? <div><dt className="text-muted-foreground">Note</dt><dd className="whitespace-pre-line">{data.guest_note}</dd></div> : null}
    </dl>
  );
}
