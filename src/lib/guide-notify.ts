/**
 * Guide assignment notifications — operational facts only.
 * Never includes price, payment, Stripe, voucher or margin data.
 */
export type GuideNotifyKind = "assignment_new" | "assignment_updated" | "assignment_removed";
export const GUIDE_NOTIFY_KINDS: GuideNotifyKind[] = ["assignment_new", "assignment_updated", "assignment_removed"];

export type GuideNotifyFacts = {
  assignmentId: string | null;
  preferredDate: string | null;
  startTime: string | null;
  tourTitle: string | null;
  guestName: string | null;
  guests: number | null;
  pickup: string | null;
};

const HEADLINE: Record<GuideNotifyKind, string> = {
  assignment_new: "New tour assigned",
  assignment_updated: "Assignment updated",
  assignment_removed: "Tour removed from your schedule",
};

export const guideTourLink = (assignmentId: string | null) =>
  assignmentId ? `https://yesexperiencesportugal.com/guide/tours/${assignmentId}` : "https://yesexperiencesportugal.com/guide";

export function guideNotifyMessage(kind: GuideNotifyKind, f: GuideNotifyFacts) {
  const date = f.preferredDate
    ? new Date(`${f.preferredDate}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    : "Date not added yet";
  const tour = f.tourTitle?.trim() || "Tour name not added yet";
  const lines = [
    HEADLINE[kind],
    "",
    `Date: ${date}`,
    `Pickup time: ${f.startTime?.slice(0, 5) || "Time not added yet"}`,
    `Tour: ${tour}`,
    `Guest: ${f.guestName?.trim() || "Guest name not added yet"}`,
    `Guests: ${f.guests && f.guests > 0 ? f.guests : "Not added yet"}`,
    `Pickup: ${f.pickup?.trim() || "Pickup not added yet"}`,
  ];
  if (kind !== "assignment_removed") lines.push("", `Open in the Guide App: ${guideTourLink(f.assignmentId)}`);
  else lines.push("", "This tour is no longer on your schedule. No action needed.");
  return { subject: `${HEADLINE[kind]} · ${tour} · ${date}`, text: lines.join("\n") };
}
