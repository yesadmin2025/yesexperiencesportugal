export interface StudioFunnelMetricRow {
  session_id: string;
  step_number: number;
  step_key: string;
  event: string;
  value: Record<string, unknown> | null;
  variant?: string | null;
  created_at: string;
}

export interface StudioFunnelStep {
  key: string;
  label: string;
  optional?: boolean;
  terminal?: boolean;
}

/**
 * The traveller-facing Studio sequence after P5-P10 pruning.
 * Hidden legacy phase ids intentionally do not appear here.
 */
export const STUDIO_FUNNEL_STEPS: readonly StudioFunnelStep[] = [
  { key: "intro", label: "Invitation" },
  { key: "feeling", label: "Feeling" },
  { key: "who", label: "Who" },
  { key: "interests", label: "Interests" },
  { key: "rhythm", label: "Rhythm" },
  { key: "refinement", label: "Refinement", optional: true },
  { key: "logistics", label: "Logistics" },
  { key: "storyboard", label: "Your Day" },
  { key: "guestDetails", label: "Guest details" },
  { key: "checkoutSummary", label: "Checkout", terminal: true },
] as const;

export interface StudioFunnelStepStat extends StudioFunnelStep {
  reached: number;
  completed: number;
  dropPct: number | null;
  reachPct: number;
  medianMs: number;
}

export interface StudioFunnelMilestones {
  directorsRead: number;
  delegated: number;
  logisticsCompleted: number;
  mapViewed: number;
  refined: number;
  priceExpanded: number;
}

export interface StudioFunnelVariantStat {
  variant: string;
  sessions: number;
  yourDayReached: number;
  checkoutReached: number;
  confirmed: number;
  yourDayRate: number;
  checkoutRate: number;
  confirmedRate: number;
}

export interface StudioFunnelStats {
  totalSessions: number;
  totalEvents: number;
  yourDayReached: number;
  guestDetailsReached: number;
  checkoutReached: number;
  confirmed: number;
  perStep: StudioFunnelStepStat[];
  milestones: StudioFunnelMilestones;
  variants: StudioFunnelVariantStat[];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function studioEvent(row: StudioFunnelMetricRow): string | null {
  const value = row.value;
  return typeof value?.studio_event === "string" ? value.studio_event : null;
}

function sessionSetForStep(rows: readonly StudioFunnelMetricRow[], stepKey: string): Set<string> {
  return new Set(rows.filter((row) => row.step_key === stepKey).map((row) => row.session_id));
}

function sessionSetForStudioEvent(
  rows: readonly StudioFunnelMetricRow[],
  event: string,
): Set<string> {
  return new Set(rows.filter((row) => studioEvent(row) === event).map((row) => row.session_id));
}

function unionSessionSets(...sets: ReadonlyArray<Set<string>>): Set<string> {
  const out = new Set<string>();
  for (const set of sets) for (const id of set) out.add(id);
  return out;
}

function intersectionSize(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const id of a) if (b.has(id)) count += 1;
  return count;
}

