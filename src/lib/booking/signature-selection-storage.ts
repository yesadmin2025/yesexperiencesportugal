/**
 * Per-tour, per-session memory of the Signature booking selection (date +
 * party) so Back/Forward or leaving and returning never loses it.
 * sessionStorage only: ends with the browser session, never crosses tours.
 */

export interface SignatureSelection {
  readonly date: string;
  readonly adults: number;
  readonly minorAges: readonly number[];
}

const PREFIX = "yes.signatureSelection.v1:";
const MAX_AGE_MS = 1000 * 60 * 60 * 12;

function key(tourId: string): string {
  return `${PREFIX}${tourId}`;
}

function todayIso(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function readSignatureSelection(
  tourId: string,
  now: Date = new Date(),
): SignatureSelection | null {
  if (typeof window === "undefined" || !tourId) return null;
  try {
    const raw = window.sessionStorage.getItem(key(tourId));
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<SignatureSelection> & { savedAt?: number };
    const stale = typeof v.savedAt !== "number" || now.getTime() - v.savedAt > MAX_AGE_MS;
    const validDate =
      typeof v.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.date) && v.date > todayIso(now);
    const validAdults = Number.isInteger(v.adults) && (v.adults as number) >= 1 && (v.adults as number) <= 20;
    const validMinors =
      Array.isArray(v.minorAges) &&
      v.minorAges.every((a) => Number.isInteger(a) && a >= 0 && a <= 17);
    if (stale || !validAdults || !validMinors) {
      window.sessionStorage.removeItem(key(tourId));
      return null;
    }
    return {
      date: validDate ? (v.date as string) : "",
      adults: v.adults as number,
      minorAges: v.minorAges as number[],
    };
  } catch {
    return null;
  }
}

export function writeSignatureSelection(tourId: string, sel: SignatureSelection): void {
  if (typeof window === "undefined" || !tourId) return;
  try {
    window.sessionStorage.setItem(key(tourId), JSON.stringify({ ...sel, savedAt: Date.now() }));
  } catch {
    /* storage full / disabled — selection simply isn't remembered */
  }
}

export function clearSignatureSelection(tourId?: string): void {
  if (typeof window === "undefined") return;
  try {
    if (tourId) {
      window.sessionStorage.removeItem(key(tourId));
      return;
    }
    for (let i = window.sessionStorage.length - 1; i >= 0; i--) {
      const k = window.sessionStorage.key(i);
      if (k?.startsWith(PREFIX)) window.sessionStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}
