/**
 * Studio V3 heading structure lock
 * ─────────────────────────────────────────────────────────────────
 * The /studio route must emit exactly one <h1> during SSR and
 * after hydration. A previous implementation rendered an SSR-only
 * <header className="sr-only"> containing a second <h1>, which audit
 * tools reported as a multiple-H1 defect on the canonical URL and on
 * query variants. This test locks the fix.
 */

import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/analytics-events", () => ({
  trackEvent: () => {},
}));

vi.mock("@/lib/studio-v3-funnel", () => ({
  getFunnelVariant: () => "control",
}));

vi.mock("@/components/studio-v3/studioSessionPrivacy", () => ({
  installStudioSessionPrivacyGuard: () => {},
  consumeDurableStudioDraftRestore: () => false,
  clearStudioDraftPersistence: () => {},
}));

vi.mock("sonner", () => ({
  toast: () => {},
}));

vi.mock("@/components/studio-v3/StudioV3", () => ({
  StudioV3: () => <div data-testid="studio-real-shell" />,
}));

import { LivingAtlasStudioPage } from "@/components/studio-v3/LivingAtlasStudioPage";

describe("/studio heading structure", () => {
  function countH1(markup: string): number {
    const matches = markup.match(/<h1[\s\S]*?<\/h1>/gi);
    return matches ? matches.length : 0;
  }

  it("renders exactly one <h1> during SSR", () => {
    const markup = renderToStaticMarkup(<LivingAtlasStudioPage />);
    expect(countH1(markup)).toBe(1);
    const intentMatch = markup.match(/<header[^>]*data-testid="studio-v3-ssr-intent"[\s\S]*?<\/header>/i);
    expect(intentMatch![0]).toMatch(/<h1[\s>]/i);
  });

  it("preserves the canonical lead text in the SSR intent", () => {
    const markup = renderToStaticMarkup(<LivingAtlasStudioPage />);
    expect(markup).toContain("Design your private Portugal day.");
  });
});
