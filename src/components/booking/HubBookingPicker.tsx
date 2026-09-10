import { useState } from "react";

import { SimpleBookingForm } from "@/components/SimpleBookingForm";
import { signatureTours } from "@/data/signatureTours";

/**
 * HubBookingPicker — pick one of the real Signature days, then reserve it
 * with the standard booking form (server-resolved pricing, instant
 * confirmation). No pricing or availability logic lives here.
 */
export function HubBookingPicker({ tourIds }: { tourIds: readonly string[] }) {
  const tours = tourIds
    .map((id) => signatureTours.find((t) => t.id === id))
    .filter((t): t is (typeof signatureTours)[number] => Boolean(t));
  const [selected, setSelected] = useState(tours[0]?.id ?? "");
  const tour = tours.find((t) => t.id === selected) ?? tours[0];
  if (!tour) return null;

  return (
    <div>
      <fieldset className="border-0 p-0 m-0">
        <legend className="font-sans text-[10.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)]">
          Choose your day
        </legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {tours.map((t) => {
            const active = t.id === tour.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t.id)}
                aria-pressed={active}
                className={[
                  "min-h-[44px] rounded-[2px] border px-4 py-2 text-left font-sans text-[12.5px] leading-tight transition-colors duration-200",
                  active
                    ? "border-[color:var(--teal)] bg-[color:var(--teal)] text-[color:var(--ivory)]"
                    : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--charcoal-soft)] hover:border-[color:var(--gold)]",
                ].join(" ")}
              >
                {t.title.split(" — ")[0]}
                <span className="block text-[11px] opacity-80">
                  {t.durationHours} · from €{t.priceFrom} pp
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-8">
        <SimpleBookingForm tour={tour} />
      </div>
    </div>
  );
}
