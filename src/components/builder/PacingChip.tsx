import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { suggestPacing } from "@/server/builderPacing.functions";
import { useBuilderSessionId } from "@/hooks/useBuilderSessionId";
import type { RouteUI, Who } from "./types";

interface Props {
  route: RouteUI;
  who: Who;
}

/**
 * Silent AI pacing chip — fetches a soft pacing warning if the day feels
 * rushed. Renders nothing when the route is well-paced. Editorial gold tone.
 */
export function PacingChip({ route, who }: Props) {
  const sessionId = useBuilderSessionId();
  const advise = useServerFn(suggestPacing);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const key = route.stops.map((s) => s.key).join("|") + ":" + route.pace + ":" + who;
    void advise({
      data: {
        sessionId,
        pace: route.pace,
        who,
        totalMinutes: route.totals.experienceMinutes,
        stops: route.stops.map((s) => ({
          key: s.key,
          label: s.label,
          durationMinutes: s.duration_minutes,
          driveMinutesFromPrev: s.driveMinutesFromPrev,
        })),
      },
    })
      .then((r) => {
        if (cancelled) return;
        setWarning(r.warning);
      })
      .catch(() => {
        if (!cancelled) setWarning(null);
      });
    return () => {
      cancelled = true;
      void key;
    };
  }, [sessionId, advise, route, who]);

  if (!warning) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="builder-reveal inline-flex max-w-full items-start gap-2 rounded-[2px] border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/10 px-3 py-2 text-[12.5px] leading-snug text-[color:var(--charcoal)]/85"
    >
      <Sparkles size={13} className="mt-[2px] shrink-0 text-[color:var(--gold)]" aria-hidden="true" />
      <span>
        <span className="font-semibold uppercase tracking-[0.18em] text-[10px] text-[color:var(--gold)] mr-2">
          Sugestão
        </span>
        {warning}
      </span>
    </div>
  );
}
