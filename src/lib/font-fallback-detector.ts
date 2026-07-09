/**
 * Runtime font-family fallback detector.
 *
 * Two-family type system on this site: Fraunces (all headings + italic
 * emphasis) and Inter (body/UI). Any other rendered family — including the
 * generic `serif` / `sans-serif` from a stack whose primary family failed to
 * load — is a bug that this module surfaces to the console (and optionally
 * to the server) as `[font-fallback]` warnings.
 *
 * Observational only: does not patch styles or block layout.
 *
 * Activation:
 *   - Always active in dev (`import.meta.env.DEV`).
 *   - In production, active only when `?fontDebug=1` is in the URL or
 *     `localStorage.YES_FONT_DEBUG === "1"` — avoids console noise for guests.
 *
 * When `?fontDebug=1` is present, the first offender batch per route is also
 * POSTed to `/api/public/font-fallback-report` so it lands in worker logs.
 */

const REQUIRED_FAMILIES = ["Fraunces", "Inter"] as const;
const LOG_PREFIX = "[font-fallback]";
const REPORT_ENDPOINT = "/api/public/font-fallback-report";

type Offender = {
  selector: string;
  requested: string;
  rendered: string;
  sample: string;
};

let installed = false;

function stripQuotes(s: string) {
  return s.trim().replace(/^["']|["']$/g, "");
}

function splitStack(stack: string): string[] {
  return stack
    .split(",")
    .map((s) => stripQuotes(s))
    .filter(Boolean);
}

function isGeneric(family: string) {
  return /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|-apple-system|BlinkMacSystemFont)$/i.test(
    family,
  );
}

function shortSelector(el: Element): string {
  const parts: string[] = [];
  let cur: Element | null = el;
  let depth = 0;
  while (cur && depth < 3) {
    let seg = cur.tagName.toLowerCase();
    if (cur.id) {
      seg += `#${cur.id}`;
      parts.unshift(seg);
      break;
    }
    if (cur instanceof HTMLElement && cur.className && typeof cur.className === "string") {
      const first = cur.className.trim().split(/\s+/)[0];
      if (first) seg += `.${first}`;
    }
    parts.unshift(seg);
    cur = cur.parentElement;
    depth += 1;
  }
  return parts.join(" > ");
}

function textSample(el: Element): string {
  const t = (el.textContent ?? "").trim().replace(/\s+/g, " ");
  return t.length > 40 ? t.slice(0, 40) + "…" : t;
}

function auditElement(el: Element, seen: Set<string>, offenders: Offender[]) {
  if (!(el instanceof HTMLElement)) return;
  const text = (el.textContent ?? "").trim();
  if (!text) return;
  // Only care about leaf-ish nodes so we do not double-flag ancestors.
  const hasElementChild = Array.from(el.childNodes).some(
    (n) => n.nodeType === Node.ELEMENT_NODE && (n as Element).textContent?.trim(),
  );
  if (hasElementChild) return;

  const stack = getComputedStyle(el).fontFamily;
  if (!stack) return;
  const families = splitStack(stack);
  if (families.length === 0) return;
  const requested = families[0];

  // Skip if the requested family is one of our two — but still check it loaded.
  const isOurs = REQUIRED_FAMILIES.some((f) => f.toLowerCase() === requested.toLowerCase());
  const canRender =
    isGeneric(requested) || (document.fonts && document.fonts.check(`12px "${requested}"`));

  if (isOurs && canRender) return;

  // Determine what actually rendered — the first family in the stack that is
  // either generic or reports as loaded.
  const rendered =
    families.find(
      (f) => isGeneric(f) || (document.fonts && document.fonts.check(`12px "${f}"`)),
    ) ?? families[families.length - 1];

  if (rendered.toLowerCase() === requested.toLowerCase() && isOurs) return;

  const selector = shortSelector(el);
  const key = `${selector}|${requested}`;
  if (seen.has(key)) return;
  seen.add(key);
  offenders.push({ selector, requested, rendered, sample: textSample(el) });
}

function scan(root: ParentNode, seen: Set<string>): Offender[] {
  const offenders: Offender[] = [];
  const walker = document.createTreeWalker(root as Node, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) =>
      (node as Element).textContent && (node as Element).textContent!.trim()
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP,
  });
  let cur: Node | null = walker.currentNode;
  // Include the root itself.
  if (root instanceof Element) auditElement(root, seen, offenders);
  while ((cur = walker.nextNode())) {
    auditElement(cur as Element, seen, offenders);
  }
  return offenders;
}

function isEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (import.meta.env?.DEV) return true;
  } catch {
    /* noop */
  }
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("fontDebug") === "1") return true;
    if (window.localStorage?.getItem("YES_FONT_DEBUG") === "1") return true;
  } catch {
    /* noop */
  }
  return false;
}

async function report(route: string, offenders: Offender[]) {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("fontDebug") !== "1") return;
    await fetch(REPORT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ route, offenders: offenders.slice(0, 20) }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* noop */
  }
}

export function installFontFallbackDetector(): (() => void) | undefined {
  if (typeof window === "undefined" || installed) return;
  if (!isEnabled()) return;
  installed = true;

  const seen = new Set<string>();
  let observer: MutationObserver | undefined;
  let scheduled = false;

  const runScan = (root: ParentNode) => {
    const found = scan(root, seen);
    if (found.length === 0) return;
    for (const o of found) {
      // eslint-disable-next-line no-console
      console.warn(
        `${LOG_PREFIX} ${o.selector} requested "${o.requested}" → rendered "${o.rendered}"; text="${o.sample}"`,
      );
    }
    void report(window.location.pathname, found);
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(() => {
      scheduled = false;
      runScan(document.body);
    }, 250);
  };

  const start = async () => {
    try {
      if (document.fonts) await document.fonts.ready;
    } catch {
      /* noop */
    }
    // Verify required families all loaded.
    const loaded = new Set<string>();
    if (document.fonts) {
      document.fonts.forEach((f) => {
        if (f.status === "loaded") loaded.add(stripQuotes(f.family).toLowerCase());
      });
    }
    for (const req of REQUIRED_FAMILIES) {
      if (!loaded.has(req.toLowerCase())) {
        // eslint-disable-next-line no-console
        console.warn(`${LOG_PREFIX} required family "${req}" did not load`);
      }
    }
    runScan(document.body);
    observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });
  };

  void start();

  const dispose = () => {
    observer?.disconnect();
    installed = false;
  };
  window.addEventListener("beforeunload", dispose, { once: true });
  return dispose;
}
