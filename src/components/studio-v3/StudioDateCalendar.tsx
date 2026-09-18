import type { ComponentProps } from "react";

import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type CalendarProps = ComponentProps<typeof Calendar>;

/** Shared Studio calendar geometry: seven 40px mobile cells, 44px from 360px. */
export function StudioDateCalendar({ className, classNames, ...props }: CalendarProps) {
  return (
    <div className="w-full min-w-0 overflow-hidden" data-testid="studio-date-calendar-frame">
      <Calendar
        {...props}
        className={cn(
          "pointer-events-auto mx-auto w-fit max-w-full bg-[color:var(--ivory)] p-0 text-[color:var(--charcoal)] [--cell-size:2.5rem] min-[360px]:[--cell-size:2.75rem] [&_.rdp-button_next]:opacity-100 [&_.rdp-button_next]:text-[color:var(--charcoal-soft)] [&_.rdp-button_previous]:opacity-100 [&_.rdp-button_previous]:text-[color:var(--charcoal-soft)] [&_.rdp-caption_label]:text-[color:var(--charcoal)] [&_.rdp-day_button:not(:disabled)]:opacity-100 [&_.rdp-day_button:not(:disabled)]:text-[color:var(--charcoal)] [&_.rdp-day_button:disabled]:opacity-40 [&_.rdp-day_button:disabled]:text-[color:var(--charcoal-soft)] [&_.rdp-weekday]:opacity-100 [&_.rdp-weekday]:text-[color:var(--charcoal-soft)]",
          className,
        )}
        classNames={classNames}
      />
    </div>
  );
}
