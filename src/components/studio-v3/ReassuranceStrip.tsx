/**
 * ReassuranceStrip — quiet band of operational assurances shown near the
 * primary continuation CTA (and later moved to the Confirmation Pause
 * per plan §E). No badges, no icons that imply certifications we don't hold.
 *
 * Step 6 of the post-builder plan. Content-only, presentational.
 * Items default to the locked list in `signature-day-copy.ts`; callers can
 * override for the Confirmation Pause variant.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { REASSURANCE_DEFAULT } from "@/content/signature-day-copy";

export interface ReassuranceStripItem {
  readonly key: string;
  readonly label: string;
  readonly detail: string;
}

export interface ReassuranceStripProps {
  readonly items?: ReadonlyArray<ReassuranceStripItem>;
  readonly className?: string;
  readonly testId?: string;
}

export function ReassuranceStrip({ items, className, testId }: ReassuranceStripProps) {
  const list = items ?? REASSURANCE_DEFAULT;
  if (!list.length) return null;
  return (
    <section
      aria-label="What's guaranteed"
      data-testid={testId ?? "studio-v3-reassurance-strip"}
      className={cn(
        "w-full grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 py-5 border-t",
        className,
      )}
      style={{
        borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)",
      }}
    >
      {list.map((item) => (
        <div key={item.key} className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-[6px] shrink-0"
            style={{
              width: 14,
              height: 1,
              background: "var(--gold)",
            }}
          />
          <div>
            <p
              className="text-[11px] uppercase tracking-[0.22em] font-semibold"
              style={{ color: "var(--charcoal)" }}
            >
              {item.label}
            </p>
            <p
              className="mt-1 text-[12.5px] leading-[1.5]"
              style={{
                color: "color-mix(in oklab, var(--charcoal) 65%, transparent)",
              }}
            >
              {item.detail}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}

export default ReassuranceStrip;
