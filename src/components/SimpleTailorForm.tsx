import { useMemo, useState } from "react";
import { MessageCircle, Calendar, Users, Gauge, Plus, Check } from "lucide-react";
import type { SignatureTour } from "@/data/signatureTours";
import { whatsappHref } from "@/components/WhatsAppFab";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";

/**
 * Minimal "Tailor this tour" panel.
 *
 * Locks region, theme and overall storyline (the user already chose this
 * specific signature tour). Lets them tweak just the details a guide can
 * actually change on the day:
 *
 *   - Date
 *   - Group size
 *   - Pace (relaxed / balanced / packed)
 *   - Add-ons (lunch upgrade, hotel pickup, photographer, guide language)
 *   - Toggle individual stops on/off
 *
 * Submits as a pre-filled WhatsApp message — no booking engine required.
 */
export function SimpleTailorForm({ tour }: { tour: SignatureTour }) {
  // The stops we offer to toggle come from the tour's pace cues — they're
  // already short, human-readable and curated per tour.
  const allStops = useMemo(() => tour.pace, [tour.pace]);

  const [date, setDate] = useState("");
  const [guests, setGuests] = useState(2);
  const [pace, setPace] = useState<"relaxed" | "balanced" | "packed">("balanced");
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [addons, setAddons] = useState<Set<string>>(new Set(["pickup"]));
  const [language, setLanguage] = useState<"en" | "pt" | "es" | "fr">("en");
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
    const lines = [
      `Hi! I'd like to tailor "${tour.title}" (${tour.region}).`,
      `• Date: ${date || "flexible"}`,
      `• Guests: ${guests}`,
      `• Pace: ${pace}`,
      `• Stops to keep: ${kept.length ? kept.join(", ") : "guide's choice"}`,
      skipped.size ? `• Skip: ${[...skipped].join(", ")}` : "",
      addons.size ? `• Add-ons: ${[...addons].join(", ")}` : "",
      `• Guide language: ${language.toUpperCase()}`,
      notes ? `• Notes: ${notes}` : "",
    ].filter(Boolean);
    return lines.join("\n");
  }, [tour, date, guests, pace, skipped, addons, language, notes, allStops]);

  return (
    <div className="border border-[color:var(--border)] bg-[color:var(--card)] p-5 sm:p-7">
      <Eyebrow>Tailored Signature</Eyebrow>
      <SectionTitle size="compact" spacing="tight">
        Adjust a few <SectionTitle.Em>details</SectionTitle.Em>
      </SectionTitle>
      <p className="mt-2 text-sm text-[color:var(--charcoal-soft)]">
        Match this experience to your rhythm — the route, story and local guide stay intact.
      </p>

      {/* Date + guests */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Date" icon={<Calendar size={14} />}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-transparent border border-[color:var(--border)] px-3 py-2.5 text-sm focus:outline-none focus:border-[color:var(--gold)]"
          />
        </Field>
        <Field label="Guests" icon={<Users size={14} />}>
          <div className="flex items-center border border-[color:var(--border)]">
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

      {/* Stops to keep */}
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
          {(["en", "pt", "es", "fr"] as const).map((l) => (
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
