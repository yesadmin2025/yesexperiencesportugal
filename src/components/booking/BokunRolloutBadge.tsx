// BokunRolloutBadge
//
// Presentational chip that surfaces the Bókun banded-pricing rollout state
// for a given tour. Derives its state purely from `TourBokunReadiness` —
// no new queries, no new endpoints. Mirrors the token usage in
// `ApprovalBadge` (teal pill + gold accent for the positive state, muted
// italic for legacy/unknown). No new colors, no new fonts.
//
// Admins additionally see a deep-link into /admin/pricing when the tour
// needs mapping review. Regular visitors see an informational label only.

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { TourBokunReadiness } from "@/hooks/use-tour-bokun-readiness";

export type BokunRolloutState =
  | "enabled"
  | "review"
  | "syncing"
  | "legacy"
  | "unknown";

export function resolveBokunRolloutState(
  readiness: TourBokunReadiness | null | undefined,
): BokunRolloutState {
  if (!readiness) return "unknown";
  const categories = readiness.bokunCategories ?? [];
  const hasConfirmed = categories.some((c) => c.mappingStatus === "confirmed");
  const modeOk =
    readiness.pricingMode === "flat" ||
    readiness.pricingMode === "date-dependent" ||
    readiness.pricingMode === "slot-dependent";


  if (readiness.bandedPricingEnabled) {
    if (hasConfirmed && modeOk) return "enabled";
    return "review";
  }
  if (categories.length > 0) return "syncing";
  return "legacy";
}

function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function check(userId: string | null) {
      if (!userId) {
        if (!cancelled) setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) setIsAdmin(!error && !!data);
    }
    supabase.auth.getSession().then(({ data }) => check(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      check(s?.user.id ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);
  return isAdmin;
}

export interface BokunRolloutBadgeProps {
  readonly readiness: TourBokunReadiness | null | undefined;
  readonly tourId?: string;
  readonly className?: string;
}

export function BokunRolloutBadge({
  readiness,
  tourId,
  className,
}: BokunRolloutBadgeProps) {
  const state = resolveBokunRolloutState(readiness);
  const isAdmin = useIsAdmin();

  const wrapper = "inline-flex items-center gap-2 px-3 py-1.5 rounded-full";
  const labelCls =
    "text-[10px] uppercase tracking-[0.26em] font-semibold";

  if (state === "enabled") {
    const modeLabel =
      readiness?.pricingMode === "slot"
        ? "Live · per slot"
        : readiness?.pricingMode === "date"
          ? "Live · per date"
          : "Live · flat";
    return (
      <div
        data-testid="bokun-rollout-badge"
        data-rollout-state="enabled"
        aria-label="Live Bókun pricing enabled"
        className={cn(wrapper, className)}
        style={{
          border: "1px solid color-mix(in oklab, var(--teal) 35%, transparent)",
          background: "color-mix(in oklab, var(--ivory) 80%, transparent)",
        }}
      >
        <CheckCircle2 size={13} style={{ color: "var(--gold)" }} aria-hidden />
        <span className={labelCls} style={{ color: "var(--teal)" }}>
          Live Bókun pricing
        </span>
        <span
          className="text-[9.5px] uppercase tracking-[0.22em]"
          style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
        >
          · {modeLabel}
        </span>
      </div>
    );
  }

  if (state === "review") {
    const inner = (
      <>
        <AlertTriangle size={13} style={{ color: "#B45309" }} aria-hidden />
        <span className={labelCls} style={{ color: "#92400E" }}>
          {isAdmin ? "Awaiting admin mapping" : "Live pricing being finalised"}
        </span>
      </>
    );
    return isAdmin && tourId ? (
      <Link
        to="/admin/pricing"
        hash={tourId}
        data-testid="bokun-rollout-badge"
        data-rollout-state="review"
        className={cn(wrapper, "hover:opacity-90 transition-opacity", className)}
        style={{
          border: "1px solid color-mix(in oklab, #B45309 40%, transparent)",
          background: "color-mix(in oklab, #FEF3C7 60%, transparent)",
        }}
      >
        {inner}
      </Link>
    ) : (
      <div
        data-testid="bokun-rollout-badge"
        data-rollout-state="review"
        aria-label="Live pricing being finalised"
        className={cn(wrapper, className)}
        style={{
          border: "1px solid color-mix(in oklab, #B45309 40%, transparent)",
          background: "color-mix(in oklab, #FEF3C7 60%, transparent)",
        }}
      >
        {inner}
      </div>
    );
  }

  if (state === "syncing") {
    // Admin-facing staging signal; visitors don't need to see it.
    if (!isAdmin) return null;
    return (
      <div
        data-testid="bokun-rollout-badge"
        data-rollout-state="syncing"
        aria-label="Bókun synced, rollout off"
        className={cn(wrapper, className)}
        style={{
          border: "1px solid color-mix(in oklab, var(--teal) 25%, transparent)",
          background: "color-mix(in oklab, var(--ivory) 80%, transparent)",
        }}
      >
        <span
          aria-hidden
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: "var(--teal)" }}
        />
        <span className={labelCls} style={{ color: "var(--teal)" }}>
          Bókun synced · rollout off
        </span>
      </div>
    );
  }

  // legacy + unknown → muted italic, admin only (visitors see nothing).
  if (!isAdmin) return null;
  return (
    <p
      data-testid="bokun-rollout-badge"
      data-rollout-state={state}
      className={cn("text-[12px] italic", className)}
      style={{
        color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
        fontFamily: "var(--font-editorial)",
      }}
    >
      {state === "legacy" ? "Manual pricing" : "Pricing status unavailable"}
    </p>
  );
}

export default BokunRolloutBadge;
