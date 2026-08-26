import { getFunnelVariant, trackStep } from "@/lib/studio-v3-funnel";
import {
  P14_YOUR_DAY_CTA_CLICK_EVENT,
  P14_YOUR_DAY_CTA_EXPERIMENT,
  p14YourDayCtaLabelForVariant,
} from "@/lib/studio-v3/experiments";
import { STUDIO_FUNNEL_STEPS } from "@/lib/studio-v3/funnelMetrics";

export function currentP14YourDayCtaLabel(): string {
  return p14YourDayCtaLabelForVariant(getFunnelVariant());
}

export function trackP14YourDayCtaClick(): void {
  const stepIndex = STUDIO_FUNNEL_STEPS.findIndex((step) => step.key === "storyboard");
  trackStep({
    stepNumber: stepIndex >= 0 ? stepIndex + 1 : 0,
    stepKey: "storyboard",
    event: "milestone",
    value: {
      studio_event: P14_YOUR_DAY_CTA_CLICK_EVENT,
      experiment_id: P14_YOUR_DAY_CTA_EXPERIMENT,
    },
  });
}
