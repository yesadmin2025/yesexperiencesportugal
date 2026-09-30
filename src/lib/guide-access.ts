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

/** Assignments are final once the office assigns them: always "Scheduled". */
export function assignmentResponseLabel(_a?: { status?: string }) {
  return "Scheduled";
}

/** Needs-attention reasons for guide assignment (no guide confirmation step). */
export function guideAssignmentAttention(
  b: { guide_id: string | null; legacy_guide_id?: string | null },
  guide?: { active?: boolean | null; email?: string | null } | null,
): string[] {
  if (!b.guide_id) return [b.legacy_guide_id ? "Assignment conflict — reassign" : "No guide"];
  const out: string[] = [];
  if (guide && guide.active === false) out.push("Guide inactive");
  if (guide && !guide.email?.trim()) out.push("Guide has no email — cannot be notified");
  return out;
}
