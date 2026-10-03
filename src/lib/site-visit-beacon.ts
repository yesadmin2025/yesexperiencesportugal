// Anonymous page-view beacon for the live site only (no cookies, no PII).
const LIVE_HOSTS = ["yesexperiencesportugal.com", "www.yesexperiencesportugal.com"];
const KEY = "yes_vid";

function visitorId(): string | null {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    if (localStorage.getItem("yes_admin") === "1") return null;
    return id;
  } catch {
    return null;
  }
}

let lastPath = "";

export function trackVisit(path: string, event: "view" | "booking_start" = "view") {
  if (typeof window === "undefined") return;
  if (!LIVE_HOSTS.includes(window.location.hostname)) return;
  if (event === "view") {
    if (path === lastPath) return;
    lastPath = path;
  }
  if (path.startsWith("/admin") || path.startsWith("/guide")) {
    try {
      localStorage.setItem("yes_admin", "1");
    } catch {
      /* ignore */
    }
    return;
  }
  const id = visitorId();
  if (!id) return;
  const body = JSON.stringify({
    visitorId: id,
    path,
    referrer: document.referrer && !document.referrer.includes(window.location.hostname)
      ? document.referrer
      : null,
    event,
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
