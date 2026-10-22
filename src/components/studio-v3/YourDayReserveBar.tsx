/**
 * YourDayReserveBar — calm fixed bottom bar on the unified "Your Day"
 * surface. Keeps the investment, the date/party facts and the single
 * primary action ("Love this day · Reserve it") within reach while the
 * traveler reads the day, without touching the cinematic surface itself.
 *
 * Rules:
 * - Rendered only when the surface's own primary CTA is off-screen, so
 *   there is never more than one primary action visible (brand rule).
 * - Mirrors the exact same gate and handler as the main CTA — no new
 *   booking logic, no price changes, no second path.
 * - Mobile-first, safe-area aware, reduced-motion safe, semantic tokens.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CTA_MAKE_IT_REAL } from "@/content/signature-day-copy";
import { cn } from "@/lib/utils";

export interface YourDayReserveBarProps {
  /** Resolved live total in EUR — the same number the price card shows. */
  readonly totalEur: number | null;
  /** Human date fact, e.g. "Friday, 14 November" or "Flexible date". */
  readonly dateLabel: string | null;
  /** Shared guest-composition string from formatGuestComposition. */
  readonly guestsLabel: string | null;
  /** Whether the bar is on-screen (main CTA scrolled out of view). */
  readonly visible: boolean;
  /** The SAME handler the surface's primary CTA calls. */
  readonly onReserve: () => void;
  readonly testId?: string;
}

function formatEur(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function YourDayReserveBar({
  totalEur,
  dateLabel,
  guestsLabel,
  visible,
  onReserve,
  testId,
}: YourDayReserveBarProps) {
  const facts = [dateLabel, guestsLabel].filter(Boolean).join(" · ");

  // Portal to <body>: the "Your Day" surface root carries an entrance
  // animation with fill-mode both, whose lingering transform would
  // otherwise become the containing block for `position: fixed` and pin
  // the bar to the bottom of the document instead of the viewport.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div
      data-testid={testId ?? "studio-v3-reserve-bar"}
      data-visible={visible ? "true" : "false"}
      aria-hidden={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 transition-transform duration-300 ease-out motion-reduce:transition-none",
        visible ? "translate-y-0" : "translate-y-full pointer-events-none",
      )}
      style={{
        background: "color-mix(in oklab, var(--ivory) 97%, transparent)",
        borderTop: "1px solid color-mix(in oklab, var(--charcoal) 12%, transparent)",
        boxShadow: "0 -12px 32px -24px color-mix(in oklab, var(--charcoal) 40%, transparent)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="mx-auto flex w-full max-w-[640px] items-center gap-3 px-5 py-3">
        <div className="min-w-0 flex-1">
          <p
            data-testid="studio-v3-reserve-bar-price"
            className="text-[19px] leading-none tabular-nums"
            style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
          >
            {formatEur(totalEur)}
          </p>
          {facts ? (
            <p
              data-testid="studio-v3-reserve-bar-facts"
              className="mt-1 truncate text-[10.5px] uppercase tracking-[0.16em]"
              style={{ color: "color-mix(in oklab, var(--charcoal) 58%, transparent)" }}
            >
              {facts}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onReserve}
          tabIndex={visible ? 0 : -1}
          data-testid="studio-v3-reserve-bar-cta"
          aria-label={CTA_MAKE_IT_REAL}
          className="min-h-[48px] shrink-0 rounded-full px-5 text-[11px] uppercase tracking-[0.18em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] transition-colors"
          style={{ background: "var(--gold)", color: "var(--charcoal)" }}
        >
          {CTA_MAKE_IT_REAL}
        </button>
      </div>
    </div>,
    document.body,
  );
}

export default YourDayReserveBar;
