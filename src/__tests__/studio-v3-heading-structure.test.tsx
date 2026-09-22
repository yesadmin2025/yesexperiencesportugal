/**
 * Studio V3 heading structure lock
 * ─────────────────────────────────────────────────────────────────
 * The /studio-v3 route must emit exactly one <h1> during SSR and
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
  StudioV3: () => <h1 data-testid="studio-real-h1">Design your private Portugal day.</h1>,
}));

import { LivingAtlasStudioPage } from "@/components/studio-v3/LivingAtlasStudioPage";

describe("/studio-v3 heading structure", () => {
  function countH1(markup: string): number {
    const matches = markup.match(/<h1[\s\S]*?<\/h1>/gi);
    return matches ? matches.length : 0;
  }

  it("renders exactly one <h1> during SSR", () => {
    const markup = renderToStaticMarkup(<LivingAtlasStudioPage />);
    expect(countH1(markup)).toBe(1);
    expect(markup).toContain('data-testid="studio-real-h1"');
  });

  it("keeps the SSR intent block but removes its H1 semantics", () => {
    const markup = renderToStaticMarkup(<LivingAtlasStudioPage />);
    expect(markup).toContain('data-testid="studio-v3-ssr-intent"');
    // The SSR intent must no longer contain an <h1> tag.
    const intentMatch = markup.match(/<header[^>]*data-testid="studio-v3-ssr-intent"[\s\S]*?<\/header>/i);
    expect(intentMatch).toBeTruthy();
    expect(intentMatch![0]).not.toMatch(/<h1[\s>]/i);
  });

  it("preserves the canonical lead text in the SSR intent", () => {
    const markup = renderToStaticMarkup(<LivingAtlasStudioPage />);
    expect(markup).toContain("Design your private Portugal day.");
  });
});