function rate(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function latestVariantBySession(rows: readonly StudioFunnelMetricRow[]): Map<string, string> {
  const latest = new Map<string, { variant: string; at: number }>();
  for (const row of rows) {
    const variant = row.variant?.trim();
    if (!variant) continue;
    const at = Date.parse(row.created_at);
    const current = latest.get(row.session_id);
    if (!current || !Number.isFinite(current.at) || at >= current.at) {
      latest.set(row.session_id, { variant, at });
    }
  }
  return new Map(Array.from(latest, ([session, value]) => [session, value.variant]));
}

/** Pure aggregation used by the admin dashboard and regression tests. */
export function computeStudioFunnelStats(
  rows: readonly StudioFunnelMetricRow[],
): StudioFunnelStats {
  const allSessions = new Set(rows.map((row) => row.session_id));
  const totalSessions = allSessions.size;
  const continued = new Map<string, Set<string>>();
  const msByStep = new Map<string, number[]>();

  for (const row of rows) {
    if (row.event === "continue") {
      if (!continued.has(row.step_key)) continued.set(row.step_key, new Set());
      continued.get(row.step_key)!.add(row.session_id);
    }
    if (
      row.event === "continue" ||
      row.event === "back" ||
      row.event === "abandon" ||
      row.event === "secure_confirm"
    ) {
      const ms = typeof row.value?.ms_on_step === "number" ? row.value.ms_on_step : null;
      if (ms != null && ms >= 0 && ms < 10 * 60 * 1000) {
        if (!msByStep.has(row.step_key)) msByStep.set(row.step_key, []);
        msByStep.get(row.step_key)!.push(ms);
      }
    }
  }

  const yourDaySessions = sessionSetForStep(rows, "storyboard");
  const guestDetailsSessions = sessionSetForStep(rows, "guestDetails");
  const checkoutSessions = sessionSetForStep(rows, "checkoutSummary");
  const confirmedSessions = new Set(
    rows.filter((row) => row.event === "secure_confirm").map((row) => row.session_id),
  );

  const perStep = STUDIO_FUNNEL_STEPS.map((step) => {
    const reachedSessions = sessionSetForStep(rows, step.key);
    const reached = reachedSessions.size;
    const completed = step.terminal
      ? intersectionSize(reachedSessions, confirmedSessions)
      : (continued.get(step.key)?.size ?? 0);
    const dropPct = reached === 0 ? null : Math.round(((reached - completed) / reached) * 100);
    const reachPct = rate(reached, totalSessions);
    return {
      ...step,
      reached,
      completed,
      dropPct,
      reachPct,
      medianMs: median(msByStep.get(step.key) ?? []),
    };
  });

  const refined = unionSessionSets(
    sessionSetForStudioEvent(rows, "refine_intent_selected"),
    sessionSetForStudioEvent(rows, "moment_swapped"),
    sessionSetForStudioEvent(rows, "moment_removed"),
  ).size;

  const sessionVariant = latestVariantBySession(rows);
  const variantSessions = new Map<string, Set<string>>();
  for (const session of allSessions) {
    const variant = sessionVariant.get(session) ?? "Unassigned";
    if (!variantSessions.has(variant)) variantSessions.set(variant, new Set());
    variantSessions.get(variant)!.add(session);
  }
  const variants = Array.from(variantSessions.entries())
    .map(([variant, sessions]) => {
      const yourDayReached = intersectionSize(sessions, yourDaySessions);
      const checkoutReached = intersectionSize(sessions, checkoutSessions);
      const confirmed = intersectionSize(sessions, confirmedSessions);
      return {
        variant,
        sessions: sessions.size,
        yourDayReached,
        checkoutReached,
        confirmed,
        yourDayRate: rate(yourDayReached, sessions.size),
        checkoutRate: rate(checkoutReached, sessions.size),
        confirmedRate: rate(confirmed, sessions.size),
      };
    })
    .sort((a, b) => b.sessions - a.sessions || a.variant.localeCompare(b.variant));

  return {
    totalSessions,
    totalEvents: rows.length,
    yourDayReached: yourDaySessions.size,
    guestDetailsReached: guestDetailsSessions.size,
    checkoutReached: checkoutSessions.size,
    confirmed: confirmedSessions.size,
    perStep,
    variants,
    milestones: {
      directorsRead: sessionSetForStudioEvent(rows, "interpretation_viewed").size,
      delegated: sessionSetForStudioEvent(rows, "surprise_me_selected").size,
      logisticsCompleted: sessionSetForStudioEvent(rows, "logistics_completed").size,
      mapViewed: sessionSetForStudioEvent(rows, "map_viewed").size,
      refined,
      priceExpanded: sessionSetForStudioEvent(rows, "price_expanded").size,
    },
  };
}
