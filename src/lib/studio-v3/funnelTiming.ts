export type FunnelTimedEvent = "enter" | "continue" | "back" | "abandon" | "secure_confirm";

export interface FunnelTimingInput {
  sessionId: string;
  stepKey: string;
  event: string;
  value?: Record<string, unknown>;
  now?: number;
}

const enteredAt = new Map<string, number>();

function timerKey(sessionId: string, stepKey: string): string {
  return `${sessionId}::${stepKey}`;
}

/**
 * P11 timing enrichment for the central Studio funnel.
 *
 * The current Studio orchestration already emits `enter`, `continue`, `back`
 * and `abandon`, but most call-sites do not carry their own timers. Keeping the
 * clock here gives every phase a consistent `ms_on_step` without touching UX.
 * An explicit `ms_on_step` supplied by a caller always wins.
 *
 * `abandon` deliberately keeps the timer alive because visibility can return;
 * `continue`, `back` and terminal `secure_confirm` end the current visit.
 */
export function enrichStudioFunnelTiming({
  sessionId,
  stepKey,
  event,
  value = {},
  now = Date.now(),
}: FunnelTimingInput): Record<string, unknown> {
  const key = timerKey(sessionId, stepKey);

  if (event === "enter") {
    enteredAt.set(key, now);
    return value;
  }

  if (
    event !== "continue" &&
    event !== "back" &&
    event !== "abandon" &&
    event !== "secure_confirm"
  ) {
    return value;
  }

  const explicit = value.ms_on_step;
  const started = enteredAt.get(key);
  const elapsed =
    typeof explicit === "number" && Number.isFinite(explicit) && explicit >= 0
      ? explicit
      : typeof started === "number"
        ? Math.max(0, now - started)
        : null;

  if (event === "continue" || event === "back" || event === "secure_confirm") {
    enteredAt.delete(key);
  }

  return elapsed == null ? value : { ...value, ms_on_step: elapsed };
}

export function resetStudioFunnelTimingForTests(): void {
  enteredAt.clear();
}
