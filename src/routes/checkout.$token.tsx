/**
 * Bespoke checkout — confirms a Studio v2 custom itinerary draft.
 * Reached via the Secure CTA at the end of Studio.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getCustomBookingDraft,
  confirmCustomBookingDraft,
} from "@/lib/studio-v2/bookings.functions";
import { trackBuilderEvent } from "@/lib/builder-analytics";

export const Route = createFileRoute("/checkout/$token")({
  head: () => ({
    meta: [
      { title: "Confirm your bespoke day | YES Experiences" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CheckoutPage,
});

interface DraftRow {
  draft_token: string;
  profile: Record<string, unknown>;
  region: string | null;
  archetype: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stops: any[];
  total_minutes: number;
  total_drive_minutes: number;
  total_km: number;
  status: string;
  guests: number | null;
}

function CheckoutPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const getDraft = useServerFn(getCustomBookingDraft);
  const confirm = useServerFn(confirmCustomBookingDraft);

  const [draft, setDraft] = useState<DraftRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState(2);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let cancelled = false;
    getDraft({ data: { draftToken: token } })
      .then((r) => {
        if (cancelled) return;
        if (r.draft) {
          const d = r.draft as DraftRow;
          setDraft(d);
          if (d.guests) setGuests(d.guests);
          void trackBuilderEvent("studio_v2_checkout_view", {
            draftToken: token,
            stops: d.stops?.length ?? 0,
          });
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn't load this draft. The link may have expired.");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [getDraft, token]);

  // Drop-off telemetry — fires once if the user leaves before submitting.
  useEffect(() => {
    if (!draft || done) return;
    const onLeave = () => {
      void trackBuilderEvent("studio_v2_checkout_abandon", {
        draftToken: token,
        hadName: Boolean(name.trim()),
        hadEmail: Boolean(email.trim()),
      });
    };
    window.addEventListener("pagehide", onLeave, { once: true });
    return () => window.removeEventListener("pagehide", onLeave);
  }, [draft, done, token, name, email]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await confirm({
        data: {
          draftToken: token,
          contactName: name.trim(),
          contactEmail: email.trim(),
          contactPhone: phone.trim() || undefined,
          preferredDate: date || undefined,
          guests,
          notes: notes.trim() || undefined,
        },
      });
      void trackBuilderEvent("studio_v2_booking_submit", { draftToken: token });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <p style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}>
          Loading your bespoke day…
        </p>
      </Shell>
    );
  }
  if (!draft) {
    return (
      <Shell>
        <h1 className="text-[24px]" style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 700 }}>
          Draft not found.
        </h1>
        <p className="mt-3" style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}>
          {error ?? "Return to Studio and design a new day."}
        </p>
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="mt-6 inline-flex items-center gap-2 rounded-[2px] border px-5 py-3 text-[12px] uppercase tracking-[0.22em]"
          style={{ borderColor: "var(--charcoal)", color: "var(--charcoal)", fontWeight: 600 }}
        >
          Back to home
        </button>
      </Shell>
    );
  }
  if (done) {
    return (
      <Shell>
        <p
          className="text-[10.5px] uppercase tracking-[0.32em]"
          style={{ color: "color-mix(in oklab, var(--gold) 82%, var(--charcoal))", fontWeight: 700 }}
        >
          Received
        </p>
        <h1
          className="mt-3 text-[28px] leading-[1.1] sm:text-[36px]"
          style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 700 }}
        >
          Your day is in our hands.
        </h1>
        <p
          className="mt-4 text-[16px] leading-[1.5]"
          style={{ color: "color-mix(in oklab, var(--charcoal) 75%, transparent)" }}
        >
          A local designer will confirm timings and finalise the booking within a few hours. We'll
          reply to <strong>{email}</strong> — keep an eye on your inbox.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <p
        className="text-[10.5px] uppercase tracking-[0.32em]"
        style={{ color: "color-mix(in oklab, var(--gold) 82%, var(--charcoal))", fontWeight: 700 }}
      >
        Bespoke day · ready to confirm
      </p>
      <h1
        className="mt-3 text-[26px] leading-[1.1] sm:text-[34px]"
        style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 700 }}
      >
        A few details to lock it in.
      </h1>
      <p
        className="mt-3 text-[14px] italic"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "color-mix(in oklab, var(--charcoal) 70%, transparent)",
        }}
      >
        {draft.stops.length} real stops · {Math.round((draft.total_minutes / 60) * 10) / 10} h experience ·{" "}
        {draft.total_drive_minutes} min driving · {draft.total_km} km
      </p>

      <button
        type="button"
        onClick={() => {
          void trackBuilderEvent("studio_v2_checkout_back_to_refine", { draftToken: token });
          if (window.history.length > 1) window.history.back();
          else navigate({ to: "/" });
        }}
        className="mt-4 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.24em] underline-offset-4 hover:underline"
        style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)", fontWeight: 600 }}
      >
        ← Back to refine
      </button>

      {/* Itinerary recap */}
      <ol
        className="mt-6 space-y-2 border-l pl-4"
        style={{ borderColor: "color-mix(in oklab, var(--gold) 40%, transparent)" }}
      >
        {draft.stops.map((s, i) => (
          <li key={s.key ?? i} className="text-[14px]">
            <span style={{ fontWeight: 600 }}>{i + 1}. {s.label}</span>
            {s.tag && (
              <span
                className="ml-2 text-[10.5px] uppercase tracking-[0.22em]"
                style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)", fontWeight: 600 }}
              >
                · {s.tag}
              </span>
            )}
          </li>
        ))}
      </ol>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field label="Name *">
          <input
            required type="text" value={name} onChange={(e) => setName(e.target.value)}
            maxLength={120} autoComplete="name" className={inputCls} style={inputStyle}
          />
        </Field>
        <Field label="Email *">
          <input
            required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            maxLength={160} autoComplete="email" className={inputCls} style={inputStyle}
          />
        </Field>
        <Field label="Phone (optional)">
          <input
            type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            maxLength={40} autoComplete="tel" className={inputCls} style={inputStyle}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Preferred date">
            <input
              type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className={inputCls} style={inputStyle}
            />
          </Field>
          <Field label="Guests">
            <input
              type="number" min={1} max={40} value={guests}
              onChange={(e) => setGuests(Math.max(1, Math.min(40, Number(e.target.value) || 1)))}
              className={inputCls} style={inputStyle}
            />
          </Field>
        </div>
        <Field label="Anything we should know? (optional)">
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={3}
            className={inputCls} style={inputStyle}
          />
        </Field>

        {error && (
          <p className="text-[13px]" style={{ color: "var(--charcoal)" }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !name.trim() || !email.trim()}
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-[2px] px-6 py-4 transition disabled:opacity-40"
          style={{
            background: "color-mix(in oklab, var(--gold) 92%, var(--charcoal))",
            color: "var(--charcoal)",
            minHeight: 56,
            fontFamily: "var(--font-sans, Inter), sans-serif",
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          {submitting ? "Sending…" : "Confirm my bespoke day"}
        </button>
        <p
          className="text-center text-[12px] italic"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
          }}
        >
          A local designer will confirm timings before any charge.
        </p>
      </form>
    </Shell>
  );
}

const inputCls =
  "w-full rounded-[2px] border bg-transparent px-4 py-3 text-[15px] focus-visible:outline-none focus-visible:ring-2";
const inputStyle: React.CSSProperties = {
  borderColor: "color-mix(in oklab, var(--charcoal) 18%, transparent)",
  color: "var(--charcoal)",
  fontFamily: "var(--font-sans, Inter), sans-serif",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="mb-1.5 block text-[10.5px] uppercase tracking-[0.28em]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)", fontWeight: 600 }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="mx-auto min-h-screen w-full max-w-2xl px-5 py-12 sm:px-8 sm:py-16"
      style={{ background: "var(--ivory)", color: "var(--charcoal)" }}
    >
      {children}
    </main>
  );
}
