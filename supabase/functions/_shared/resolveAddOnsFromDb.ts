// Server-authoritative add-on resolver — DB is truth for label, unit price,
// pricing unit, and active status. Browser can name IDs + quantities only.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { BookingFlow, BookingQuoteAddOnLine, BookingAddOnPricingUnit } from "./bookingQuote.ts";

export interface AddOnRequest {
  id: string;
  quantity: number;
}

export interface ResolveAddOnsInput {
  flow: BookingFlow;
  commercialProductKey: string;
  requested: AddOnRequest[];
  totalParticipants: number;
}

export interface ResolveAddOnsResult {
  ok: boolean;
  reason?: "add_on_invalid";
  invalidIds?: string[];
  lines: BookingQuoteAddOnLine[];
  subtotalEur: number;
}

export async function resolveAddOnsFromDb(
  admin: SupabaseClient,
  input: ResolveAddOnsInput,
): Promise<ResolveAddOnsResult> {
  const requested = (input.requested ?? []).filter((r) => r && typeof r.id === "string" && r.quantity > 0);
  if (!requested.length) return { ok: true, lines: [], subtotalEur: 0 };

  const scope: "signature" | "studio" = input.flow === "studio" ? "studio" : "signature";
  const ids = [...new Set(requested.map((r) => r.id))];

  // Load add-on rows + confirm they are exposed for this scope+tour and both active.
  const [addOnsRes, availRes] = await Promise.all([
    admin
      .from("booking_add_ons")
      .select("id, label, pricing_unit, unit_eur, active")
      .in("id", ids),
    admin
      .from("tour_available_add_ons")
      .select("add_on_id, active")
      .eq("scope", scope)
      .eq("tour_id", input.commercialProductKey)
      .in("add_on_id", ids),
  ]);

  if (addOnsRes.error || availRes.error) {
    return { ok: false, reason: "add_on_invalid", invalidIds: ids, lines: [], subtotalEur: 0 };
  }

  const addOnById = new Map(
    (addOnsRes.data ?? [])
      .filter((r) => r.active)
      .map((r) => [r.id, {
        id: r.id as string,
        label: r.label as string,
        pricingUnit: r.pricing_unit as BookingAddOnPricingUnit,
        unitEur: Number(r.unit_eur),
      }]),
  );
  const availableIds = new Set(
    (availRes.data ?? []).filter((r) => r.active).map((r) => r.add_on_id as string),
  );

  const invalidIds: string[] = [];
  const lines: BookingQuoteAddOnLine[] = [];
  for (const req of requested) {
    const row = addOnById.get(req.id);
    if (!row || !availableIds.has(req.id)) {
      invalidIds.push(req.id);
      continue;
    }
    const quantity = quantityFor(row.pricingUnit, req.quantity, input.totalParticipants);
    const subtotalEur = Math.round(row.unitEur * quantity * 100) / 100;
    lines.push({
      id: row.id,
      label: row.label,
      pricingUnit: row.pricingUnit,
      quantity,
      unitEur: row.unitEur,
      subtotalEur,
    });
  }

  if (invalidIds.length) {
    return { ok: false, reason: "add_on_invalid", invalidIds, lines: [], subtotalEur: 0 };
  }

  const subtotalEur = Math.round(lines.reduce((s, l) => s + l.subtotalEur, 0) * 100) / 100;
  return { ok: true, lines, subtotalEur };
}

function quantityFor(unit: BookingAddOnPricingUnit, requested: number, totalParticipants: number): number {
  switch (unit) {
    case "per_person":
      return Math.max(1, totalParticipants);
    case "per_vehicle":
      return Math.max(1, Math.ceil(totalParticipants / 4)) * Math.max(1, requested);
    case "per_group":
    case "fixed":
      return Math.max(1, Math.round(requested));
  }
}
