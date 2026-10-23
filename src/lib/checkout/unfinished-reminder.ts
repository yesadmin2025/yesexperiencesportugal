/**
 * Rules for the one-time "reservation not completed" notice sent when a live
 * Stripe Checkout session expires unpaid. Pure so it can be unit tested.
 */
// Whole-word markers only; common surnames (e.g. Almeida) must never be filtered.
const INTERNAL_WORDS = new Set(["test", "teste", "testing"]);

export function isInternalTestName(name: string | null | undefined): boolean {
  const n = (name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const words = n.split(/[^a-z0-9]+/).filter(Boolean);
  if (words.some((w) => INTERNAL_WORDS.has(w))) return true;
  // The founder's own test checkouts: first name + surname together.
  return words.includes("nidia") && words.includes("almeida");
}

/** Link back to the site so availability and lead-time gates are rechecked. */
export function resumePathFor(flow: string | null | undefined, tourId: string | null | undefined): string {
  if (flow === "studio") return "/studio";
  if (tourId && /^[a-z0-9-]{2,80}$/.test(tourId)) return `/tours/${tourId}`;
  return "/experiences";
}

export function shouldSendUnfinishedReminder(args: {
  customerName: string | null | undefined;
  email: string | null | undefined;
  dateExact: string | null | undefined;
  today: string; // YYYY-MM-DD (Lisbon)
  alreadyPaid: boolean;
}): boolean {
  if (!args.email || !args.email.includes("@")) return false;
  if (args.alreadyPaid) return false;
  if (isInternalTestName(args.customerName)) return false;
  // A day already in the past cannot be resumed.
  if (args.dateExact && args.dateExact < args.today) return false;
  return true;
}
