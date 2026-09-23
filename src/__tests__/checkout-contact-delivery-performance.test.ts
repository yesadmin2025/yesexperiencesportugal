import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("checkout loading and contact delivery", () => {
  it("loads Tailored and Studio payment code only at their active gates", () => {
    const tailor = read("src/routes/tours_.$tourId.tailor.tsx");
    const studio = read("src/components/studio-v3/StudioV3.tsx");
    expect(tailor).toContain('const FinalDetailsDialog = lazy(');
    expect(tailor).toContain('const BrandedCheckoutDrawer = lazy(');
    expect(tailor).toContain("{detailsOpen ? <Suspense");
    expect(tailor).toContain("{checkoutOpen ? <Suspense");
    expect(studio).toContain('const CheckoutSummaryStep = lazy(');
    expect(studio).not.toContain('from "@/components/checkout/BrandedCheckoutDrawer"');
  });

  it("keeps every mobile payment gate viewport-safe and keyboard-scrollable", () => {
    const drawer = read("src/components/checkout/BrandedCheckoutDrawer.tsx");
    const details = read("src/components/checkout/FinalDetailsDialog.tsx");
    expect(drawer).toContain("h-[100dvh]");
    expect(drawer).toContain("min-h-0 overflow-y-auto overscroll-contain");
    expect(details).toContain("h-[100dvh] max-h-[100dvh]");
    expect(details).toContain("env(safe-area-inset-bottom)");
  });

  it("only reports contact success after a YES inbox accepts delivery", () => {
    const endpoint = read("src/routes/api/public/contact.ts");
    const sender = read("src/lib/email/send-internal.server.ts");
    expect(endpoint).toContain("teamResults.some((result) => result.ok)");
    expect(endpoint).toContain('error: "team_delivery_failed"');
    expect(sender).toContain("must never replace durable delivery");
  });
});