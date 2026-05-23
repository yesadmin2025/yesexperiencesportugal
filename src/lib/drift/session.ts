/**
 * Drift session id — persisted per browser tab so all telemetry events
 * (scenes, signals, conversion) share a single thread without ever
 * touching auth or PII.
 */

const KEY = "yes.drift.session";

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export function getDriftSessionId(): string {
  if (typeof window === "undefined") return "ssr-placeholder-id";
  try {
    let id = window.sessionStorage.getItem(KEY);
    if (!id || id.length < 8) {
      id = makeId();
      window.sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return makeId();
  }
}
