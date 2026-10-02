/**
 * Tailor → Contact handoff for days that need team confirmation.
 *
 * The composition travels through sessionStorage (same tab, short-lived),
 * never the URL, so nothing personal or long lands in links or analytics.
 * The URL only carries `from=tailor` so Contact knows to look.
 */
export const TAILOR_HANDOFF_KEY = "yes:tailor-handoff";
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

export interface TailorHandoff {
  tourId: string;
  title: string;
  date: string;
  guests: string;
  stops: string[];
  removed: string[];
  pickup?: string;
  savedAt: number;
}

export function describeGuests(adults: number, minors: number): string {
  const a = `${adults} adult${adults === 1 ? "" : "s"}`;
  return minors > 0 ? `${a}, ${minors} child${minors === 1 ? "" : "ren"}` : a;
}

export function saveTailorHandoff(h: Omit<TailorHandoff, "savedAt">, now = Date.now()): void {
  try {
    const clean: TailorHandoff = {
      ...h,
      title: h.title.slice(0, 120),
      stops: h.stops.slice(0, 20).map((s) => s.slice(0, 80)),
      removed: h.removed.slice(0, 20).map((s) => s.slice(0, 80)),
      savedAt: now,
    };
    window.sessionStorage.setItem(TAILOR_HANDOFF_KEY, JSON.stringify(clean));
  } catch {
    /* storage unavailable — Contact simply opens empty */
  }
}

export function readTailorHandoff(now = Date.now()): TailorHandoff | null {
  try {
    const raw = window.sessionStorage.getItem(TAILOR_HANDOFF_KEY);
    if (!raw) return null;
    const h = JSON.parse(raw) as TailorHandoff;
    if (!h || typeof h.title !== "string" || !Array.isArray(h.stops)) return null;
    if (typeof h.savedAt !== "number" || now - h.savedAt > MAX_AGE_MS) return null;
    return h;
  } catch {
    return null;
  }
}

export function clearTailorHandoff(): void {
  try {
    window.sessionStorage.removeItem(TAILOR_HANDOFF_KEY);
  } catch {
    /* ignore */
  }
}

/** Plain-text message prefilled into the Contact form. */
export function tailorHandoffMessage(h: TailorHandoff): string {
  const lines = [
    "I'd like YES to confirm this tailored day:",
    `${h.title}`,
    `Date: ${h.date || "flexible"}`,
    `Guests: ${h.guests}`,
    `My day: ${h.stops.join(" · ") || "—"}`,
  ];
  if (h.removed.length > 0) lines.push(`Removed / changed: ${h.removed.join(" · ")}`);
  if (h.pickup) lines.push(`Pickup: ${h.pickup}`);
  return lines.join("\n");
}
