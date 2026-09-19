/**
 * Guide brief — the operational summary a driver-guide needs for one day.
 *
 * Money is deliberately absent: no total, no per-person price, no add-on
 * value, no payment data. Every field comes from the frozen checkout
 * snapshot or the booking row; nothing is invented. Missing operational
 * facts read as "to confirm" so the team knows to check, rather than the
 * guide assuming.
 */

type AnyRec = Record<string, unknown>;

export type GuideBriefRow = {
  id: string;
  source_tour_id: string | null;
  customer_name: string | null;
  customer_email: string;
  customer_phone?: string | null;
  guests: number;
  preferred_date: string | null;
  notes?: string | null;
  status: string;
  stripe_session_id: string | null;
  booking_details: AnyRec | null;
};

export type GuideBrief = {
  bookingId: string;
  reference: string;
  experience: string;
  date: string;
  startTime: string;
  duration: string;
  party: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  pickup: string;
  language: string;
  stops: string[];
  requests: string[];
  status: string;
};

const TO_CONFIRM = "to confirm";

const snapshotOf = (details: AnyRec | null): AnyRec => {
  if (!details || typeof details !== "object") return {};
  const snap = details["snapshot"];
  return snap && typeof snap === "object" && !Array.isArray(snap) ? (snap as AnyRec) : {};
};

const pick = (...values: unknown[]): string | null => {
  const hit = values.find((v) => typeof v === "string" && v.trim().length > 0);
  return typeof hit === "string" ? hit.trim() : null;
};

function durationLabel(snapshot: AnyRec): string | null {
  const label = pick(snapshot["durationLabel"]);
  if (label) return label;
  const minutes = Number(snapshot["durationMinutes"]);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

function partyLabel(row: GuideBriefRow, snapshot: AnyRec): string {
  const composition = (snapshot["composition"] ?? {}) as AnyRec;
  const adults = Number(composition["adults"] ?? snapshot["adults"]);
  const minorAges = Array.isArray(composition["minorAges"])
    ? (composition["minorAges"] as unknown[])
    : Array.isArray(snapshot["minorAges"])
      ? (snapshot["minorAges"] as unknown[])
      : [];
  const ages = minorAges
    .map((a) => Number(a))
    .filter((a) => Number.isFinite(a) && a >= 0)
    .map((a) => String(a));
  const total = Number(row.guests) > 0 ? Number(row.guests) : Number(composition["guests"]) || 0;
  const parts: string[] = [];
  if (total > 0) parts.push(`${total} traveller${total === 1 ? "" : "s"}`);
  if (Number.isFinite(adults) && adults > 0) parts.push(`${adults} adult${adults === 1 ? "" : "s"}`);
  if (ages.length > 0) parts.push(`children aged ${ages.join(", ")}`);
  return parts.length > 0 ? parts.join(" · ") : TO_CONFIRM;
}

function stopLines(snapshot: AnyRec): string[] {
  const itinerary = Array.isArray(snapshot["itinerary"]) ? (snapshot["itinerary"] as AnyRec[]) : [];
  return itinerary
    .filter((s) => !!s && typeof s === "object" && !!pick(s["label"]))
    .slice(0, 20)
    .map((s, i) => {
      const order = Number(s["order"]) > 0 ? Number(s["order"]) : i + 1;
      const note = pick(s["note"]);
      return `${order}. ${pick(s["label"])}${note ? ` — ${note}` : ""}`;
    });
}

export function buildGuideBrief(row: GuideBriefRow, fallbackExperience?: string | null): GuideBrief {
  const details = row.booking_details ?? {};
  const snapshot = snapshotOf(details);
  const guestDetails = (details["guestDetails"] ?? {}) as AnyRec;

  const requests = [
    ...(Array.isArray(snapshot["notes"]) ? (snapshot["notes"] as unknown[]) : []),
    details["specialRequests"],
    guestDetails["specialRequests"],
    row.notes,
  ]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0)
    .slice(0, 8);

  return {
    bookingId: row.id,
    reference: row.stripe_session_id ?? row.id,
    experience:
      pick(snapshot["experienceName"], snapshot["tourTitle"], fallbackExperience, row.source_tour_id) ??
      "Private experience",
    date: row.preferred_date ?? pick(snapshot["dateExact"]) ?? TO_CONFIRM,
    startTime: pick(details["startTime"], snapshot["startTime"]) ?? TO_CONFIRM,
    duration: durationLabel(snapshot) ?? TO_CONFIRM,
    party: partyLabel(row, snapshot),
    guestName: row.customer_name ?? TO_CONFIRM,
    guestPhone: pick(row.customer_phone, guestDetails["phone"]) ?? TO_CONFIRM,
    guestEmail: row.customer_email,
    pickup:
      pick(
        details["pickupAddress"],
        details["pickupLabel"],
        snapshot["pickup"],
        guestDetails["pickupAddress"],
      ) ?? TO_CONFIRM,
    language: pick(details["language"], snapshot["language"], guestDetails["language"]) ?? TO_CONFIRM,
    stops: stopLines(snapshot),
    requests,
    status: row.status,
  };
}

/** Plain-text brief — used for WhatsApp, copy-to-clipboard and the email body. */
export function guideBriefText(brief: GuideBrief): string {
  const lines = [
    `YES Experiences — guide brief`,
    ``,
    `${brief.experience}`,
    `Date: ${brief.date}`,
    `Start: ${brief.startTime} · Duration: ${brief.duration}`,
    `Travellers: ${brief.party}`,
    ``,
    `Guest: ${brief.guestName}`,
    `Phone: ${brief.guestPhone}`,
    `Email: ${brief.guestEmail}`,
    `Pickup: ${brief.pickup}`,
    `Language: ${brief.language}`,
  ];
  if (brief.stops.length > 0) {
    lines.push("", "The day, stop by stop:", ...brief.stops);
  }
  if (brief.requests.length > 0) {
    lines.push("", "Notes & requests:", ...brief.requests.map((r) => `- ${r}`));
  }
  lines.push("", `Reference: ${brief.reference}`);
  return lines.join("\n");
}

/** Several briefs for the same date, in one message. */
export function guideDayText(date: string, briefs: GuideBrief[]): string {
  const header = `YES Experiences — ${date} · ${briefs.length} trip${briefs.length === 1 ? "" : "s"}`;
  return [header, "", ...briefs.map((b) => guideBriefText(b))].join("\n\n———\n\n");
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Branded HTML for the guide email. Same content as the plain text. */
export function guideBriefHtml(title: string, body: string): string {
  return [
    `<div style="font-family:Arial,sans-serif;color:#2E2E2E;max-width:600px">`,
    `<p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#295B61">YES Experiences Portugal</p>`,
    `<h1 style="font-family:Georgia,serif;font-size:22px;font-weight:normal">${escapeHtml(title)}</h1>`,
    `<pre style="white-space:pre-wrap;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;background:#FAF8F3;border-left:3px solid #C9A96A;padding:14px 16px;margin:16px 0">${escapeHtml(body)}</pre>`,
    `<p style="font-size:13px;color:#6b6b6b">Reply to this email and it reaches the YES team directly.</p>`,
    `</div>`,
  ].join("");
}

/** wa.me link with the brief pre-written. Digits only, as WhatsApp requires. */
export function whatsappLink(phone: string, body: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(body)}`;
}
