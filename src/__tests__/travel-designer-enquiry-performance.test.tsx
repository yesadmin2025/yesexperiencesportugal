import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { TourImage } from "@/components/tours/TourImage";
import { JourneyEnquiryForm } from "@/components/travel-designer/JourneyEnquiryForm";
import { getLocalStoryArticle } from "@/content/local-stories-articles";

vi.mock("@/components/ui/CtaButton", () => ({ CtaButton: ({ children, loading: _loading, loadingLabel: _label, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; loadingLabel?: string }) => <button {...props}>{children}</button> }));
vi.mock("@/lib/analytics-ga4", () => ({ gaGenerateLead: vi.fn() }));
vi.mock("@/lib/analytics-events", () => ({ trackEvent: vi.fn() }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Travel Designer enquiry and safe media loading", () => {
  it("persists the multi-day type and page attribution, blocking duplicate submits", async () => {
    let finish: ((value: { ok: boolean }) => void) | undefined;
    const fetch = vi.fn((_url: string, _init: RequestInit) => new Promise<{ ok: boolean }>((resolve) => { finish = resolve; }));
    vi.stubGlobal("fetch", fetch);
    render(<JourneyEnquiryForm />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "QA Journey" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "journey@example.com" } });
    const form = screen.getByRole("form");
    fireEvent.submit(form); fireEvent.submit(form);
    expect(fetch).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body ?? "{}"));
    expect(payload).toMatchObject({ first: "QA", last: "Journey", requestType: "multi_day", source: "travel-designer-page" });
    finish?.({ ok: true });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("has reached our team"));
  });

  it("shows delivery errors rather than claiming a successful enquiry", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<JourneyEnquiryForm />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "QA" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "qa@example.com" } });
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("couldn't confirm delivery"));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("does not force a below-fold lazy photo to fetch through decode()", () => {
    const decode = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: decode });
    const { rerender } = render(<TourImage src="/photo.jpg" alt="Verified tour" />);
    expect(decode).not.toHaveBeenCalled();
    expect(screen.getByRole("img")).toHaveAttribute("loading", "lazy");
    rerender(<TourImage src="/hero.jpg" alt="Verified tour" priority />);
    expect(decode).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("img")).toHaveAttribute("fetchpriority", "high");
  });

  it("publishes a factual selection guide with a unique title and service link", () => {
    const article = getLocalStoryArticle("best-travel-designer-in-portugal");
    expect(article?.h1).toBe("Best travel designer in Portugal: how to choose");
    expect(article?.title.length).toBeLessThan(65);
    expect(article?.sections.length).toBeGreaterThan(3);
    expect(article?.sections.map((s) => s.body).join(" ")).toContain("](/portugal-travel-designer)");
    expect(article?.directAnswer).toContain("no single best");
  });

  it("counts journey enquiries separately without adding them twice", () => {
    const source = readFileSync("src/lib/conversions.functions.ts", "utf8");
    expect(source).toContain('query.eq("request_type", "multi_day")');
    expect(source).toContain('request_type.neq.multi_day,request_type.is.null');
    expect(source).toContain('"Travel Designer enquiries"');
  });
});