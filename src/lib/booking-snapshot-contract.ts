/**
 * Booking snapshot contract — the single definition of "a complete designed day".
 *
 * The snapshot frozen at checkout is what BOTH confirmation emails (guest receipt
 * and internal team alert) and the Admin booking detail render. Keeping the
 * normalisation and completeness rules here means the Admin preview is, by
 * construction, exactly what the emails send.
 */

export interface SnapshotStop {
  order: number;
  label: string;
  durationMinutes: number | null;
  note: string | null;
}

export interface SnapshotEmailPreview {
  itineraryLines: string[];
  includedItems: string[];
  addOnLabels: string[];
  removedOptions: string[];
  customerNotes: string[];
}

export interface SnapshotValidation {
  ok: boolean;
  /** Human-readable names of the fields an email would be missing. */
  missing: string[];
}

type AnyRec = Record<string, unknown>;

const str = (v: unknown, max = 400): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

const strList = (v: unknown, max = 20): string[] =>
  Array.isArray(v)
    ? v
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter((s) => s.length > 0)
        .slice(0, max)
    : [];

/** Same shape the checkout writer and the email hook both produce. */
export function normalizeSnapshotItinerary(value: unknown): SnapshotStop[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s): s is AnyRec => !!s && typeof s === "object" && !!str((s as AnyRec).label, 160))
    .slice(0, 20)
    .map((s, i) => ({
      order: Number(s.order) > 0 ? Number(s.order) : i + 1,
      label: str(s.label, 160) as string,
      durationMinutes: Number.isFinite(Number(s.durationMinutes))
        ? Number(s.durationMinutes) || null
        : null,
      note: str(s.note, 240),
    }));
}

/** One itinerary line, formatted exactly as both email templates render it. */
export function formatStopLine(stop: SnapshotStop): string {
  return (
    `${stop.order}. ${stop.label}` +
    (stop.durationMinutes ? ` · ${stop.durationMinutes} min` : "") +
    (stop.note ? ` — ${stop.note}` : "")
  );
}

export function buildSnapshotEmailPreview(
  snapshot: AnyRec | null | undefined,
): SnapshotEmailPreview {
  const snap = snapshot ?? {};
  const addOns = Array.isArray(snap.addOns) ? (snap.addOns as AnyRec[]) : [];
  return {
    itineraryLines: normalizeSnapshotItinerary(snap.itinerary).map(formatStopLine),
    includedItems: strList(snap.includedItems),
    addOnLabels: addOns
      .map((a) => {
        const label = str(a?.label, 160);
        if (!label) return "";
        const price = Number(a?.priceEur);
        return price ? `${label} · €${price} pp` : label;
      })
      .filter(Boolean),
    removedOptions: strList(snap.removedOptions),
    customerNotes: strList(snap.notes),
  };
}

/**
 * A snapshot is "email-ready" only when the guest and the team would both see a
 * real designed day. Anything missing here means a confirmation email would go
 * out with a hole in it — surfaced in Admin and logged at checkout time.
 */
export function validateBookingSnapshot(snapshot: AnyRec | null | undefined): SnapshotValidation {
  const missing: string[] = [];
  if (!snapshot || typeof snapshot !== "object") {
    return { ok: false, missing: ["snapshot"] };
  }
  if (!str(snapshot.experienceName, 200) && !str(snapshot.tourTitle, 200)) {
    missing.push("experience name");
  }
  if (!str(snapshot.dateExact, 32)) missing.push("date");
  if (normalizeSnapshotItinerary(snapshot.itinerary).length === 0) missing.push("itinerary stops");
  const composition = (snapshot.composition ?? {}) as AnyRec;
  if (!Number(composition.guests)) missing.push("guest count");
  const pricing = (snapshot.pricing ?? {}) as AnyRec;
  if (!Number(pricing.totalEur)) missing.push("total price");
  return { ok: missing.length === 0, missing };
}
