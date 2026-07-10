import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ApprovalBadge } from "../ApprovalBadge";
import { APPROVAL_LABELS } from "@/content/signature-day-copy";

describe("ApprovalBadge (plan §H state machine)", () => {
  it("renders YES Approved trust mark only when state === 'approved'", () => {
    render(<ApprovalBadge state="approved" />);
    const badge = screen.getByTestId("studio-v3-approval-badge");
    expect(badge.getAttribute("data-approval-state")).toBe("approved");
    expect(badge.textContent).toContain(APPROVAL_LABELS.approved);
    // Gold check icon present.
    expect(badge.querySelector("svg")).toBeTruthy();
  });

  it("renders teal dot + 'Route being reviewed' for review (no YES Approved copy)", () => {
    render(<ApprovalBadge state="review" />);
    const badge = screen.getByTestId("studio-v3-approval-badge");
    expect(badge.getAttribute("data-approval-state")).toBe("review");
    expect(badge.textContent).toBe(APPROVAL_LABELS.review);
    expect(badge.textContent).not.toContain("YES Approved");
    expect(badge.querySelector("svg")).toBeNull();
  });

  it("renders muted italic 'Preliminary itinerary' for reject", () => {
    render(<ApprovalBadge state="reject" />);
    const badge = screen.getByTestId("studio-v3-approval-badge");
    expect(badge.getAttribute("data-approval-state")).toBe("reject");
    expect(badge.textContent).toBe(APPROVAL_LABELS.reject);
    expect(badge.textContent).not.toContain("YES Approved");
    expect(badge.tagName).toBe("P");
  });

  it("renders muted italic 'Preliminary itinerary' for incomplete", () => {
    render(<ApprovalBadge state="incomplete" />);
    const badge = screen.getByTestId("studio-v3-approval-badge");
    expect(badge.getAttribute("data-approval-state")).toBe("incomplete");
    expect(badge.textContent).toBe(APPROVAL_LABELS.incomplete);
    expect(badge.textContent).not.toContain("YES Approved");
  });

  it("never contains the string 'Everything included' in any state", () => {
    for (const state of ["approved", "review", "reject", "incomplete"] as const) {
      const { unmount } = render(<ApprovalBadge state={state} />);
      expect(screen.getByTestId("studio-v3-approval-badge").textContent).not.toContain(
        "Everything included",
      );
      unmount();
    }
  });
});
