import { useMemo } from "react";
import { CalendarDays } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import {
  isStudioBookingDateAllowed,
  minimumStudioBookingDateIso,
} from "@/components/studio-v3/dateGuards";
import { formatExactLabel } from "@/components/studio-v3/DatePhase";
import { StepActions, StepHeading } from "@/components/studio-v3/LivingAtlasPreviewPrimitives";

function dateFromIso(iso: string | null): Date | undefined {
  if (!iso) return undefined;
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function isoFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function LivingAtlasDateStep({
  selectedDate,
  onChange,
  onBack,
  onContinue,
}: {
  selectedDate: string | null;
  onChange: (iso: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const minimumIso = useMemo(() => minimumStudioBookingDateIso(), []);
  const minimumDate = useMemo(() => dateFromIso(minimumIso)!, [minimumIso]);
  const selected = useMemo(() => dateFromIso(selectedDate), [selectedDate]);

  return (
    <div>
      <StepHeading
        eyebrow="Choose the day"
        title="When should Portugal take shape?"
        copy="The date guides the route, opening schedules and the moments that can honestly belong in your day."
      />

      <div
        className="mx-auto mt-8 max-w-md rounded-2xl border p-3 sm:p-5"
        style={{
          borderColor: "color-mix(in oklab, var(--gold) 34%, transparent)",
          background: "color-mix(in oklab, var(--ivory) 5%, transparent)",
        }}
      >
        <div
          className="mb-3 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ color: "var(--gold)" }}
        >
          <CalendarDays size={14} aria-hidden /> Your travel date
        </div>
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? minimumDate}
          disabled={{ before: minimumDate }}
          onSelect={(date) => {
            if (!date) return;
            const iso = isoFromDate(date);
            if (isStudioBookingDateAllowed(iso)) onChange(iso);
          }}
          showOutsideDays={false}
          className="pointer-events-auto mx-auto rounded-xl bg-[color:var(--ivory)] text-[color:var(--charcoal)]"
        />
        <p
          data-testid="living-atlas-min-date-note"
          className="mt-3 text-center text-[11.5px] leading-relaxed"
          style={{ color: "color-mix(in oklab, var(--ivory) 66%, transparent)" }}
        >
          Private days are confirmed with your host, so the earliest date we can take is{" "}
          <strong style={{ color: "var(--ivory)", fontWeight: 600 }}>
            {formatExactLabel(minimumIso)}
          </strong>{" "}
          — three days ahead, counted in Lisbon time. Checkout applies the same rule.
        </p>
        {selectedDate ? (
          <p
            className="mt-3 text-center text-[13px] italic"
            style={{
              fontFamily: "var(--font-editorial)",
              color: "color-mix(in oklab, var(--ivory) 74%, transparent)",
            }}
          >
            {formatExactLabel(selectedDate)}
          </p>
        ) : null}
      </div>

      <StepActions
        onBack={onBack}
        onContinue={onContinue}
        disabled={!selectedDate || !isStudioBookingDateAllowed(selectedDate)}
      />
    </div>
  );
}
