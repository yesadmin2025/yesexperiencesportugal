import { useMemo, useState } from "react";
import { Calendar, Users, Clock, MessageCircle, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { SignatureTour } from "@/data/signatureTours";
import { whatsappHref } from "@/components/WhatsAppFab";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";

/**
 * SimpleBookingForm — the *reserve as-is* path.
 *
 * No swapping, no add-ons, no pace dial. Just date, pickup time,
 * guests and language → confirm. Tailoring lives on a separate
 * page (`/tours/$tourId/tailor`).
 */
export function SimpleBookingForm({ tour }: { tour: SignatureTour }) {
  const [date, setDate] = useState("");
  const [pickup, setPickup] = useState<"08:00" | "09:00" | "10:00">("09:00");
  const [guests, setGuests] = useState(2);
  const [language, setLanguage] = useState<"en" | "pt" | "es" | "fr">("en");

  const message = useMemo(() => {
    const lines = [
      `Hi! I'd like to reserve "${tour.title}" as designed.`,
      `• Date: ${date || "flexible"}`,
      `• Pickup time: ${pickup}`,
      `• Guests: ${guests}`,
      `• Guide language: ${language.toUpperCase()}`,
      `• Price from €${tour.priceFrom} pp`,
    ];
    return lines.join("\n");
  }, [tour, date, pickup, guests, language]);

  return (
    <div className="border border-[color:var(--border)] bg-[color:var(--card)] p-5 sm:p-7">
      <Eyebrow>Reserve this day</Eyebrow>
      <SectionTitle size="compact" spacing="tight">
        Book the Signature, <SectionTitle.Em>as designed</SectionTitle.Em>
      </SectionTitle>
      <p className="mt-2 text-sm text-[color:var(--charcoal-soft)]">
        The full Signature — route, story and local guide intact. Pick a day, we confirm in real time.
      </p>

      {/* Date + pickup */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Date" icon={<Calendar size={14} />}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-transparent border border-[color:var(--border)] px-3 py-2.5 text-sm focus:outline-none focus:border-[color:var(--gold)] min-h-[44px]"
          />
        </Field>
        <Field label="Pickup time" icon={<Clock size={14} />}>
          <div className="grid grid-cols-3 border border-[color:var(--border)]">
            {(["08:00", "09:00", "10:00"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPickup(t)}
                aria-pressed={pickup === t}
                className={[
                  "py-2.5 text-xs tracking-[0.18em] transition-colors",
                  pickup === t
                    ? "bg-[color:var(--charcoal)] text-[color:var(--ivory)]"
                    : "text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]",
                ].join(" ")}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {/* Guests + language */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Guests" icon={<Users size={14} />}>
          <div className="flex items-center border border-[color:var(--border)] min-h-[44px]">
            <button
              type="button"
              onClick={() => setGuests((g) => Math.max(1, g - 1))}
              className="px-3 py-2.5 text-lg leading-none text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
              aria-label="Fewer guests"
            >
              −
            </button>
            <span className="flex-1 text-center text-sm">{guests}</span>
            <button
              type="button"
              onClick={() => setGuests((g) => Math.min(12, g + 1))}
              className="px-3 py-2.5 text-lg leading-none text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
              aria-label="More guests"
            >
              +
            </button>
          </div>
        </Field>
        <Field label="Guide language">
          <div className="grid grid-cols-4 border border-[color:var(--border)]">
            {(["en", "pt", "es", "fr"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLanguage(l)}
                aria-pressed={language === l}
                className={[
                  "py-2.5 text-xs uppercase tracking-[0.18em] transition-colors",
                  language === l
                    ? "bg-[color:var(--charcoal)] text-[color:var(--ivory)]"
                    : "text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]",
                ].join(" ")}
              >
                {l}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {/* Price anchor */}
      <div className="mt-6 flex items-baseline justify-between border-t border-[color:var(--border)] pt-4">
        <span className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
          From
        </span>
        <span className="serif text-[1.4rem] text-[color:var(--charcoal)]">
          €{tour.priceFrom}
          <span className="ml-1 text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
            / pp
          </span>
        </span>
      </div>

      <a
        href={whatsappHref(message)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex w-full items-center justify-center gap-2 bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] text-[color:var(--ivory)] px-5 py-3.5 text-sm tracking-wide transition-all min-h-[52px]"
      >
        <Sparkles size={15} /> Confirm in real time
      </a>
      <p className="mt-2 text-[11px] text-[color:var(--charcoal-soft)] text-center">
        Instant confirmation · Final price shown before payment
      </p>

      <div className="mt-5 pt-4 border-t border-[color:var(--border)] text-center">
        <p className="text-[12px] text-[color:var(--charcoal-soft)]">
          Want to adjust a few details?
        </p>
        <Link
          to="/tours/$tourId/tailor"
          params={{ tourId: tour.id }}
          className="mt-1 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-[color:var(--teal)] hover:text-[color:var(--gold)]"
        >
          <MessageCircle size={12} /> Tailor this Signature
        </Link>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-[color:var(--charcoal-soft)] mb-1.5">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}
