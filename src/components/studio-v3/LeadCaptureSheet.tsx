import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createStudioV3Lead } from "@/lib/studio-v3/leads.functions";
import {
  CONSIDERATIONS,
  LANGUAGES,
  PICKUPS,
  type StudioV3State,
} from "./types";

export type LeadIntent = "book" | "refine";

interface Props {
  open: boolean;
  intent: LeadIntent;
  state: StudioV3State;
  onClose: () => void;
}

/**
 * Studio V3 — LeadCaptureSheet.
 *
 * Mobile-first bottom sheet.
 *
 * In `book` mode (after "Say YES to this Signature"), the sheet expands a
 * "Confirm the practical details" section that collects/confirms exact or
 * preferred date, street pickup address, guests, phone/WhatsApp, language,
 * special requests, and mobility/dietary notes. No payment, no pricing —
 * practical details only. Everything is stored inside the existing
 * `state` JSON blob of `studio_v3_leads` (no schema change), and also
 * summarised into `contact_note` so the YES team sees it inline.
 *
 * In `refine` mode the sheet stays minimal — name/email/phone/note — so
 * the user can ask for adjustments without a checkout-y feel.
 */
export function LeadCaptureSheet({ open, intent, state, onClose }: Props) {
  const submit = useServerFn(createStudioV3Lead);

  // Prefills from Studio state
  const prefillPickupArea = useMemo(() => {
    if (!state.pickup) return "";
    const opt = PICKUPS.find((p) => p.id === state.pickup);
    return opt?.label ?? "";
  }, [state.pickup]);

  const prefillLanguage = state.language ?? "en";
  const prefillGuests = state.guests ?? 2;
  const prefillDateMode = state.dateMode ?? (state.dateExact ? "exact" : "flexible");
  const prefillDateExact = state.dateExact ?? "";

  const prefillConsiderations = useMemo(() => {
    if (!state.considerations || state.considerations.length === 0) return "";
    const labels = state.considerations
      .filter((c) => c !== "none")
      .map((c) => CONSIDERATIONS.find((o) => o.id === c)?.label ?? c);
    return labels.join(", ");
  }, [state.considerations]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  // Practical details (book mode only)
  const [dateMode, setDateMode] = useState<"exact" | "flexible" | "undecided">(
    prefillDateMode,
  );
  const [dateExact, setDateExact] = useState<string>(prefillDateExact);
  const [dateNote, setDateNote] = useState<string>("");
  const [pickupAddress, setPickupAddress] = useState<string>(prefillPickupArea);
  const [guests, setGuests] = useState<number>(prefillGuests);
  const [language, setLanguage] = useState<string>(prefillLanguage);
  const [considerationsNote, setConsiderationsNote] = useState<string>(
    prefillConsiderations,
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setErrorMsg(null);
      setDone(false);
      // Re-sync prefills each time the sheet opens.
      setDateMode(prefillDateMode);
      setDateExact(prefillDateExact);
      setPickupAddress(prefillPickupArea);
      setGuests(prefillGuests);
      setLanguage(prefillLanguage);
      setConsiderationsNote(prefillConsiderations);

      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const t = window.setTimeout(() => firstFieldRef.current?.focus(), 80);
      return () => {
        document.body.style.overflow = prev;
        window.clearTimeout(t);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const isBook = intent === "book";

  const headline = isBook ? "Say YES to this Signature" : "Refine with YES first";
  const intro = isBook
    ? "Leave your details and confirm a few practicalities. Nothing is reserved until YES confirms availability with you."
    : "Tell YES what you'd like to adjust. We'll come back with options.";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedPickup = pickupAddress.trim();
    const trimmedDateNote = dateNote.trim();
    const trimmedConsiderations = considerationsNote.trim();
    const trimmedFreeNote = note.trim();

    if (!trimmedName) {
      setErrorMsg("Please enter your name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg("Please enter a valid email.");
      return;
    }
    if (isBook && !trimmedPhone) {
      setErrorMsg("Please share a phone or WhatsApp number so YES can confirm with you.");
      return;
    }
    if (isBook && dateMode === "exact" && !dateExact) {
      setErrorMsg("Please pick your exact date, or switch to flexible.");
      return;
    }

    // Practical details captured for the YES team. Stored inside the JSON
    // `state` blob (no schema change) and summarised into `contact_note`.
    const practical = isBook
      ? {
          dateMode,
          dateExact: dateMode === "exact" ? dateExact : null,
          dateNote: dateMode !== "exact" ? trimmedDateNote || null : null,
          pickupAddress: trimmedPickup || null,
          guests,
          phone: trimmedPhone,
          language,
          specialRequests: trimmedFreeNote || null,
          considerationsNote: trimmedConsiderations || null,
        }
      : null;

    const composedState: Record<string, unknown> = {
      ...(state as unknown as Record<string, unknown>),
      leadMode: intent,
      editedStops: state.editedRoutePoints ?? null,
      ...(practical ? { practical } : {}),
    };

    // Build a human-readable note summary the YES team can read at a glance.
    const noteParts: string[] = [];
    if (trimmedFreeNote) noteParts.push(trimmedFreeNote);
    if (isBook && practical) {
      const lines: string[] = ["— Practical details —"];
      if (practical.dateExact) lines.push(`Date: ${practical.dateExact} (exact)`);
      else if (practical.dateNote) lines.push(`Date: ${practical.dateNote} (${practical.dateMode})`);
      else lines.push(`Date: ${practical.dateMode}`);
      if (practical.pickupAddress) lines.push(`Pickup: ${practical.pickupAddress}`);
      lines.push(`Guests: ${practical.guests}`);
      lines.push(`Phone/WhatsApp: ${practical.phone}`);
      lines.push(`Language: ${practical.language}`);
      if (practical.considerationsNote)
        lines.push(`Mobility/dietary: ${practical.considerationsNote}`);
      noteParts.push(lines.join("\n"));
    }
    const composedNote = noteParts.join("\n\n").slice(0, 2000);

    setSubmitting(true);
    try {
      await submit({
        data: {
          intent,
          journeyTitle: state.journeyTitle ?? null,
          skeletonTourKey: state.tourId ?? null,
          contactName: trimmedName,
          contactEmail: trimmedEmail,
          contactPhone: trimmedPhone || undefined,
          contactNote: composedNote || undefined,
          state: composedState,
        },
      });
      setDone(true);
    } catch (err) {
      console.error("[LeadCaptureSheet] submit failed", err);
      setErrorMsg(
        "Something went wrong. Please try again or message YES directly.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    borderColor: "color-mix(in oklab, var(--charcoal) 22%, transparent)",
    color: "var(--charcoal)",
  };
  const inputClass =
    "w-full px-3 py-3 min-h-[44px] text-[15px] rounded-md border bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-sheet-title"
      data-testid="studio-v3-lead-sheet"
      data-state={done ? "sent" : submitting ? "submitting" : errorMsg ? "error" : "idle"}
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close"
        onClick={() => !submitting && onClose()}
        className="absolute inset-0 bg-black/55"
        style={{ animation: "studioV3FadeIn 220ms ease-out both" }}
      />

      {/* Sheet */}
      <div
        className="relative w-full sm:max-w-[480px] max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl"
        style={{
          background: "var(--ivory)",
          animation: "studioV3RiseIn 320ms ease-out both",
        }}
      >
        <button
          type="button"
          onClick={() => !submitting && onClose()}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex items-center justify-center w-11 h-11 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
          style={{ color: "var(--charcoal)" }}
        >
          <X size={18} aria-hidden />
        </button>

        <div className="px-6 pt-8 pb-7">
          {done ? (
            <div className="text-center py-6" data-testid="studio-v3-lead-sheet-confirmation">
              <p
                className="text-[11px] uppercase tracking-[0.26em] font-semibold"
                style={{ color: "var(--gold)" }}
              >
                — Received
              </p>
              <h2
                id="lead-sheet-title"
                className="mt-3 text-[22px] sm:text-[26px] leading-[1.2] font-bold"
                style={{ fontFamily: "var(--font-display)", color: "var(--charcoal)" }}
              >
                Thank you.
              </h2>
              <p
                className="mt-4 text-[14px] leading-[1.6] mx-auto max-w-[360px]"
                style={{ color: "color-mix(in oklab, var(--charcoal) 78%, transparent)" }}
              >
                {isBook
                  ? "YES will check availability and come back to you with the next step. Nothing is reserved yet."
                  : "YES will review your notes and come back with options."}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-7 inline-flex items-center gap-2 px-6 py-3 min-h-[44px] text-[11px] uppercase tracking-[0.24em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <p
                className="text-[11px] uppercase tracking-[0.26em] font-semibold"
                style={{ color: "var(--gold)" }}
              >
                — {isBook ? "Say YES" : "Refine"}
              </p>
              <h2
                id="lead-sheet-title"
                className="mt-2 text-[22px] sm:text-[26px] leading-[1.2] font-bold"
                style={{ fontFamily: "var(--font-display)", color: "var(--charcoal)" }}
              >
                {headline}
              </h2>
              <p
                className="mt-3 text-[13.5px] leading-[1.55]"
                style={{ color: "color-mix(in oklab, var(--charcoal) 72%, transparent)" }}
              >
                {intro}
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                <Field label="Name" htmlFor="lead-name" required>
                  <input
                    ref={firstFieldRef}
                    id="lead-name"
                    type="text"
                    autoComplete="name"
                    required
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Email" htmlFor="lead-email" required>
                  <input
                    id="lead-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    required
                    maxLength={255}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  />
                </Field>

                <Field
                  label={isBook ? "WhatsApp / phone" : "WhatsApp / phone (optional)"}
                  htmlFor="lead-phone"
                  required={isBook}
                >
                  <input
                    id="lead-phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength={40}
                    required={isBook}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  />
                </Field>

                {isBook ? (
                  <section
                    aria-labelledby="practical-title"
                    className="mt-6 pt-5 border-t"
                    style={{
                      borderColor:
                        "color-mix(in oklab, var(--charcoal) 14%, transparent)",
                    }}
                  >
                    <p
                      className="text-[11px] uppercase tracking-[0.26em] font-semibold"
                      style={{ color: "var(--gold)" }}
                    >
                      — Practical details
                    </p>
                    <h3
                      id="practical-title"
                      className="mt-2 text-[17px] leading-[1.3] font-semibold"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: "var(--charcoal)",
                      }}
                    >
                      Confirm the practical details
                    </h3>
                    <p
                      className="mt-2 text-[12.5px] leading-[1.5]"
                      style={{
                        color:
                          "color-mix(in oklab, var(--charcoal) 65%, transparent)",
                      }}
                    >
                      We'll use this to check availability and prepare your
                      private proposal.
                    </p>

                    <div className="mt-4 space-y-4">
                      <Field label="Date" htmlFor="lead-date-mode">
                        <div className="flex flex-wrap gap-2">
                          {(
                            [
                              { id: "exact", label: "Exact date" },
                              { id: "flexible", label: "Flexible / preferred" },
                              { id: "undecided", label: "Still deciding" },
                            ] as const
                          ).map((opt) => {
                            const active = dateMode === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setDateMode(opt.id)}
                                aria-pressed={active}
                                className="px-3 py-2 min-h-[40px] rounded-full text-[12px] font-medium border focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                                style={{
                                  background: active
                                    ? "var(--charcoal)"
                                    : "transparent",
                                  color: active
                                    ? "var(--ivory)"
                                    : "var(--charcoal)",
                                  borderColor: active
                                    ? "var(--charcoal)"
                                    : "color-mix(in oklab, var(--charcoal) 24%, transparent)",
                                }}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                        {dateMode === "exact" ? (
                          <input
                            id="lead-date-mode"
                            type="date"
                            value={dateExact}
                            onChange={(e) => setDateExact(e.target.value)}
                            className={`${inputClass} mt-3`}
                            style={inputStyle}
                          />
                        ) : (
                          <input
                            id="lead-date-mode"
                            type="text"
                            placeholder="e.g. last week of June, weekends only"
                            maxLength={200}
                            value={dateNote}
                            onChange={(e) => setDateNote(e.target.value)}
                            className={`${inputClass} mt-3`}
                            style={inputStyle}
                          />
                        )}
                      </Field>

                      <Field
                        label="Pickup address"
                        htmlFor="lead-pickup"
                      >
                        <input
                          id="lead-pickup"
                          type="text"
                          autoComplete="street-address"
                          maxLength={240}
                          placeholder={
                            prefillPickupArea
                              ? `Street, building (area: ${prefillPickupArea})`
                              : "Hotel or street address"
                          }
                          value={pickupAddress}
                          onChange={(e) => setPickupAddress(e.target.value)}
                          className={inputClass}
                          style={inputStyle}
                        />
                      </Field>

                      <Field label="Guests" htmlFor="lead-guests">
                        <input
                          id="lead-guests"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={40}
                          value={guests}
                          onChange={(e) =>
                            setGuests(
                              Math.max(
                                1,
                                Math.min(40, Number(e.target.value) || 1),
                              ),
                            )
                          }
                          className={inputClass}
                          style={inputStyle}
                        />
                        {state.guestsInferred ? (
                          <p
                            className="mt-1.5 text-[11.5px] leading-[1.45]"
                            style={{
                              color:
                                "color-mix(in oklab, var(--charcoal) 60%, transparent)",
                            }}
                          >
                            We assumed {prefillGuests} — please confirm.
                          </p>
                        ) : null}
                      </Field>

                      <Field label="Preferred language" htmlFor="lead-language">
                        <select
                          id="lead-language"
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className={inputClass}
                          style={inputStyle}
                        >
                          {LANGUAGES.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field
                        label="Mobility / dietary considerations (optional)"
                        htmlFor="lead-considerations"
                      >
                        <textarea
                          id="lead-considerations"
                          rows={2}
                          maxLength={500}
                          placeholder="e.g. vegetarian, reduced mobility, allergies"
                          value={considerationsNote}
                          onChange={(e) => setConsiderationsNote(e.target.value)}
                          className="w-full px-3 py-3 text-[14.5px] rounded-md border bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] resize-none"
                          style={inputStyle}
                        />
                      </Field>
                    </div>
                  </section>
                ) : null}

                <Field
                  label={
                    isBook
                      ? "Special requests / final note (optional)"
                      : "What would you like to adjust? (optional)"
                  }
                  htmlFor="lead-note"
                >
                  <textarea
                    id="lead-note"
                    rows={3}
                    maxLength={1500}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-3 text-[14.5px] rounded-md border bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] resize-none"
                    style={inputStyle}
                  />
                </Field>

                {errorMsg ? (
                  <p
                    role="alert"
                    className="text-[12.5px] leading-[1.45]"
                    style={{ color: "#b3261e" }}
                  >
                    {errorMsg}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className={`mt-2 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] text-[11px] uppercase tracking-[0.24em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] ${
                    submitting ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                  style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
                >
                  {submitting
                    ? "Sending…"
                    : isBook
                      ? "Send to YES"
                      : "Request refinements"}{" "}
                  {!submitting ? <ArrowRight size={14} aria-hidden /> : null}
                </button>

                <p
                  className="text-[11px] leading-[1.5] text-center"
                  style={{
                    color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
                  }}
                >
                  {isBook
                    ? "Nothing is reserved until YES confirms availability with you."
                    : "We use your details only to reply about this journey."}
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-[11px] uppercase tracking-[0.22em] font-semibold mb-1.5"
        style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
      >
        {label}
        {required ? (
          <span aria-hidden style={{ color: "var(--gold)" }}>
            {" "}
            *
          </span>
        ) : null}
      </label>
      {children}
    </div>
  );
}
