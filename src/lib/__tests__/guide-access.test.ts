import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assignmentResponseLabel, canInvite, guideAccessState, GUIDE_ACCESS_LABEL, inviteButtonLabel } from "@/lib/guide-access";
import { GUIDE_APP_URL } from "@/lib/email-templates/guide-app-invite";

const base = { email: "ana@example.com", active: true, app_linked: false, approval_status: "approved", app_invited_at: null };
const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("Guide app access status", () => {
  it("profile with email but no account can be invited", () => {
    const s = guideAccessState(base);
    expect(s).toBe("not_invited");
    expect(canInvite(s)).toBe(true);
    expect(inviteButtonLabel(s)).toBe("Send app invite");
  });
  it("tracks a sent invite and offers resend", () => {
    const s = guideAccessState({ ...base, app_invited_at: "2026-09-30T10:00:00Z" });
    expect(s).toBe("invited");
    expect(inviteButtonLabel(s)).toBe("Resend app invite");
  });
  it("no email -> add email before inviting", () => {
    const s = guideAccessState({ ...base, email: " " });
    expect(GUIDE_ACCESS_LABEL[s]).toBe("Add email before inviting");
    expect(canInvite(s)).toBe(false);
  });
  it("linked account is active", () => {
    expect(guideAccessState({ ...base, app_linked: true })).toBe("linked");
  });
  it("pending approval only when genuinely pending", () => {
    expect(guideAccessState({ ...base, active: false, approval_status: "pending" })).toBe("pending_approval");
    expect(guideAccessState({ ...base, active: false })).toBe("inactive");
  });
  it("assignment responses match guide actions", () => {
    for (const status of ["assigned", "confirmed", "declined", "changed"]) expect(assignmentResponseLabel({ status })).toBe("Scheduled");
  });
  it("invite links directly to the Guide App", () => {
    expect(GUIDE_APP_URL).toBe("https://yesexperiencesportugal.com/guide");
  });
  it("guide sign-in offers password reset and no self-service access request", () => {
    const g = read("src/routes/guide.tsx");
    expect(g).toContain("resetPasswordForEmail");
    expect(g).toContain("/guide-reset-password");
    expect(g).not.toContain("guide_request_access");
    expect(g).toContain("contact the office");
  });
});
