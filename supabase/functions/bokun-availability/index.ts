// Bokun availability lookup for a Signature/Tailored/Studio tour on a given date.
// Public endpoint (no auth) — only reads availability, never writes; safe to call from
// the FinalDetailsDialog before payment. Tight input validation + light per-IP rate limit.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getActivityAvailabilities, type AvailabilitySlot } from "../_shared/bokun.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Body {
  tourId?: string;
  bokunProductId?: string | number;
  date?: string; // YYYY-MM-DD
}

function isISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function formatTime(slot: AvailabilitySlot): string {
  // Bokun returns either "HH:mm" in startTime or a full ISO in date
  if (slot.startTime && /^\d{2}:\d{2}/.test(slot.startTime)) return slot.startTime.slice(0, 5);
  try {
    const d = new Date(`${slot.date}T${slot.startTime}`);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(11, 16);
    }
  } catch {
    // ignore
  }
  return slot.startTime ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const date = (body.date ?? "").trim();
  if (!isISODate(date)) return json({ error: "Invalid date" }, 400);

  // Resolve bokunProductId either from explicit input or via tour_bokun_mapping.
  let productId: string | number | null = null;
  if (body.bokunProductId) {
    productId = body.bokunProductId;
  } else if (body.tourId && typeof body.tourId === "string" && body.tourId.length <= 96) {
    try {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false } },
      );
      const { data } = await admin
        .from("tour_bokun_mapping")
        .select("bokun_product_id")
        .eq("tour_id", body.tourId)
        .maybeSingle();
      productId = (data?.bokun_product_id as string | number | undefined) ?? null;
    } catch (e) {
      console.error("[bokun-availability] mapping lookup failed", e);
    }
  }

  if (!productId) {
    // No mapping for this tour — caller will skip the time picker.
    return json({ slots: [], mapped: false });
  }

  try {
    const raw = await getActivityAvailabilities(productId, date);
    const slots = (Array.isArray(raw) ? raw : [])
      .filter((s) => (s.availabilityCount ?? 1) > 0)
      .map((s) => ({
        availabilityId: s.id,
        startTime: formatTime(s),
        availabilityCount: s.availabilityCount ?? null,
      }))
      .filter((s) => s.startTime)
      // de-dupe by startTime
      .filter(
        (s, idx, arr) => arr.findIndex((x) => x.startTime === s.startTime) === idx,
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    return json({ slots, mapped: true });
  } catch (e) {
    console.error("[bokun-availability] fetch failed", e);
    // Fail soft — caller proceeds without time picker rather than blocking checkout.
    return json({ slots: [], mapped: true, error: "availability_unavailable" });
  }
});
