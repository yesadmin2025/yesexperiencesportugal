/**
 * ProposalRequestForm — homepage request form for proposals, celebrations,
 * corporate days and private groups.
 *
 * Posts to `/api/public/proposal-request`, which stores the request in the
 * enquiries inbox and sends a confirmation to the sender plus a notification
 * to the YES team. Mobile-first, validated on the client and again on the
 * server, with an inline success state (no page jump).
 */
import { useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics-events";

const OCCASIONS = [
  { value: "proposal", label: "Marriage proposal" },
  { value: "celebration", label: "Celebration or honeymoon" },
  { value: "corporate", label: "Corporate day or off-site" },
  { value: "private_group", label: "Private group" },
] as const;

const fieldClass =
  "mt-2 w-full min-h-[48px] rounded-[4px] border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 font-sans text-[15px] text-[color:var(--charcoal)] outline-none transition-colors duration-200 focus-visible:border-[color:var(--teal)] focus-visible:ring-2 focus-visible:ring-[color:var(--teal)]/30";
const labelClass =
  "block font-sans text-[10.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)]";

export function ProposalRequestForm({ id = "proposal-request" }: { id?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim() || null,
      company: String(form.get("company") ?? "").trim() || null,
      occasion: String(form.get("occasion") ?? "proposal"),
      dates: String(form.get("dates") ?? "").trim() || null,
      groupSize: Number(form.get("groupSize") ?? 2) || 2,
      message: String(form.get("message") ?? "").trim(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
    };

    if (payload.name.length < 2) return setError("Please tell us your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email))
      return setError("Please use an email we can reply to.");
    if (payload.message.length < 10)
      return setError("Tell us a little about what you have in mind.");

    setError(null);
    setState("sending");
    try {
      const res = await fetch("/api/public/proposal-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { ok?: boolean };
      if (!res.ok || !body.ok) throw new Error("request_failed");
      setState("sent");
    } catch {
      setState("idle");
      setError("Something went wrong. Please email info@yesexperiencesportugal.com and we'll pick it up.");
    }
  }

  if (state === "sent") {
    return (
      <div
        id={id}
        className="mx-auto max-w-2xl rounded-[6px] border border-[color:var(--gold)]/45 bg-[color:var(--card)] p-7 text-center md:p-9"
        role="status"
      >
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--teal)]/10 text-[color:var(--teal)]">
          <Check size={20} aria-hidden />
        </span>
        <h3 className="serif mt-5 text-[1.5rem] leading-snug text-[color:var(--charcoal)]">
          Your request is with us.
        </h3>
        <p className="mt-3 text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]">
          A confirmation is on its way to your inbox, and a local designer replies personally —
          usually within one working day. If it is time-sensitive, call us on +351 911 889 992.
        </p>
      </div>
    );
  }

  return (
    <form
      id={id}
      onSubmit={onSubmit}
      className="mx-auto max-w-2xl rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-6 md:p-8"
      noValidate
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="pr-occasion">
            What are we planning?
          </label>
          <select id="pr-occasion" name="occasion" className={fieldClass} defaultValue="proposal">
            {OCCASIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="pr-name">
            Your name
          </label>
          <input id="pr-name" name="name" className={fieldClass} autoComplete="name" required />
        </div>

        <div>
          <label className={labelClass} htmlFor="pr-email">
            Email
          </label>
          <input
            id="pr-email"
            name="email"
            type="email"
            inputMode="email"
            className={fieldClass}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="pr-phone">
            Phone or WhatsApp <span className="font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <input
            id="pr-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            className={fieldClass}
            autoComplete="tel"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="pr-company">
            Company <span className="font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <input id="pr-company" name="company" className={fieldClass} autoComplete="organization" />
        </div>

        <div>
          <label className={labelClass} htmlFor="pr-dates">
            Dates or month
          </label>
          <input
            id="pr-dates"
            name="dates"
            className={fieldClass}
            placeholder="e.g. 12–15 May, or flexible"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="pr-group">
            How many people
          </label>
          <input
            id="pr-group"
            name="groupSize"
            type="number"
            inputMode="numeric"
            min={1}
            max={200}
            defaultValue={2}
            className={fieldClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="pr-message">
            What do you have in mind?
          </label>
          <textarea
            id="pr-message"
            name="message"
            rows={4}
            className={fieldClass}
            placeholder="The moment, the mood, where you are staying, anything that matters."
            required
          />
        </div>
      </div>

      {error ? (
        <p className="mt-5 text-[14px] leading-[1.6] text-[color:var(--charcoal)]" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state === "sending"}
        className="mt-7 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[4px] bg-[color:var(--teal)] px-6 font-sans text-[12px] uppercase tracking-[0.22em] font-bold text-[color:var(--ivory)] transition-opacity duration-200 hover:opacity-90 disabled:opacity-60 sm:w-auto"
      >
        {state === "sending" ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
        {state === "sending" ? "Sending" : "Send my request"}
      </button>
      <p className="mt-4 font-sans text-[11.5px] leading-[1.6] uppercase tracking-[0.16em] text-[color:var(--charcoal-soft)]">
        One local team · reply within a working day · no obligation
      </p>
    </form>
  );
}

export default ProposalRequestForm;
