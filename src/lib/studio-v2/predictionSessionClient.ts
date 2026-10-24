import { issuePredictionSession } from "./predictions.functions";

const KEY = "yes_pred_session_v1";
let pending: Promise<string | null> | null = null;

/** Browser-only: returns this visitor's server-signed prediction session id. */
export function getPredictionSessionId(): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  try {
    const cached = window.localStorage.getItem(KEY);
    if (cached) return Promise.resolve(cached);
  } catch {
    /* storage blocked */
  }
  if (!pending) {
    pending = issuePredictionSession()
      .then(({ sessionId }) => {
        try {
          window.localStorage.setItem(KEY, sessionId);
        } catch {
          /* ignore */
        }
        return sessionId;
      })
      .catch(() => {
        pending = null;
        return null;
      });
  }
  return pending;
}

export function clearPredictionSessionId() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
