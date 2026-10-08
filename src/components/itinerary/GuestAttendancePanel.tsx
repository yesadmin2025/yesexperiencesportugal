import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

type PortalState = { confirmedAt: string | null; pickup: string; guestNames: string[]; note: string };

const field =
  "min-h-[44px] w-full rounded-[4px] border border-[color:var(--gold)]/35 bg-[color:var(--ivory)] px-3 text-[15px] text-[color:var(--charcoal)] placeholder:text-[color:var(--charcoal-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]";
const labelCls = "text-[11px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]";

export function GuestAttendancePanel({
  sessionId,
  guestCount,
  currentPickup,
}: {
  sessionId: string;
  guestCount: number;
  currentPickup: string | null;
}) {
  const [loaded, setLoaded] = useState(false);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [pickup, setPickup] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slots = Math.min(Math.max(guestCount, 1), 20);

  function apply(s: PortalState) {
    setConfirmedAt(s.confirmedAt);
    setPickup(s.pickup);
    setNames(Array.from({ length: slots }, (_, i) => s.guestNames[i] ?? ""));
    setNote(s.note);
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/guest-portal?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((b) => {
        if (!cancelled && b?.ok) apply(b);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/public/guest-portal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, attending: true, pickup, guestNames: names, note }),
      });
      const b = await res.json();
      if (!b?.ok) throw new Error();
      apply(b);
      setEditing(false);
    } catch {
      setError("We couldn't save that. Please try again, or reply to your confirmation email.");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;
  const showForm = !confirmedAt || editing;

  return (
    <section className="itinerary-block mt-12" aria-labelledby="attendance-heading">
      <h2 id="attendance-heading" className="font-editorial text-[24px] leading-tight text-[color:var(--charcoal)]">
        {confirmedAt ? "You're confirmed" : "Confirm you'll be there"}
      </h2>
      <div className="mt-3 h-px w-full bg-[color:var(--gold)]/25" />

      {!showForm ? (
        <div className="mt-6">
          <p className="inline-flex items-start gap-2 text-[15px] leading-relaxed text-[color:var(--charcoal)]">
            <Check size={16} className="mt-1 shrink-0 text-[color:var(--teal)]" aria-hidden />
            Thank you — your guide has your details.
          </p>
          {pickup ? (
            <p className="mt-2 text-[14px] text-[color:var(--charcoal-soft)]">Pickup: {pickup}</p>
          ) : null}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-5 min-h-[44px] text-[11.5px] uppercase tracking-[0.22em] text-[color:var(--teal)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
          >
            Update details
          </button>
        </div>
      ) : (
        <form
          className="mt-6 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <p className="text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
            Let us know you're coming, and correct anything your guide should know.
          </p>
          <div>
            <label htmlFor="portal-pickup" className={labelCls}>
              Pickup point
            </label>
            <input
              id="portal-pickup"
              className={`${field} mt-2`}
              value={pickup}
              maxLength={200}
              placeholder={currentPickup ?? "Hotel or address"}
              onChange={(e) => setPickup(e.target.value)}
            />
          </div>
          <fieldset>
            <legend className={labelCls}>Guest names</legend>
            <div className="mt-2 space-y-2">
              {names.map((n, i) => (
                <input
                  key={i}
                  aria-label={`Guest ${i + 1} name`}
                  className={field}
                  value={n}
                  maxLength={120}
                  placeholder={`Guest ${i + 1}`}
                  onChange={(e) => setNames((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))}
                />
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="portal-note" className={labelCls}>
              Anything else? (optional)
            </label>
            <textarea
              id="portal-note"
              rows={3}
              maxLength={1000}
              className={`${field} mt-2 py-2`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {error ? (
            <p role="alert" className="text-[14px] text-[color:var(--charcoal)]">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[2px] bg-[color:var(--teal)] px-6 text-[12px] uppercase tracking-[0.22em] text-[color:var(--ivory)] disabled:opacity-70 sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
          >
            {saving ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
            {confirmedAt ? "Save changes" : "We'll be there"}
          </button>
        </form>
      )}
    </section>
  );
}
