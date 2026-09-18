import type { ComponentProps } from "react";

import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type CalendarProps = ComponentProps<typeof Calendar>;

/** Shared Studio calendar geometry: seven 40px mobile cells, 44px from 360px. */
export function StudioDateCalendar({ className, ...props }: CalendarProps) {
  return (
    <div className="w-full min-w-0 overflow-hidden" data-testid="studio-date-calendar-frame">
      <Calendar
        {...props}
        className={cn(
          "pointer-events-auto mx-auto w-fit max-w-full p-0 [--cell-size:2.5rem] min-[360px]:[--cell-size:2.75rem]",
          className,
        )}
      />
    </div>
  );
}
