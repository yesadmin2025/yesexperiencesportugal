/**
 * RefineStopCard — mobile-safe stop-card layout for the reveal's refinement
 * section (plan §D). Replaces the current single-row `[#][title][icons…]`
 * layout that collapses the description column at 393px.
 *
 * Rules (locked by plan §D):
 *   - Single column always. Number + title on row 1, full-width paragraph
 *     on row 2, 44×44 icon toolbar on row 3. No side-by-side text/actions.
 *   - Action buttons: 44×44 hit area, aria-label, tooltip title, disabled
 *     state greys icon + aria-disabled + removes focus (tabindex=-1).
 *   - Disabled cases: Earlier (index 0), Later (index last), Swap (empty
 *     swap pool), Remove (stops === minStops).
 *   - Description: line-clamp-3, "Read more" disclosure expands in place.
 *
 * Purely presentational — parent owns state (move/swap/remove handlers,
 * swap-open state, expand state). Kept out of StudioV3 wiring in this step;
 * Step 8 replaces the inline row with this component.
 */

import * as React from "react";
import { ArrowUp, ArrowDown, ArrowLeftRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RefineStopCandidate {
  /** Stable canonical identity — the parent maps this back to real data. */
  readonly id?: string;
  readonly label: string;
  readonly story?: string;
}

export interface RefineStopCardProps {
  readonly index: number; // 0-based
  readonly total: number;
  readonly label: string;
  readonly story?: string;
  /** Pass 2B — one short truthful "why this fits you" line, or omitted. */
  readonly reason?: string | null;
  readonly minStops?: number; // default 1
  /**
   * FINAL CLOSURE — proven commercial/operational optionality. When provided
   * it is the authority: `false` hides removal even on a long day. Omitted
   * keeps the legacy floor behaviour for non-Studio callers.
   */
  readonly removable?: boolean;

  readonly canSwap?: boolean; // false when swap pool empty
  readonly swapPool?: ReadonlyArray<RefineStopCandidate>;
  readonly swapOpen?: boolean;
  readonly onMoveEarlier?: () => void;
  readonly onMoveLater?: () => void;
  readonly onToggleSwap?: () => void;
  readonly onPickSwap?: (candidate: RefineStopCandidate) => void;
  readonly onRemove?: () => void;
  readonly className?: string;
  readonly testId?: string;
}

const CLAMP_LINES = 3;

export function RefineStopCard({
  index,
  total,
  label,
  story,
  reason,
  minStops = 1,
  removable,
  canSwap = false,
  swapPool,
  swapOpen = false,
  onMoveEarlier,
  onMoveLater,
  onToggleSwap,
  onPickSwap,
  onRemove,
  className,
  testId,
}: RefineStopCardProps) {
  const [expanded, setExpanded] = React.useState(false);
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const canRemove = (removable ?? true) && total > minStops;
  const showReadMore = !!story && story.length > 140;

  return (
    <li
      data-testid={testId ?? "studio-v3-refine-stop-card"}
      data-index={index}
      data-removable={canRemove ? "true" : "false"}
      className={cn("w-full rounded-[10px] px-4 py-4", className)}
      style={{
        background: "color-mix(in oklab, var(--sand) 45%, transparent)",
        border: "1px solid color-mix(in oklab, var(--charcoal) 10%, transparent)",
      }}
    >
      {/* Row 1 — number + full title */}
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-[3px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
          style={{
            background: "color-mix(in oklab, var(--gold) 25%, transparent)",
            color: "var(--charcoal)",
          }}
        >
          {index + 1}
        </span>
        <h3
          className="min-w-0 flex-1 text-[15px] leading-[1.3] font-semibold [text-wrap:balance]"
          style={{ fontFamily: "var(--font-display)", color: "var(--charcoal)" }}
        >
          {label}
        </h3>
      </div>

      {/* Pass 2B — one discreet, truthful reason. Absent when none is true. */}
      {reason ? (
        <p
          data-testid="studio-v3-moment-reason"
          className="mt-1.5 pl-9 text-[11.5px] leading-[1.4]"
          style={{
            fontFamily: "var(--font-editorial)",
            color: "color-mix(in oklab, var(--charcoal) 62%, transparent)",
          }}
        >
          {reason}
        </p>
      ) : null}

      {/* Row 2 — full-width paragraph */}
      {story ? (
        <div className="mt-2.5 pl-9">
          <p
            className={cn(
              "text-[14px] leading-[1.6] [text-wrap:pretty]",
              !expanded && showReadMore && "line-clamp-3",
            )}
            style={{ color: "color-mix(in oklab, var(--charcoal) 78%, transparent)" }}
          >
            {story}
          </p>
          {showReadMore ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] uppercase tracking-[0.22em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
              style={{ color: "var(--charcoal)" }}
              aria-expanded={expanded}
              data-testid="studio-v3-refine-read-more"
            >
              <span aria-hidden style={{ color: "var(--gold)" }}>
                {expanded ? "↑" : "↓"}
              </span>
              {expanded ? "Read less" : "Read more"}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Row 3 — compact icon-only action cluster, right-aligned */}
      <div
        role="toolbar"
        aria-label={`Actions for ${label}`}
        className="mt-3 flex items-center justify-end gap-1 pl-9"
      >
        <ActionButton
          icon={<ArrowUp size={15} aria-hidden />}
          label="Earlier"
          ariaLabel={`Move ${label} earlier in the day`}
          disabled={isFirst || !onMoveEarlier}
          onClick={onMoveEarlier}
          testId="studio-v3-refine-earlier"
        />
        <ActionButton
          icon={<ArrowDown size={15} aria-hidden />}
          label="Later"
          ariaLabel={`Move ${label} later in the day`}
          disabled={isLast || !onMoveLater}
          onClick={onMoveLater}
          testId="studio-v3-refine-later"
        />
        <ActionButton
          icon={<ArrowLeftRight size={15} aria-hidden />}
          label="Swap"
          ariaLabel={`Swap ${label} for another moment`}
          disabled={!canSwap || !onToggleSwap}
          onClick={onToggleSwap}
          ariaExpanded={swapOpen}
          testId="studio-v3-refine-swap"
        />
        <ActionButton
          icon={<X size={15} aria-hidden />}
          label="Remove"
          ariaLabel={`Remove ${label} from the day`}
          disabled={!canRemove || !onRemove}
          onClick={onRemove}
          testId="studio-v3-refine-remove"
        />
      </div>

      {/* Swap pool — expands in place */}
      {swapOpen && swapPool && swapPool.length > 0 ? (
        <ul data-testid="studio-v3-refine-swap-pool" className="mt-3 space-y-1 pl-9">
          {swapPool.map((cand) => (
            <li key={cand.label}>
              <button
                type="button"
                onClick={() => onPickSwap?.(cand)}
                className="w-full min-h-[44px] text-left px-3 py-2 rounded-[6px] text-[13px] leading-[1.5] hover:bg-[color:var(--ivory)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                style={{ color: "var(--charcoal)" }}
              >
                <span className="font-semibold">{cand.label}</span>
                {cand.story ? (
                  <span
                    className="block text-[11.5px] mt-0.5"
                    style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
                  >
                    {cand.story}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  ariaLabel: string;
  disabled?: boolean;
  onClick?: () => void;
  ariaExpanded?: boolean;
  testId?: string;
}

function ActionButton({
  icon,
  label,
  ariaLabel,
  disabled,
  onClick,
  ariaExpanded,
  testId,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-label={ariaLabel}
      title={label}
      aria-disabled={disabled ? "true" : undefined}
      aria-expanded={typeof ariaExpanded === "boolean" ? ariaExpanded : undefined}
      tabIndex={disabled ? -1 : 0}
      data-testid={testId}
      data-disabled={disabled ? "true" : "false"}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-2 rounded-[6px] text-[11px] uppercase tracking-[0.2em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]",
        disabled && "opacity-30 cursor-not-allowed",
      )}
      style={{ color: "var(--charcoal)" }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export default RefineStopCard;
