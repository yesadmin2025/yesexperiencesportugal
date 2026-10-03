// Anonymous page-view / CTA beacon for the live site only (no cookies, no PII).
const LIVE_HOSTS = ["yesexperiencesportugal.com", "www.yesexperiencesportugal.com"];
const KEY = "yes_vid";

type VisitEvent = "view" | "booking_start" | "landing" | "cta_click";
type Cta = "tailor" | "studio" | "signature";

function isLive() {
  return typeof window !== "undefined" && LIVE_HOSTS.includes(window.location.hostname);
}

function visitorId(): string | null {
  try {
    if (localStorage.getItem("yes_admin") === "1") return null;
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

function send(path: string, event: VisitEvent, cta?: Cta) {
  const id = visitorId();
  if (!id) return;
  const body = JSON.stringify({
    visitorId: id,
    path,
    referrer:
      document.referrer && !document.referrer.includes(window.location.hostname)
        ? document.referrer
        : null,
    event,
    cta,
  });
  try {
    void fetch("/api/public/visit", {
      method: "POST",
      body,
      keepalive: true,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    /* ignore */
  }
}

let lastPath = "";

export function trackVisit(path: string, event: "view" | "booking_start" = "view") {
  if (!isLive()) return;
  if (path.startsWith("/admin") || path.startsWith("/guide")) {
    try {
      localStorage.setItem("yes_admin", "1");
    } catch {
      /* ignore */
    }
    return;
  }
  if (event === "view") {
    if (path === lastPath) return;
    lastPath = path;
    try {
      if (!sessionStorage.getItem("yes_landed")) {
        sessionStorage.setItem("yes_landed", "1");
        send(path, "landing");
      }
    } catch {
      /* ignore */
    }
  }
  send(path, event);
}

/** Classifies a clicked link/button into one of the three primary CTAs. */
export function classifyCta(text: string, href: string): Cta | null {
  const t = text.toLowerCase();
  const h = href.toLowerCase();
  if (t.includes("tailor this day") || t.includes("refine this day") || h.includes("tailor")) return "tailor";
  if (t.includes("design your day") || t.includes("love this day") || h.startsWith("/studio")) return "studio";
  if (
    t.includes("reserve this day") ||
    t.includes("explore signature") ||
    t.includes("see dates") ||
    /^\/experiences\/[^/]+/.test(h)
  )
    return "signature";
  return null;
}

let installed = false;
export function installCtaTracking() {
  if (installed || !isLive()) return;
  installed = true;
  document.addEventListener(
    "click",
    (e) => {
      const el = (e.target as HTMLElement | null)?.closest("a,button");
      if (!el) return;
      const href = el.getAttribute("href") ?? "";
      const cta = classifyCta(el.textContent ?? "", href.replace(/^https?:\/\/[^/]+/, ""));
      if (cta) send(window.location.pathname, "cta_click", cta);
    },
    { capture: true, passive: true },
  );
}
