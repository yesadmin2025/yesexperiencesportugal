import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProposalRequestForm } from "./ProposalRequestForm";

vi.mock("@/lib/analytics-events", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/analytics-ga4", () => ({ gaGenerateLead: vi.fn() }));
vi.mock("@/components/ui/CtaButton", () => ({
  CtaButton: ({ children, loading: _loading, loadingLabel: _label, icon: _icon, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; loadingLabel?: string; icon?: unknown }) => <button {...props}>{children}</button>,
}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function completeForm() {
  fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "QA Guest" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "qa@example.com" } });
  fireEvent.change(screen.getByLabelText("What do you have in mind?"), { target: { value: "QA validation request only" } });
  return screen.getByRole("button", { name: "Send my request" }).closest("form");
}

describe("Private moment enquiry delivery", () => {
  it("prevents duplicate requests while delivery is in flight", async () => {
    let finish: ((value: Response) => void) | undefined;
    const fetch = vi.fn((_url: string, _init: RequestInit) => new Promise<Response>((resolve) => { finish = resolve; }));
    vi.stubGlobal("fetch", fetch);
    render(<ProposalRequestForm />);
    const form = completeForm();
    if (!form) throw new Error("Expected enquiry form");
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body ?? "{}"))).toMatchObject({ occasion: "proposal", groupSize: 2 });
    finish?.(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await waitFor(() => expect(screen.getByRole("status")).toBeVisible());
  });

  it("keeps guest input and permits retry after failed delivery", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ ok: false }), { status: 500 })).mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    render(<ProposalRequestForm />);
    const form = completeForm();
    if (!form) throw new Error("Expected enquiry form");
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole("alert")).toBeVisible());
    expect(screen.getByLabelText("Your name")).toHaveValue("QA Guest");
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole("status")).toBeVisible());
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});