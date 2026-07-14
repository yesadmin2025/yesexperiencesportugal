/**
 * ApprovalBadge — plan §H state machine, presentational only.
 *
 * Renders one of four visual states driven by `itinerary-validation`:
 *
 *   approved   → gold check + "YES Approved" (only state that shows the trust mark)
 *   review     → teal dot + "Route being reviewed" (no gold, no check)
 *   reject     → muted italic + "Preliminary itinerary"
 *   incomplete → muted italic + "Preliminary itinerary"
 *
 * Hard rule (plan §H): never render "YES Approved" when status !== "approved".
 * This component is the enforcement point — the string literal for the
 * gold-check variant is not reachable from any other branch.
 *
 * Purely presentational; parent owns the ValidationStatus value.
 */

import * as React from "react";
import type { ValidationStatus } from "@/lib/studio-v3/itinerary-validation";
import { APPROVAL_LABELS } from "@/content/signature-day-copy";
import { cn } from "@/lib/utils";

export interface ApprovalBadgeProps {
  readonly state: ValidationStatus;
  readonly className?: string;
  readonly testId?: string;
}

export function ApprovalBadge({ state, className, testId }: ApprovalBadgeProps) {
  const label = APPROVAL_LABELS[state];
  const dataTestId = testId ?? "studio-v3-approval-badge";

  if (state === "approved") {
    return (
      <div
        data-testid={dataTestId}
        data-approval-state="approved"
        aria-label="YES Approved Signature"
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
          className,
        )}
        style={{
          border: "1px solid color-mix(in oklab, var(--teal) 35%, transparent)",
          background: "color-mix(in oklab, var(--ivory) 80%, transparent)",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          aria-hidden
          style={{ color: "var(--gold)" }}
        >
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.25" />
          <path
            d="M4.5 8.4 7 10.8l4.5-5.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span
          className="text-[10px] uppercase tracking-[0.26em] font-semibold"
          style={{ color: "var(--teal)" }}
        >
          {APPROVAL_LABELS.approved}
        </span>
      </div>
    );
  }

  if (state === "review") {
    return (
      <div
        data-testid={dataTestId}
        data-approval-state="review"
        aria-label={label}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
          className,
        )}
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
        <span
          className="text-[10px] uppercase tracking-[0.26em] font-semibold"
          style={{ color: "var(--teal)" }}
        >
          {label}
        </span>
      </div>
    );
  }

  // reject + incomplete → muted italic, no badge chrome
  return (
    <p
      data-testid={dataTestId}
      data-approval-state={state}
      className={cn("text-[12px] italic", className)}
      style={{
        color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
        fontFamily: "var(--font-editorial)",
      }}
    >
      {label}
    </p>
  );
}

export default ApprovalBadge;
