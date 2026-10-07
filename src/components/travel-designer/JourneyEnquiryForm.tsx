import { useRef, useState, type FormEvent } from "react";
import { CtaButton } from "@/components/ui/CtaButton";
import { leadAttribution } from "@/lib/utm";
import { EMAIL } from "@/config/business-nap";

function fromSample() {
  try { return sessionStorage.getItem("yes_journey_from_sample") === "1"; } catch { return false; }
}

/** Uses the same durable contact record and delivery path as /contact. */
export function JourneyEnquiryForm() {
  const inFlight = useRef(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim().split(/\s+/);
    const first = name.shift() ?? "";
    if (!first) { setError("Please enter your name."); return; }
    inFlight.current = true;
    setStatus("sending");
    setError(null);
    try {
      const response = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first: first.slice(0, 80), last: name.join(" ").slice(0, 80),
          email: String(data.get("email") ?? "").trim().toLowerCase(),
          requestType: "multi_day",
          travelDate: String(data.get("travelDate") ?? "") || null,
          message: (fromSample() ? "Inspired by the sample travel file.\n" : "") + String(data.get("message") ?? "").trim(),
          source: fromSample() ? "travel-designer-sample-file" : "travel-designer-page",
          attribution: leadAttribution(),
          locale: navigator.language.slice(0, 20),
          userAgent: navigator.userAgent.slice(0, 500),
        }),
      });
      if (!response.ok) throw new Error("delivery_failed");
      setStatus("sent");
      void import("@/lib/analytics-ga4").then((m) => m.gaGenerateLead({
        leadSource: "contact_form", method: "email", requestType: "multi_day", formType: "travel_designer",
      }));
      void import("@/lib/analytics-events").then(({ trackEvent }) => {
        trackEvent("travel_designer_lead", { placement: "travel_designer_page" });
        trackEvent("travel_designer_submit", { placement: "travel_designer_page" });
        trackEvent("contact_submit", { placement: "travel_designer_page" });
      });
    } catch {
      setStatus("idle");
      setError(`We couldn't confirm delivery. Please email ${EMAIL} before sending again.`);
    } finally { inFlight.current = false; }
  }

  if (status === "sent") return (
    <div role="status" className="border-l-2 border-[color:var(--gold)] pl-6">
      <p className="font-medium text-[color:var(--charcoal)]">Your journey request has reached our team.</p>
      <p className="mt-3 text-[color:var(--charcoal-soft)]">A local designer will reply personally within 24 hours.</p>
    </div>
  );

  const fieldClass = "mt-2 min-h-11 w-full border-b border-[color:var(--charcoal)]/30 bg-transparent py-2 text-base text-[color:var(--charcoal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]";
  return (
    <form onSubmit={submit} className="space-y-6" aria-label="Travel Designer journey enquiry">
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block text-sm text-[color:var(--charcoal-soft)]" htmlFor="journey-name">Name
          <input id="journey-name" name="name" required maxLength={160} autoComplete="name" className={fieldClass} />
        </label>
        <label className="block text-sm text-[color:var(--charcoal-soft)]" htmlFor="journey-email">Email
          <input id="journey-email" name="email" type="email" required maxLength={254} autoComplete="email" className={fieldClass} />
        </label>
      </div>
      <label className="block text-sm text-[color:var(--charcoal-soft)]" htmlFor="journey-date">When are you traveling? (optional)
        <input id="journey-date" name="travelDate" type="date" className={fieldClass} />
      </label>
      <label className="block text-sm text-[color:var(--charcoal-soft)]" htmlFor="journey-message">Your journey — starting point, number of days, guests and interests (optional)
        <textarea id="journey-message" name="message" rows={5} maxLength={4000} className={`${fieldClass} resize-y`} />
      </label>
      <p className="text-sm text-[color:var(--charcoal-soft)]">A planning enquiry, not a confirmed booking. Your journey and price are agreed before you commit. <a href="/privacy" className="underline underline-offset-4">Privacy policy</a></p>
      {error && <p role="alert" className="text-sm text-[color:var(--charcoal)]">{error}</p>}
      <CtaButton type="submit" disabled={status === "sending"} loading={status === "sending"} loadingLabel="Sending…">Design my journey</CtaButton>
    </form>
  );
}