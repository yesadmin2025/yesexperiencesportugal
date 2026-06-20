/**
 * Regression guard: navigation clicks and deep-links inside an iframe
 * must NEVER scroll straight to the footer.
 *
 * Two layers of protection are validated here:
 *
 *  1. The iframe-aware `performJump` helper (used by /preview-check) must
 *     either land on a real target element or fall back to a clean reload.
 *     It must never call `scrollTo(0, doc.scrollHeight)` or
 *     `scrollIntoView` on the footer / last child of body.
 *
 *  2. The homepage `scrollToHash` implementation (in src/routes/index.tsx)
 *     must scroll to a resolved element via `el.scrollIntoView({ block:
 *     "start" })`, never to a hard-coded bottom offset, and must guard
 *     against missing targets with a polling tick (so an unknown hash
 *     simply gives up instead of falling through to the bottom of the
 *     document).
 *
 * If either invariant breaks, this test fails before shipping.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { performJump, type CheckItem } from "../lib/preview-check-jump";

// ─── helpers ────────────────────────────────────────────────────────────
function makeIframe(html: string): {
  iframe: HTMLIFrameElement;
  scrollIntoView: ReturnType<typeof vi.fn>;
  winScrollTo: ReturnType<typeof vi.fn>;
} {
  const iframe = document.createElement("iframe");
  document.body.appendChild(iframe);

  const innerDoc = iframe.contentDocument!;
  innerDoc.open();
  innerDoc.write(`<!doctype html><html><body>${html}</body></html>`);
  innerDoc.close();
  Object.defineProperty(innerDoc, "readyState", {
    value: "complete",
    configurable: true,
  });

  const scrollIntoView = vi.fn();
  const winScrollTo = vi.fn();

  // Patch every element so we can spy on what receives scrollIntoView.
  innerDoc.querySelectorAll("*").forEach((node) => {
    (node as HTMLElement).scrollIntoView =
      scrollIntoView as unknown as HTMLElement["scrollIntoView"];
  });
  // jsdom doesn't implement window.scrollTo — stub it.
  (iframe.contentWindow as unknown as { scrollTo: typeof winScrollTo }).scrollTo = winScrollTo;

  return { iframe, scrollIntoView, winScrollTo };
}

// ─── 1. performJump never lands on the footer ──────────────────────────
describe("performJump — iframe deep-link safety", () => {
  let originalSrc: string | null;

  beforeEach(() => {
    originalSrc = null;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("scrolls to the resolved section element, not the footer", () => {
    const { iframe, scrollIntoView, winScrollTo } = makeIframe(`
      <header><h1>Title</h1></header>
      <main>
        <section id="signatures">Sigs</section>
        <section id="studio">Studio</section>
      </main>
      <footer id="site-footer">Footer here</footer>
    `);

    const item: CheckItem = {
      id: "sigs",
      label: "",
      description: "",
      src: "/",
      hash: "#signatures-title", // resolves via alias to #signatures
    };

    const result = performJump(iframe, item);
    expect(result).toBe("scrolled-element");
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    // It must not have scrolled the window to the bottom.
    expect(winScrollTo).not.toHaveBeenCalled();
    // And the footer must NOT be the receiver of scrollIntoView.
    const receiver = scrollIntoView.mock.instances[0] as Element;
    expect(receiver.id).not.toBe("site-footer");
    expect((receiver as HTMLElement).tagName.toLowerCase()).not.toBe("footer");
  });

  it("falls back to a clean reload (not a footer scroll) when no target exists", () => {
    const { iframe, scrollIntoView, winScrollTo } = makeIframe(`
      <main><section id="why-yes">Why</section></main>
      <footer id="site-footer">Footer here</footer>
    `);

    const item: CheckItem = {
      id: "ghost",
      label: "",
      description: "",
      src: "/",
      hash: "#section-that-does-not-exist",
    };

    const result = performJump(iframe, item);
    expect(result).toBe("reloaded");
    // Critically: no scroll-to-footer, no window.scrollTo.
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(winScrollTo).not.toHaveBeenCalled();
    // The reload URL targets the requested hash, not the footer.
    expect(iframe.src).toContain("#section-that-does-not-exist");
    expect(iframe.src).not.toContain("#site-footer");
  });

  it("scrolls the window to top (not to footer) for #top", () => {
    const { iframe, scrollIntoView, winScrollTo } = makeIframe(`
      <main><h1 id="hero-title">Hello</h1></main>
      <footer id="site-footer">Footer</footer>
    `);

    const item: CheckItem = {
      id: "hero",
      label: "",
      description: "",
      src: "/",
      hash: "#top",
    };

    const result = performJump(iframe, item);
    // #top resolves to <h1> via alias, which is scroll-into-view'd.
    expect(["scrolled-element", "scrolled-window"]).toContain(result);
    if (result === "scrolled-window") {
      expect(winScrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    } else {
      const receiver = scrollIntoView.mock.instances[0] as Element;
      expect(receiver.id).not.toBe("site-footer");
    }
  });
});

// ─── 2. Static guard on the homepage scrollToHash implementation ──────
describe("Homepage scrollToHash — static contract", () => {
  it("scrolls into view via the resolved element, never to a bottom offset", () => {
    const src = readFileSync(resolve(__dirname, "../routes/index.tsx"), "utf8");

    // Locate the scrollToHash function body.
    const fnStart = src.indexOf("const scrollToHash");
    expect(fnStart, "scrollToHash function missing in routes/index.tsx").toBeGreaterThan(0);
    const fnSlice = src.slice(fnStart, fnStart + 12000);

    // It must scroll using the resolved element's geometry — either
    // `el.scrollIntoView({ block: "start" })` (legacy) or
    // `window.scrollTo({ top: <derived from el.getBoundingClientRect> })`
    // (current). Both are valid; what matters is that the scroll target
    // is derived from the resolved element, never from document height.
    expect(fnSlice).toMatch(
      /el\.scrollIntoView\(\s*\{[^}]*block:\s*["']start["']|el\.getBoundingClientRect\(\)[\s\S]{0,200}window\.scrollTo/,
    );

    // It must NOT call window.scrollTo with scrollHeight (that's the
    // exact pattern that produces a "jump to footer" regression).
    expect(fnSlice).not.toMatch(/scrollTo\s*\(\s*0\s*,\s*[^)]*scrollHeight/);
    expect(fnSlice).not.toMatch(/scrollTo\s*\(\s*\{[^}]*top:\s*[^}]*scrollHeight/);

    // It must guard against a missing target by polling, not by
    // scrolling somewhere as a fallback.
    expect(fnSlice).toMatch(/tries/);
    expect(fnSlice).toMatch(/setTimeout\(\s*tick/);
  });

  it("only scrolls inside the page when a tracked id is resolved", () => {
    const src = readFileSync(resolve(__dirname, "../routes/index.tsx"), "utf8");
    // Tracked ids include studio + final-cta. Footer is NOT tracked.
    expect(src).toMatch(/TRACKED_IDS\s*=\s*\[[^\]]*"studio"[^\]]*\]/s);
    expect(src).not.toMatch(/TRACKED_IDS\s*=\s*\[[^\]]*"footer"[^\]]*\]/s);
    expect(src).not.toMatch(/TRACKED_IDS\s*=\s*\[[^\]]*"site-footer"[^\]]*\]/s);
  });
});
