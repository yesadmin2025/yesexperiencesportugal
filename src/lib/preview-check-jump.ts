/**
 * Pure helpers for the /preview-check route. Extracted so they can be unit
 * tested without mounting the whole route component.
 */

export type CheckItem = {
  id: string;
  label: string;
  description: string;
  src: string;
  hash?: string;
  aliases?: string[];
};

/** Aliases applied to every item, keyed by hash. Item-level aliases win. */
export const HASH_ALIASES: Record<string, string[]> = {
  "#top": ["#hero", "#main", "main h1", "[data-hero]", "header h1", "h1"],
  "#signatures-title": ["#signatures", "[data-section='signatures']"],
  "#studio-title": ["#studio", "#builder", "[data-section='studio']"],
};

/**
 * Resolve the in-iframe target element for a given check item, walking the
 * literal id, then item-level aliases, then global aliases, then a final
 * "#top" fallback to the document scrolling element.
 */
export function resolveTarget(doc: Document, item: CheckItem): HTMLElement | null {
  if (!item.hash) return null;
  const id = item.hash.replace(/^#/, "");

  const direct = doc.getElementById(id);
  if (direct) return direct as HTMLElement;

  const aliases = [...(item.aliases ?? []), ...(HASH_ALIASES[item.hash] ?? [])];
  for (const sel of aliases) {
    try {
      const found = doc.querySelector<HTMLElement>(sel);
      if (found) return found;
    } catch {
      /* invalid selector — skip */
    }
  }

  if (id === "top") {
    return (doc.scrollingElement ?? doc.body) as HTMLElement | null;
  }
  return null;
}

export type JumpResult = "scrolled-window" | "scrolled-element" | "reloaded" | "noop";

/**
 * Perform the smooth-scroll-or-reload jump for a single iframe. Pure enough
 * to be unit tested with a fake iframe + jsdom document.
 */
export function performJump(el: HTMLIFrameElement | null, item: CheckItem): JumpResult {
  if (!el || !item.hash) return "noop";

  try {
    const win = el.contentWindow;
    const doc = el.contentDocument;
    if (win && doc && doc.readyState !== "loading") {
      const target = resolveTarget(doc, item);
      if (target) {
        const id = item.hash.replace(/^#/, "");
        const isTopLike = id === "top" || target === doc.body || target === doc.scrollingElement;
        if (isTopLike) {
          win.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        try {
          win.history.replaceState(null, "", item.src + item.hash);
        } catch {
          /* hash sync is best-effort */
        }
        return isTopLike ? "scrolled-window" : "scrolled-element";
      }
    }
  } catch {
    /* fall through */
  }

  el.src = item.src + item.hash + "?t=" + Date.now();
  return "reloaded";
}
