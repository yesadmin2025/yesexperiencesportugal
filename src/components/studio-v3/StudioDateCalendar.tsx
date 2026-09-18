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
          "pointer-events-auto mx-auto w-fit max-w-full bg-[color:var(--ivory)] p-0 text-[color:var(--charcoal)] [--cell-size:2.5rem] min-[360px]:[--cell-size:2.75rem]",
          className,
        )}
        classNames={{
          caption_label: "text-[color:var(--charcoal)]",
          button_previous:
            "text-[color:var(--charcoal-soft)] opacity-100 hover:bg-[color:var(--sand)] hover:text-[color:var(--teal)]",
          button_next:
            "text-[color:var(--charcoal-soft)] opacity-100 hover:bg-[color:var(--sand)] hover:text-[color:var(--teal)]",
          weekday: "text-[color:var(--charcoal-soft)] opacity-100",
          day_button:
            "text-[color:var(--charcoal)] opacity-100 hover:bg-[color:var(--sand)] hover:text-[color:var(--teal)]",
          disabled: "text-[color:var(--charcoal-soft)] opacity-40",
          today: "bg-[color:var(--sand)] text-[color:var(--teal)]",
          ...classNames,
        }}
      />
    </div>
  );
}
