/**
 * Guide App data access. Uses the signed-in browser session; every read is
 * scoped server-side to the guide's own record (RLS + secure functions), so
 * nothing here can reach another guide's data or any booking finances.
 */
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

export type GuideTour = {
  assignment_id: string;
  booking_id: string;
  tour_title: string | null;
  tour_date: string;
  start_time: string | null;
  start_at: string;
  end_at: string;
  guests: number | null;
  pax_breakdown: unknown;
  language: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  guest_first_name: string | null;
  client_notes: string | null;
  status: string;
  guide_viewed_at: string | null;
  guide_confirmed_at: string | null;
  changed_at: string | null;
  booking_cancelled: boolean;
};

export async function fetchMyTours(): Promise<GuideTour[]> {
  const { data, error } = await db.rpc("guide_my_tours", {});
  if (error) throw new Error(error.message);
  return data ?? [];
}

export const todayIso = () => new Date().toISOString().slice(0, 10);
export const fmtDate = (s: string) =>
  new Date(`${s}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

export function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong";
}
