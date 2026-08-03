/**
 * OtherDirections — up to two alternative Signature directions that were
 * genuinely considered for this traveller.
 *
 * An alternative is only ever passed in when it carries, strongly, something
 * the chosen day does not (see `deriveStudioIntelligence`). Near-duplicates
 * are dropped upstream, so this section never pads itself out.
 *
 * Presentational only: it explains, it does not switch the day, change
 * pricing, or assert availability. Every title is a real Signature in the
 * catalogue.
 */

import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/utils";
import type { StudioAlternativeDirection } from "@/components/studio-v3/curation";

export interface OtherDirectionsProps {
  readonly directions: ReadonlyArray<StudioAlternativeDirection>;
  readonly className?: string;
  readonly testId?: string;
}

export function OtherDirections({ directions, className, testId }: OtherDirectionsProps) {
  const shown = directions.slice(0, 2);
  if (shown.length === 0) return null;

  return (
    <section
      aria-label="Other directions we considered"
      data-testid={testId ?? "studio-v3-other-directions"}
      className={cn("w-full py-6", className)}
    >
      <Eyebrow>Also considered</Eyebrow>
      <ul className="mt-3 flex flex-col gap-3">
        {shown.map((direction) => (
          <li
            key={direction.tourId}
            data-testid="studio-v3-other-direction"
            className="rounded-[2px] border p-4"
            style={{
              borderColor: "color-mix(in oklab, var(--charcoal) 12%, transparent)",
              background: "color-mix(in oklab, var(--sand) 45%, transparent)",
            }}
          >
            <p
              className="text-[14px] font-medium leading-snug"
              style={{ color: "var(--charcoal)" }}
            >
              {direction.title}
            </p>
            <p
              className="mt-1.5 text-[13px] leading-[1.55] [text-wrap:pretty]"
              style={{ color: "color-mix(in oklab, var(--charcoal) 78%, transparent)" }}
            >
              {direction.note}
            </p>
          </li>
        ))}
      </ul>
      <p
        className="mt-3 text-[12.5px] leading-[1.5]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 62%, transparent)" }}
      >
        Tell us and we will shape the day around one of these instead.
      </p>
    </section>
  );
}

export default OtherDirections;
