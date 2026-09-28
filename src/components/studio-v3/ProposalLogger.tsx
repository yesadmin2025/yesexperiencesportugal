import * as React from "react";
import { logStudioProposal } from "@/lib/studio-v3/proposal-log.functions";

/** Invisible: records one proposal per tour/date/guests per browser session. */
export function ProposalLogger(props: {
  tourId: string | null;
  perPaxEur: number | null;
  guests: number | null;
  dateLabel: string | null;
  pickup: string | null;
}) {
  const { tourId, perPaxEur, guests, dateLabel, pickup } = props;
  React.useEffect(() => {
    if (!tourId) return;
    try {
      const sig = `yes-prop:${tourId}|${perPaxEur}|${guests}|${dateLabel}`;
      let key = sessionStorage.getItem(sig);
      if (key) return;
      key = crypto.randomUUID();
      sessionStorage.setItem(sig, key);
      void logStudioProposal({
        data: { visitKey: key, tourId, perPaxEur, guests, dateLabel, pickup },
      }).catch(() => {});
    } catch {
      /* never block the reveal */
    }
  }, [tourId, perPaxEur, guests, dateLabel, pickup]);
  return null;
}
