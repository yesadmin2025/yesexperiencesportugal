/**
 * Guide App access state — one mapping shared by the Guides list and guide
 * profile so Admin always describes access the same way.
 */
export type GuideAccessInput = {
  email: string | null;
  active: boolean;
  app_linked: boolean;
  approval_status?: string | null;
  app_invited_at?: string | null;
};

export type GuideAccessState = "linked" | "pending_approval" | "inactive" | "needs_email" | "invited" | "not_invited";

export function guideAccessState(g: GuideAccessInput): GuideAccessState {
  if (g.app_linked && g.active) return "linked";
  if (g.approval_status === "pending") return "pending_approval";
  if (!g.active) return "inactive";
  if (!g.email?.trim()) return "needs_email";
  return g.app_invited_at ? "invited" : "not_invited";
}

export const GUIDE_ACCESS_LABEL: Record<GuideAccessState, string> = {
  linked: "Account linked · Active",
  pending_approval: "Pending approval",
  inactive: "Inactive — no app access",
  needs_email: "Add email before inviting",
  invited: "Invite sent · Not signed in yet",
  not_invited: "Not invited · Invite available",
};

export function canInvite(state: GuideAccessState) {
  return state === "not_invited" || state === "invited" || state === "linked";
}

export function inviteButtonLabel(state: GuideAccessState) {
  return state === "not_invited" ? "Send app invite" : "Resend app invite";
}

/** Admin label for a guide's response to one assignment (from tour_assignments). */
export function assignmentResponseLabel(a: { status: string; guide_confirmed_at?: string | null }) {
  if (a.status === "declined") return "Declined by guide";
  if (a.status === "changed") return "Changed — awaiting reconfirmation";
  if (a.status === "confirmed" || a.guide_confirmed_at) return "Confirmed by guide";
  return "Awaiting guide confirmation";
}
