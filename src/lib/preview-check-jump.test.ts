import { describe, it, expect, vi, beforeEach } from "vitest";
import { HASH_ALIASES, resolveTarget, performJump, type CheckItem } from "./preview-check-jump";

function makeDoc(html: string): Document {
  const doc = document.implementation.createHTMLDocument("test");
  doc.body.innerHTML = html;
  // jsdom leaves freshly created documents in 'loading' state; force complete.
  Object.defineProperty(doc, "readyState", { value: "complete", configurable: true });
  return doc;
}

const HERO_ITEM: CheckItem = {
  id: "hero",
  label: "Hero",
  description: "",
  src: "/",
  hash: "#top",
};

const SIG_ITEM: CheckItem = {
  id: "experiences",
  label: "Sigs",
  description: "",
  src: "/",
  hash: "#signatures-title",
};

describe("HASH_ALIASES", () => {
  it("includes #top and section title fallbacks", () => {
    expect(HASH_ALIASES["#top"]).toContain("h1");
    expect(HASH_ALIASES["#top"]).toContain("#hero");
    expect(HASH_ALIASES["#signatures-title"]).toContain("#signatures");
    expect(HASH_ALIASES["#studio-title"]).toContain("#builder");
  });
});

describe("resolveTarget", () => {
  it("matches a literal id when present", () => {
    const doc = makeDoc(`<div id="signatures-title">x</div>`);
    expect(resolveTarget(doc, SIG_ITEM)?.id).toBe("signatures-title");
  });

  it("falls back to #hero alias for #top", () => {
    const doc = makeDoc(`<section id="hero"><h1>Hello</h1></section>`);
    const found = resolveTarget(doc, HERO_ITEM);
    expect(found?.id).toBe("hero");
  });

  it("falls back to <h1> for #top when no aliases match", () => {
    const doc = makeDoc(`<main><h1>Title</h1></main>`);
    const found = resolveTarget(doc, HERO_ITEM);
    expect(found?.tagName).toBe("H1");
  });

  it("returns scrollingElement/body for #top when nothing else matches", () => {
    const doc = makeDoc(`<p>nothing</p>`);
    const found = resolveTarget(doc, HERO_ITEM);
    expect(found).toBe(doc.scrollingElement ?? doc.body);
  });

  it("prefers item-level aliases over global aliases", () => {
    const doc = makeDoc(`<div id="hero"></div><section data-custom>here</section>`);
    const item: CheckItem = { ...HERO_ITEM, aliases: ["[data-custom]"] };
    const found = resolveTarget(doc, item);
    expect(found?.getAttribute("data-custom")).not.toBeNull();
  });

  it("returns null for non-top hash with no matches", () => {
    const doc = makeDoc(`<p>nothing</p>`);
    expect(resolveTarget(doc, SIG_ITEM)).toBeNull();
  });

  it("returns null when item has no hash", () => {
    const doc = makeDoc(`<h1>x</h1>`);
    const item: CheckItem = { ...HERO_ITEM, hash: undefined };
    expect(resolveTarget(doc, item)).toBeNull();
  });
});

describe("performJump", () => {
  let scrollTo: ReturnType<typeof vi.fn>;
  let scrollIntoView: ReturnType<typeof vi.fn>;
  let replaceState: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollTo = vi.fn();
    scrollIntoView = vi.fn();
    replaceState = vi.fn();
  });

  function makeIframe(html: string) {
    const doc = makeDoc(html);
    // Patch scrollIntoView on every element (jsdom doesn't implement it).
    const origQuery = doc.querySelector.bind(doc);
    doc.querySelector = ((sel: string) => {
      const el = origQuery(sel);
      if (el)
        (el as HTMLElement).scrollIntoView =
          scrollIntoView as unknown as HTMLElement["scrollIntoView"];
      return el;
    }) as typeof doc.querySelector;
    const origGetById = doc.getElementById.bind(doc);
    doc.getElementById = ((id: string) => {
      const el = origGetById(id);
      if (el)
        (el as HTMLElement).scrollIntoView =
          scrollIntoView as unknown as HTMLElement["scrollIntoView"];
      return el;
    }) as typeof doc.getElementById;

    const win = {
      scrollTo,
      history: { replaceState },
    } as unknown as Window;

    const el = {
      contentWindow: win,
      contentDocument: doc,
      src: "",
    } as unknown as HTMLIFrameElement;

    return { el, doc };
  }

  it("returns noop when iframe is null", () => {
    expect(performJump(null, HERO_ITEM)).toBe("noop");
  });

  it("returns noop when item has no hash", () => {
    const { el } = makeIframe(`<h1>x</h1>`);
    expect(performJump(el, { ...HERO_ITEM, hash: undefined })).toBe("noop");
  });

  it("scrolls window to top for #top alias hits", () => {
    const { el } = makeIframe(`<main><h1>Title</h1></main>`);
    const result = performJump(el, HERO_ITEM);
    expect(result).toBe("scrolled-window");
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenCalledWith(null, "", "/#top");
  });

  it("scrolls element into view for non-top targets", () => {
    const { el } = makeIframe(`<div id="signatures-title">x</div>`);
    const result = performJump(el, SIG_ITEM);
    expect(result).toBe("scrolled-element");
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(scrollTo).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenCalledWith(null, "", "/#signatures-title");
  });

  it("falls back to a cache-busting reload when contentDocument is unreachable", () => {
    const el = {
      get contentWindow() {
        throw new Error("cross-origin");
      },
      get contentDocument() {
        throw new Error("cross-origin");
      },
      src: "",
    } as unknown as HTMLIFrameElement;
    const result = performJump(el, SIG_ITEM);
    expect(result).toBe("reloaded");
    expect(el.src).toMatch(/^\/#signatures-title\?t=\d+$/);
  });

  it("reloads when target cannot be resolved (non-top hash with no matches)", () => {
    const { el } = makeIframe(`<p>nothing here</p>`);
    const result = performJump(el, SIG_ITEM);
    expect(result).toBe("reloaded");
    expect(el.src).toMatch(/^\/#signatures-title\?t=\d+$/);
  });
});
