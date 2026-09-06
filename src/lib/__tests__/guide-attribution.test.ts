/**
 * Guide attribution — crawl-clean internal links, click-time persistence.
 *
 * Guards the model that replaced `?ref=guide:<slug>&ref_slot=<slot>` links:
 *   - internal guide links carry NO ref / ref_slot query string (crawlers
 *     were indexing 79 duplicate URL variants of canonical pages)
 *   - attribution is persisted synchronously at click time, before navigation
 *   - checkout metadata still reads guide_slug + guide_slot, merged with the
 *     untouched first-touch UTM snapshot
 *   - legacy shared / bookmarked `?ref=` URLs still attribute
 *   - the click handler never blocks navigation (no preventDefault)
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { createElement } from "react";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";

const insertMock = vi.fn(() => Promise.resolve({ data: null, error: null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ insert: insertMock }) },
}));
const trackEventMock = vi.fn();
vi.mock("@/lib/analytics-events", () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

import {
  captureGuideRefFromLocation,
  getGuideRef,
  guideAttributionMetadata,
  guideRefSearch,
  recordGuideLinkClick,
} from "@/lib/guide-attribution";
import { GuideNextSteps, useGuideLinkTracker } from "@/components/journal/GuideNextSteps";
import { getLocalStoryArticle } from "@/content/local-stories-articles";

const SRC_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const GUIDE_KEY = "yes.guideref.v1";
const UTM_KEY = "yes.utm.v1";

function clearStores() {
  window.sessionStorage.removeItem(GUIDE_KEY);
  window.localStorage.removeItem(GUIDE_KEY);
  window.sessionStorage.removeItem(UTM_KEY);
  window.localStorage.removeItem(UTM_KEY);
}

beforeEach(() => {
  clearStores();
  insertMock.mockClear();
  trackEventMock.mockClear();
  window.history.replaceState({}, "", "/local-stories/arrabida-wine-tour-from-lisbon");
});

afterEach(() => {
  cleanup();
  clearStores();
});

describe("guideRefSearch compatibility helper", () => {
  it("returns an empty search object so no caller can re-introduce ?ref=", () => {
    expect(guideRefSearch("arrabida-wine-tour-from-lisbon", "article_cta")).toEqual({});
  });
});

describe("click-time attribution", () => {
  it("persists guide_slug + slot in session and local storage, same 30-day shape", () => {
    const before = Date.now();
    recordGuideLinkClick({
      guideSlug: "arrabida-wine-tour-from-lisbon",
      slot: "article_cta",
      kind: "signature",
      destination: "/tours/arrabida-wine-allinclusive",
    });

    for (const store of [window.sessionStorage, window.localStorage]) {
      const raw = store.getItem(GUIDE_KEY);
      expect(raw).toBeTruthy();
      const snap = JSON.parse(raw!) as { guide_slug: string; slot: string; ts: number };
      expect(Object.keys(snap).sort()).toEqual(["guide_slug", "slot", "ts"]);
      expect(snap.guide_slug).toBe("arrabida-wine-tour-from-lisbon");
      expect(snap.slot).toBe("article_cta");
      expect(snap.ts).toBeGreaterThanOrEqual(before);
    }
    expect(getGuideRef()?.guide_slug).toBe("arrabida-wine-tour-from-lisbon");
  });

  it("is fire-and-forget: GA4 event + internal row, never throws", () => {
    expect(() =>
      recordGuideLinkClick({
        guideSlug: "best-wine-tours-from-lisbon",
        slot: "next_studio",
        kind: "studio",
        destination: "/studio-v3",
      }),
    ).not.toThrow();
    expect(trackEventMock).toHaveBeenCalledWith(
      "guide_link_click",
      expect.objectContaining({
        guide_slug: "best-wine-tours-from-lisbon",
        placement: "next_studio",
        destination: "/studio-v3",
        destination_kind: "studio",
      }),
    );
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        guide_slug: "best-wine-tours-from-lisbon",
        slot: "next_studio",
        destination: "/studio-v3",
        destination_kind: "studio",
      }),
    );
  });

  it("still persists attribution when the analytics sinks fail", () => {
    trackEventMock.mockImplementationOnce(() => {
      throw new Error("gtm blocked");
    });
    insertMock.mockImplementationOnce(() => {
      throw new Error("offline");
    });
    expect(() =>
      recordGuideLinkClick({
        guideSlug: "sesimbra-guide",
        slot: "related_read",
        kind: "guide",
        destination: "/local-stories/x",
      }),
    ).not.toThrow();
    expect(getGuideRef()).toMatchObject({ guide_slug: "sesimbra-guide", slot: "related_read" });
  });

  it("the link tracker never touches the event (no preventDefault)", () => {
    const tracker = useGuideLinkTracker("arrabida-wine-tour-from-lisbon");
    const handler = tracker("article_cta", "signature", "/tours/arrabida-wine-allinclusive");
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    (handler as unknown as (e: unknown) => void)({ preventDefault, stopPropagation });
    expect(preventDefault).not.toHaveBeenCalled();
    expect(stopPropagation).not.toHaveBeenCalled();
    expect(getGuideRef()?.slot).toBe("article_cta");
  });
});

describe("checkout metadata", () => {
  it("reads the click-time snapshot and keeps the first-touch UTM untouched", () => {
    const utm = { utm_source: "google", utm_medium: "organic", _ts: Date.now() };
    window.localStorage.setItem(UTM_KEY, JSON.stringify(utm));

    recordGuideLinkClick({
      guideSlug: "arrabida-wine-tour-from-lisbon",
      slot: "next_signature",
      kind: "signature",
      destination: "/tours/arrabida-wine-allinclusive",
    });

    expect(guideAttributionMetadata()).toEqual({
      guide_slug: "arrabida-wine-tour-from-lisbon",
      guide_slot: "next_signature",
      utm_source: "google",
      utm_medium: "organic",
    });
    // The UTM snapshot itself was not rewritten by the guide click.
    expect(JSON.parse(window.localStorage.getItem(UTM_KEY)!)).toEqual(utm);
  });

  it("returns only UTMs when no guide was clicked", () => {
    window.sessionStorage.setItem(UTM_KEY, JSON.stringify({ utm_source: "newsletter", _ts: Date.now() }));
    expect(guideAttributionMetadata()).toEqual({ utm_source: "newsletter" });
  });
});

describe("legacy ?ref= URLs (backwards compatibility)", () => {
  it("still persists attribution from an old shared link", () => {
    window.history.replaceState(
      {},
      "",
      "/tours/arrabida-wine-allinclusive?ref=guide:best-wine-tasting-near-lisbon&ref_slot=article_cta",
    );
    const snap = captureGuideRefFromLocation();
    expect(snap).toMatchObject({ guide_slug: "best-wine-tasting-near-lisbon", slot: "article_cta" });
    expect(getGuideRef()).toMatchObject({ guide_slug: "best-wine-tasting-near-lisbon" });
  });

  it("does not overwrite a click-time snapshot when the URL is clean", () => {
    recordGuideLinkClick({
      guideSlug: "arrabida-wine-tour-from-lisbon",
      slot: "article_cta",
      kind: "signature",
      destination: "/tours/arrabida-wine-allinclusive",
    });
    window.history.replaceState({}, "", "/tours/arrabida-wine-allinclusive");
    expect(captureGuideRefFromLocation()).toMatchObject({
      guide_slug: "arrabida-wine-tour-from-lisbon",
      slot: "article_cta",
    });
  });
});

describe("internal guide links are crawl-clean", () => {
  it("source of the article route and next-steps block carries no ref / ref_slot", () => {
    const files = [
      "routes/local-stories.$slug.tsx",
      "components/journal/GuideNextSteps.tsx",
    ];
    for (const rel of files) {
      const src = readFileSync(join(SRC_ROOT, rel), "utf8");
      expect(src, `${rel} appends ?ref=`).not.toMatch(/\?ref=/);
      expect(src, `${rel} references ref_slot`).not.toMatch(/ref_slot/);
      expect(src, `${rel} still spreads guideRefSearch`).not.toMatch(/guideRefSearch\(/);
      // Tracking stays on every guide link.
      expect(src).toMatch(/useGuideLinkTracker|recordGuideLinkClick/);
    }
  });

  it("renders every 'Where to next' link as a clean canonical href and persists on click", async () => {
    const article = getLocalStoryArticle("arrabida-wine-tour-from-lisbon");
    expect(article).toBeTruthy();

    const rootRoute = createRootRoute({
      component: () => createElement(GuideNextSteps, { article: article! }),
    });
    const router = createRouter({
      routeTree: rootRoute,
      history: createMemoryHistory({
        initialEntries: ["/local-stories/arrabida-wine-tour-from-lisbon"],
      }),
    });
    const { container } = render(createElement(RouterProvider, { router }));

    await waitFor(() => {
      expect(container.querySelectorAll("a[href]").length).toBeGreaterThan(0);
    });

    const anchors = Array.from(container.querySelectorAll<HTMLAnchorElement>("a[href]"));
    expect(anchors.length).toBeGreaterThanOrEqual(3);
    for (const a of anchors) {
      const href = a.getAttribute("href") ?? "";
      expect(href, `dirty href: ${href}`).not.toMatch(/[?&]ref=/);
      expect(href, `dirty href: ${href}`).not.toMatch(/ref_slot/);
      expect(href.includes("?"), `unexpected query string: ${href}`).toBe(false);
    }
    const hrefs = anchors.map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/tours/arrabida-wine-allinclusive");
    expect(hrefs).toContain("/studio-v3");

    // Clicking the Signature link persists attribution before navigation.
    const signature = anchors.find(
      (a) => a.getAttribute("href") === "/tours/arrabida-wine-allinclusive",
    )!;
    signature.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    expect(getGuideRef()).toMatchObject({
      guide_slug: "arrabida-wine-tour-from-lisbon",
      slot: "next_signature",
    });
    expect(guideAttributionMetadata()).toMatchObject({
      guide_slug: "arrabida-wine-tour-from-lisbon",
      guide_slot: "next_signature",
    });
  });
});
