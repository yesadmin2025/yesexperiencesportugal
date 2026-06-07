import { useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createStudioV3Lead } from "@/lib/studio-v3/leads.functions";
import type { StudioV3State } from "./types";

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
 * Mobile-first bottom sheet. Captures name/email + optional phone/note
 * and persists a `studio_v3_leads` row via `createStudioV3Lead`.
 * No payment, no pricing, no Bokun — just a real lead for YES.
 */
export function LeadCaptureSheet({ open, intent, state, onClose }: Props) {
  const submit = useServerFn(createStudioV3Lead);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setErrorMsg(null);
      setDone(false);
      // Lock background scroll while sheet is open.
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      // Focus first field next tick.
      const t = window.setTimeout(() => firstFieldRef.current?.focus(), 80);
      return () => {
        document.body.style.overflow = prev;
        window.clearTimeout(t);
      };
    }
  }, [open]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const headline =
    intent === "book"
      ? "Secure this journey"
      : "Refine with YES first";
  const intro =
    intent === "book"
      ? "Leave your details and YES will confirm availability and final touches with you."
      : "Tell YES what you'd like to adjust. We'll come back with options.";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setErrorMsg("Please enter your name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg("Please enter a valid email.");
      return;
    }

    setSubmitting(true);
    try {
      await submit({
        data: {
          intent,
          journeyTitle: state.journeyTitle ?? null,
          skeletonTourKey: state.tourId ?? null,
          contactName: trimmedName,
          contactEmail: trimmedEmail,
          contactPhone: phone.trim() || undefined,
          contactNote: note.trim() || undefined,
          state: state as unknown as Record<string, unknown>,
        },
      });
      setDone(true);
    } catch (err) {
      console.error("[LeadCaptureSheet] submit failed", err);
      setErrorMsg(
        "Something went wrong. Please try again or message YES directly."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-sheet-title"
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
        {/* Close */}
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
            <div className="text-center py-6">
              <p
                className="text-[11px] uppercase tracking-[0.26em] font-semibold"
                style={{ color: "var(--gold)" }}
              >
                — Received
              </p>
              <h2
                id="lead-sheet-title"
                className="mt-3 text-[22px] sm:text-[26px] leading-[1.2] font-bold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--charcoal)",
                }}
              >
                Thank you.
              </h2>
              <p
                className="mt-4 text-[14px] leading-[1.6] mx-auto max-w-[360px]"
                style={{
                  color: "color-mix(in oklab, var(--charcoal) 78%, transparent)",
                }}
              >
                YES will review your journey and come back to you with the next
                step.
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
                — {intent === "book" ? "Secure" : "Refine"}
              </p>
              <h2
                id="lead-sheet-title"
                className="mt-2 text-[22px] sm:text-[26px] leading-[1.2] font-bold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--charcoal)",
                }}
              >
                {headline}
              </h2>
              <p
                className="mt-3 text-[13.5px] leading-[1.55]"
                style={{
                  color: "color-mix(in oklab, var(--charcoal) 72%, transparent)",
                }}
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
                    className="w-full px-3 py-3 min-h-[44px] text-[15px] rounded-md border bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                    style={{
                      borderColor:
                        "color-mix(in oklab, var(--charcoal) 22%, transparent)",
                      color: "var(--charcoal)",
                    }}
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
                    className="w-full px-3 py-3 min-h-[44px] text-[15px] rounded-md border bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                    style={{
                      borderColor:
                        "color-mix(in oklab, var(--charcoal) 22%, transparent)",
                      color: "var(--charcoal)",
                    }}
                  />
                </Field>

                <Field
                  label="WhatsApp / phone (optional)"
                  htmlFor="lead-phone"
                >
                  <input
                    id="lead-phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength={40}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-3 min-h-[44px] text-[15px] rounded-md border bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                    style={{
                      borderColor:
                        "color-mix(in oklab, var(--charcoal) 22%, transparent)",
                      color: "var(--charcoal)",
                    }}
                  />
                </Field>

                <Field
                  label={
                    intent === "refine"
                      ? "What would you like to adjust? (optional)"
                      : "Anything to add? (optional)"
                  }
                  htmlFor="lead-note"
                >
                  <textarea
                    id="lead-note"
                    rows={3}
                    maxLength={2000}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-3 text-[14.5px] rounded-md border bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] resize-none"
                    style={{
                      borderColor:
                        "color-mix(in oklab, var(--charcoal) 22%, transparent)",
                      color: "var(--charcoal)",
                    }}
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
                  style={{
                    background: "var(--charcoal)",
                    color: "var(--ivory)",
                  }}
                >
                  {submitting
                    ? "Sending…"
                    : intent === "book"
                      ? "Send to YES"
                      : "Request refinements"}{" "}
                  {!submitting ? <ArrowRight size={14} aria-hidden /> : null}
                </button>

                <p
                  className="text-[11px] leading-[1.5] text-center"
                  style={{
                    color:
                      "color-mix(in oklab, var(--charcoal) 55%, transparent)",
                  }}
                >
                  We use your details only to reply about this journey.
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
        style={{
          color: "color-mix(in oklab, var(--charcoal) 70%, transparent)",
        }}
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
