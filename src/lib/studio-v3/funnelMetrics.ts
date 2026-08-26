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
  completed: number | null;
  dropPct: number | null;
  reachPct: number;
  medianMs: number;
}

export interface StudioFunnelTierStat {
  tier: string;
  picks: number;
  checkoutReached: number;
  rate: number;
}

export interface StudioFunnelMilestones {
  directorsRead: number;
  delegated: number;
  logisticsCompleted: number;
  mapViewed: number;
  refined: number;
  priceExpanded: number;
}

export interface StudioFunnelStats {
  totalSessions: number;
  totalEvents: number;
  yourDayReached: number;
  guestDetailsReached: number;
  checkoutReached: number;
  confirmed: number;
  perStep: StudioFunnelStepStat[];
  tiers: StudioFunnelTierStat[];
  milestones: StudioFunnelMilestones;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function studioEvent(row: StudioFunnelMetricRow): string | null {
  const value = row.value;
  return typeof value?.studio_event === "string" ? value.studio_event : null;
}

function sessionSetForStep(
  rows: readonly StudioFunnelMetricRow[],
  stepKey: string,
): Set<string> {
  return new Set(rows.filter((row) => row.step_key === stepKey).map((row) => row.session_id));
}

function sessionSetForStudioEvent(
  rows: readonly StudioFunnelMetricRow[],
  event: string,
): Set<string> {
  return new Set(
    rows.filter((row) => studioEvent(row) === event).map((row) => row.session_id),
  );
}

function unionSessionSets(...sets: ReadonlyArray<Set<string>>): Set<string> {
  const out = new Set<string>();
  for (const set of sets) for (const id of set) out.add(id);
  return out;
}

function latestTierBySession(rows: readonly StudioFunnelMetricRow[]): Map<string, string> {
  const latest = new Map<string, { tier: string; at: number }>();
  for (const row of rows) {
    if (row.event !== "tier_chosen") continue;
    const tier = typeof row.value?.tier === "string" ? row.value.tier : null;
    if (!tier) continue;
    const at = Date.parse(row.created_at);
    const current = latest.get(row.session_id);
    if (!current || !Number.isFinite(current.at) || at >= current.at) {
      latest.set(row.session_id, { tier, at });
    }
  }
  return new Map(Array.from(latest, ([session, value]) => [session, value.tier]));
}

/** Pure aggregation used by the admin dashboard and regression tests. */
export function computeStudioFunnelStats(
  rows: readonly StudioFunnelMetricRow[],
): StudioFunnelStats {
  const totalSessions = new Set(rows.map((row) => row.session_id)).size;
  const continued = new Map<string, Set<string>>();
  const msByStep = new Map<string, number[]>();

  for (const row of rows) {
    if (row.event === "continue") {
      if (!continued.has(row.step_key)) continued.set(row.step_key, new Set());
      continued.get(row.step_key)!.add(row.session_id);
    }
    if (row.event === "continue" || row.event === "back" || row.event === "abandon") {
      const ms = typeof row.value?.ms_on_step === "number" ? row.value.ms_on_step : null;
      if (ms != null && ms >= 0 && ms < 10 * 60 * 1000) {
        if (!msByStep.has(row.step_key)) msByStep.set(row.step_key, []);
        msByStep.get(row.step_key)!.push(ms);
      }
    }
  }

  const perStep = STUDIO_FUNNEL_STEPS.map((step) => {
    const reached = sessionSetForStep(rows, step.key).size;
    const completed = step.terminal ? null : (continued.get(step.key)?.size ?? 0);
    const dropPct =
      completed == null || reached === 0
        ? null
        : Math.round(((reached - completed) / reached) * 100);
    const reachPct = totalSessions > 0 ? Math.round((reached / totalSessions) * 100) : 0;
    return {
      ...step,
      reached,
      completed,
      dropPct,
      reachPct,
      medianMs: median(msByStep.get(step.key) ?? []),
    };
  });

  const yourDaySessions = sessionSetForStep(rows, "storyboard");
  const guestDetailsSessions = sessionSetForStep(rows, "guestDetails");
  const checkoutSessions = sessionSetForStep(rows, "checkoutSummary");
  const confirmedSessions = new Set(
    rows.filter((row) => row.event === "secure_confirm").map((row) => row.session_id),
  );

  const sessionTier = latestTierBySession(rows);
  const tierPicks = new Map<string, Set<string>>();
  const tierCheckout = new Map<string, Set<string>>();
  for (const [session, tier] of sessionTier) {
    if (!tierPicks.has(tier)) tierPicks.set(tier, new Set());
    tierPicks.get(tier)!.add(session);
    if (checkoutSessions.has(session)) {
      if (!tierCheckout.has(tier)) tierCheckout.set(tier, new Set());
      tierCheckout.get(tier)!.add(session);
    }
  }
  const tiers = Array.from(tierPicks.entries())
    .map(([tier, sessions]) => {
      const checkoutReached = tierCheckout.get(tier)?.size ?? 0;
      return {
        tier,
        picks: sessions.size,
        checkoutReached,
        rate:
          sessions.size > 0 ? Math.round((checkoutReached / sessions.size) * 100) : 0,
      };
    })
    .sort((a, b) => b.picks - a.picks || a.tier.localeCompare(b.tier));

  const refined = unionSessionSets(
    sessionSetForStudioEvent(rows, "refine_intent_selected"),
    sessionSetForStudioEvent(rows, "moment_swapped"),
    sessionSetForStudioEvent(rows, "moment_removed"),
  ).size;

  return {
    totalSessions,
    totalEvents: rows.length,
    yourDayReached: yourDaySessions.size,
    guestDetailsReached: guestDetailsSessions.size,
    checkoutReached: checkoutSessions.size,
    confirmed: confirmedSessions.size,
    perStep,
    tiers,
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
