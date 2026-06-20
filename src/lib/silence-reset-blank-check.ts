/**
 * Preview-harness postMessage/console noise filter.
 *
 * The Lovable preview iframe receives `RESET_BLANK_CHECK` postMessage
 * pings from the host frame during startup. Some are logged via console
 * before being posted, which clutters readiness diagnostics. This module
 * silences ONLY that exact signal — every other postMessage and every
 * other console line is left untouched.
 *
 * Idempotent: calling install() twice without disposing is a no-op.
 * Server-safe: returns a no-op disposer when window is undefined.
 *
 * Exported for unit testing — see src/lib/__tests__/silence-reset-blank-check.test.ts.
 */

const FLAG = "__resetBlankCheckSilenced__" as const;

type FlaggedWindow = Window & { [FLAG]?: boolean };

export function isResetBlankMessage(data: unknown): boolean {
  if (typeof data === "string") return data.includes("RESET_BLANK_CHECK");
  if (data && typeof data === "object") {
    const t = (data as { type?: unknown }).type;
    return typeof t === "string" && t.includes("RESET_BLANK_CHECK");
  }
  return false;
}

export interface InstallResult {
  /** True if this call actually installed the filter; false if it was already active. */
  installed: boolean;
  /** Restores all listeners and console methods. Safe to call multiple times. */
  dispose: () => void;
}

export function installResetBlankCheckFilter(
  target?: (Window & typeof globalThis) | null,
): InstallResult {
  const resolved =
    target === null ? undefined : (target ?? (typeof window !== "undefined" ? window : undefined));
  if (!resolved) return { installed: false, dispose: () => {} };
  const w = resolved as FlaggedWindow;
  if (w[FLAG]) return { installed: false, dispose: () => {} };
  w[FLAG] = true;

  const filter = (e: MessageEvent) => {
    if (isResetBlankMessage(e.data)) {
      e.stopImmediatePropagation();
    }
  };
  resolved.addEventListener("message", filter, true);

  const origLog = resolved.console.log;
  const origInfo = resolved.console.info;
  const origWarn = resolved.console.warn;
  const wrap =
    (orig: (...a: unknown[]) => void) =>
    (...args: unknown[]) => {
      if (args.some((a) => typeof a === "string" && a.includes("RESET_BLANK_CHECK"))) return;
      orig.apply(resolved.console, args);
    };
  resolved.console.log = wrap(origLog);
  resolved.console.info = wrap(origInfo);
  resolved.console.warn = wrap(origWarn);

  let disposed = false;
  return {
    installed: true,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      resolved.removeEventListener("message", filter, true);
      resolved.console.log = origLog;
      resolved.console.info = origInfo;
      resolved.console.warn = origWarn;
      w[FLAG] = false;
    },
  };
}
