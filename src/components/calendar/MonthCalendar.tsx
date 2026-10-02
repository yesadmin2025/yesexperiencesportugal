import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarDayTone = "default" | "tour" | "available" | "unavailable" | "full" | "partial";

export interface MonthCalendarDay {
  readonly iso: string;
  readonly day: number;
  readonly tone?: CalendarDayTone;
  readonly count?: number;
  readonly label?: string;
}

interface MonthCalendarProps {
  readonly monthLabel: string;
  readonly days: readonly (MonthCalendarDay | null)[];
  readonly selected: string;
  readonly today: string;
  readonly onSelect: (iso: string) => void;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onToday: () => void;
}

const toneClasses: Record<CalendarDayTone, string> = {
  default: "bg-background text-foreground",
  tour: "border-primary bg-primary text-primary-foreground",
  available: "border-primary/25 bg-primary/10 text-foreground",
  unavailable: "border-destructive/20 bg-destructive/10 text-foreground",
  full: "border-foreground bg-foreground text-background",
  partial: "border-[color:var(--gold)]/50 bg-[color:var(--gold)]/15 text-foreground",
};

export function MonthCalendar({
  monthLabel,
  days,
  selected,
  today,
  onSelect,
  onPrevious,
  onNext,
  onToday,
}: MonthCalendarProps) {
  return (
    <section aria-label={`${monthLabel} calendar`}>
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={onPrevious} aria-label="Previous month">
          <ChevronLeft aria-hidden />
        </Button>
        <div className="min-w-0 text-center">
          <p className="font-[family-name:var(--font-editorial)] text-[20px] leading-tight">{monthLabel}</p>
          <Button variant="link" className="h-7 px-2 text-xs" onClick={onToday}>Today</Button>
        </div>
        <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={onNext} aria-label="Next month">
          <ChevronRight aria-hidden />
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-7 text-center text-[11px] uppercase text-muted-foreground">
        {[
          ["M", "Monday"], ["T", "Tuesday"], ["W", "Wednesday"], ["T", "Thursday"],
          ["F", "Friday"], ["S", "Saturday"], ["S", "Sunday"],
        ].map(([short, full], index) => <span key={`${full}-${index}`} aria-label={full}>{short}</span>)}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) return <span key={`empty-${index}`} aria-hidden />;
          const tone = date.tone ?? "default";
          return (
            <Button
              key={date.iso}
              variant="outline"
              onClick={() => onSelect(date.iso)}
              aria-label={date.label ?? date.iso}
              aria-pressed={selected === date.iso}
              className={cn(
                "relative h-auto min-h-11 min-w-0 rounded-sm p-0 text-sm shadow-none",
                toneClasses[tone],
                selected === date.iso && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              )}
            >
              <span>{date.day}</span>
              {typeof date.count === "number" && date.count > 0 ? (
                <span className="absolute bottom-0.5 right-1 text-[11px] font-semibold leading-none">{date.count}</span>
              ) : null}
              {date.iso === today ? <span className="absolute bottom-1 left-1 h-1 w-1 rounded-full bg-current" aria-hidden /> : null}
            </Button>
          );
        })}
      </div>
    </section>
  );
}