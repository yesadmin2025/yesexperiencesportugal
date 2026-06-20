/**
 * client-error-logger — captures runtime errors in the browser and
 * persists them to `public.client_error_logs` for admin review.
 *
 * Designed to surface mobile-only issues that never reach our desktop
 * sandbox. Safe to install once at the app root; pure no-op on the server.
 */
import { supabase } from "@/integrations/supabase/client";

type Severity = "error" | "warning" | "info" | "unhandled_rejection" | "resource";

interface ReportInput {
  message: string;
  stack?: string | null;
  source?: string | null;
  severity?: Severity;
  metadata?: Record<string, unknown>;
}

const SESSION_KEY = "yes.errlog.session";
const DEDUPE_WINDOW_MS = 5_000;
const MAX_PER_SESSION = 50;

let installed = false;
let sentCount = 0;
const recentSignatures = new Map<string, number>();

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `s_${Date.now().toString(36)}`;
  }
}

function trim(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  return value.length > max ? value.slice(0, max) : value;
}

function shouldDedupe(signature: string): boolean {
  const now = Date.now();
  // prune
  for (const [k, t] of recentSignatures) {
    if (now - t > DEDUPE_WINDOW_MS) recentSignatures.delete(k);
  }
  const last = recentSignatures.get(signature);
  recentSignatures.set(signature, now);
  return last !== undefined && now - last < DEDUPE_WINDOW_MS;
}

export async function reportClientError(input: ReportInput): Promise<void> {
  if (typeof window === "undefined") return;
  if (sentCount >= MAX_PER_SESSION) return;

  const message = trim(input.message, 4000) ?? "Unknown error";
  const signature = `${input.severity ?? "error"}::${message.slice(0, 200)}`;
  if (shouldDedupe(signature)) return;

  sentCount += 1;

  try {
    await supabase.from("client_error_logs").insert({
      message,
      stack: trim(input.stack ?? null, 8000),
      source: trim(input.source ?? null, 500),
      url: trim(window.location.href, 1000),
      user_agent: trim(navigator.userAgent, 500),
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      route: trim(window.location.pathname + window.location.search, 500),
      session_id: getSessionId(),
      severity: input.severity ?? "error",
      metadata: (input.metadata ?? {}) as never,
    });
  } catch {
    /* logging must never throw */
  }
}

export function installClientErrorLogger(): () => void {
  if (typeof window === "undefined" || installed) return () => {};
  installed = true;

  const onError = (event: ErrorEvent) => {
    void reportClientError({
      message: event.message || String(event.error ?? "Error"),
      stack: event.error instanceof Error ? (event.error.stack ?? null) : null,
      source: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : null,
      severity: "error",
    });
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : (() => {
              try {
                return JSON.stringify(reason);
              } catch {
                return "Unhandled promise rejection";
              }
            })();
    void reportClientError({
      message,
      stack: reason instanceof Error ? (reason.stack ?? null) : null,
      severity: "unhandled_rejection",
    });
  };

  const onResourceError = (event: Event) => {
    const target = event.target as
      | (HTMLElement & { src?: string; href?: string; tagName?: string })
      | null;
    if (!target || target === (window as unknown as HTMLElement)) return;
    const tag = target.tagName?.toLowerCase();
    if (!tag || !["img", "script", "link", "video", "source", "audio"].includes(tag)) return;
    const src = target.src || target.href;
    if (!src) return;
    void reportClientError({
      message: `Resource failed to load: <${tag}>`,
      source: src,
      severity: "resource",
      metadata: { tag },
    });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  // capture-phase to catch resource load failures (they don't bubble)
  window.addEventListener("error", onResourceError, true);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    window.removeEventListener("error", onResourceError, true);
    installed = false;
  };
}
