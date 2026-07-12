import { useMemo, useState } from "react";
import { MessageCircle, Calendar, Gauge, Plus, Check } from "lucide-react";
import type { SignatureTour } from "@/data/signatureTours";
import { whatsappHref } from "@/components/WhatsAppFab";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { TravellerCompositionPicker } from "@/components/booking/TravellerCompositionPicker";
import {
  type TravellerComposition,
  EMPTY_COMPOSITION,
  totalParticipants,
} from "@/lib/pricing/travellerComposition";

/**
 * Minimal "Tailor this tour" panel.
 *
 * Slice B: emits `TravellerComposition` (adults + minorAges) instead of a
 * flat guest count. Backward compat: legacy adults-only drafts stay valid
 * because `EMPTY_COMPOSITION` = { adults: 1, minorAges: [] }.
 */
export function SimpleTailorForm({ tour }: { tour: SignatureTour }) {
  const allStops = useMemo(() => tour.pace, [tour.pace]);

  const [date, setDate] = useState("");
  const [composition, setComposition] = useState<TravellerComposition>({
    ...EMPTY_COMPOSITION,
    adults: 2,
  });
  const [pace, setPace] = useState<"relaxed" | "balanced" | "packed">("balanced");
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [addons, setAddons] = useState<Set<string>>(new Set(["pickup"]));
  const [language, setLanguage] = useState<"en" | "pt">("en");
  const [notes, setNotes] = useState("");

  const toggleStop = (s: string) => {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };
  const toggleAddon = (a: string) => {
    setAddons((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  };

  const message = useMemo(() => {
    const kept = allStops.filter((s) => !skipped.has(s));
    const total = totalParticipants(composition);
    const guestsLine =
      composition.minorAges.length > 0
        ? `${composition.adults} adult${composition.adults === 1 ? "" : "s"} + minors aged ${composition.minorAges.join(", ")} (total ${total})`
        : `${composition.adults}`;
    const lines = [
      `Hi YES — I'd like to tailor the ${tour.title} (${tour.region}).`,
      `• Date: ${date || "flexible"}`,
      `• Guests: ${guestsLine}`,
      `• Pace: ${pace}`,
      `• Stops to keep: ${kept.length ? kept.join(", ") : "guide's choice"}`,
      skipped.size ? `• Skip: ${[...skipped].join(", ")}` : "",
      addons.size ? `• Add-ons: ${[...addons].join(", ")}` : "",
      `• Guide language: ${language.toUpperCase()}`,
      notes ? `• Notes: ${notes}` : "",
    ].filter(Boolean);
    return lines.join("\n");
  }, [tour, date, composition, pace, skipped, addons, language, notes, allStops]);

  return (
    <div className="border border-[color:var(--border)] bg-[color:var(--card)] p-5 sm:p-7">
      <Eyebrow>Tailored Signature</Eyebrow>
      <SectionTitle size="compact" spacing="tight">
        Adjust a few <SectionTitle.Em>details</SectionTitle.Em>
      </SectionTitle>
      <p className="mt-2 text-sm text-[color:var(--charcoal-soft)]">
        Match this experience to your rhythm — the route, story and local guide stay intact.
      </p>

      {/* Date */}
      <div className="mt-6">
        <Field label="Date" icon={<Calendar size={14} />}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-transparent border border-[color:var(--border)] px-3 py-2.5 text-sm focus:outline-none focus:border-[color:var(--gold)]"
          />
        </Field>
      </div>

      {/* Travellers */}
      <div className="mt-4" data-testid="tailor-travellers">
        <TravellerCompositionPicker
          value={composition}
          onChange={setComposition}
          maxCapacity={12}
          minAdults={1}
        />
      </div>

      {/* Pace */}
      <Field label="Pace" icon={<Gauge size={14} />} className="mt-4">
        <div className="grid grid-cols-3 gap-2">
          {(["relaxed", "balanced", "packed"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPace(p)}
              aria-pressed={pace === p}
              className={[
                "px-3 py-2 text-xs uppercase tracking-[0.2em] border transition-colors",
                pace === p
                  ? "border-[color:var(--charcoal)] bg-[color:var(--charcoal)] text-[color:var(--ivory)]"
                  : "border-[color:var(--border)] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]",
              ].join(" ")}
            >
              {p}
            </button>
          ))}
        </div>
      </Field>

      {/* Stops */}
      <Field label="Stops" className="mt-4">
        <p className="text-xs text-[color:var(--charcoal-soft)] mb-2">
          Tap to skip any stop you'd rather replace with extra time elsewhere.
        </p>
        <div className="flex flex-wrap gap-2">
          {allStops.map((s) => {
            const kept = !skipped.has(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStop(s)}
                aria-pressed={kept}
                className={[
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-colors",
                  kept
                    ? "border-[color:var(--teal)] bg-[color:var(--teal)]/10 text-[color:var(--teal)]"
                    : "border-[color:var(--border)] text-[color:var(--charcoal-soft)] line-through",
                ].join(" ")}
              >
                {kept ? <Check size={11} /> : <Plus size={11} className="rotate-45" />}
                {s}
              </button>
            );
          })}
        </div>
      </Field>

      {/* Add-ons */}
      <Field label="Add-ons" className="mt-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "pickup", label: "Hotel pickup" },
            { id: "lunch", label: "Lunch upgrade" },
            { id: "wine", label: "Wine pairing" },
            { id: "photographer", label: "Photographer" },
            { id: "kids", label: "Kids' activities" },
          ].map((a) => {
            const on = addons.has(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleAddon(a.id)}
                aria-pressed={on}
                className={[
                  "px-3 py-1.5 text-xs border transition-colors",
                  on
                    ? "border-[color:var(--gold)] bg-[color:var(--gold)]/15 text-[color:var(--charcoal)]"
                    : "border-[color:var(--border)] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]",
                ].join(" ")}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </Field>

      {/* Language */}
      <Field label="Guide language" className="mt-4">
        <div className="flex flex-wrap gap-2">
          {(["en", "pt"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLanguage(l)}
              aria-pressed={language === l}
              className={[
                "px-3 py-1.5 text-xs uppercase tracking-[0.2em] border transition-colors",
                language === l
                  ? "border-[color:var(--charcoal)] bg-[color:var(--charcoal)] text-[color:var(--ivory)]"
                  : "border-[color:var(--border)] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]",
              ].join(" ")}
            >
              {l}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10.5px] leading-snug text-[color:var(--charcoal-soft)]">
          Spanish available on request — subject to guide availability.
        </p>
      </Field>

      {/* Notes */}
      <Field label="Anything else?" className="mt-4">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Allergies, anniversary, mobility needs, languages…"
          className="w-full bg-transparent border border-[color:var(--border)] px-3 py-2.5 text-sm focus:outline-none focus:border-[color:var(--gold)] resize-none"
        />
      </Field>

      <a
        href={whatsappHref(message)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] text-[color:var(--ivory)] px-5 py-3.5 text-sm tracking-wide transition-all"
      >
        <MessageCircle size={16} /> Confirm in real time
      </a>
      <p className="mt-2 text-[11px] text-[color:var(--charcoal-soft)] text-center">
        Confirm in real time — secured directly on this site.
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]/80 text-center">
        Reservations handled securely through our integrated booking system.
      </p>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
  className = "",
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-[color:var(--charcoal-soft)] mb-1.5">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}
