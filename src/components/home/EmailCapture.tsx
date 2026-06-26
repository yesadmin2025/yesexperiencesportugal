import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CtaButton } from "@/components/ui/CtaButton";
import { Mail, X } from "lucide-react";

/**
 * Discreet email capture for the free lead-magnet PDF
 * "A Local's Map: The Best Day Trips from Lisbon".
 *
 * Two surfaces:
 *  - `<InlineEmailCapture />`  — slim inline section near the bottom of the homepage.
 *  - `<ExitIntentEmailCapture />` — desktop-only exit-intent prompt; never on mobile,
 *    never overlays the WhatsApp button or any booking CTA.
 *
 * Submissions are stored in `public.lead_captures` (RLS: anon insert with
 * consent=true; admin read). The PDF is served from `/lead-magnets/lisbon-day-trips-map.pdf`.
 */

const LEAD_MAGNET_ID = "lisbon-day-trips-map";
const LEAD_MAGNET_URL = "/lead-magnets/lisbon-day-trips-map.pdf";
const STORAGE_KEY = "yes:lead-capture:submitted";
const EXIT_INTENT_DISMISSED_KEY = "yes:lead-capture:exit-dismissed";

const leadSchema = z.object({
  firstName: z.string().trim().min(1, "Please enter your first name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Please tick the consent box to continue." }),
  }),
});

type Status = "idle" | "submitting" | "success" | "error";

function useLeadForm(source: string) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    const parsed = leadSchema.safeParse({ firstName, email, consent });
    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    setStatus("submitting");
    try {
      const { error } = await supabase.from("lead_captures").insert({
        first_name: parsed.data.firstName,
        email: parsed.data.email,
        lead_magnet: LEAD_MAGNET_ID,
        consent: true,
        source,
        locale: typeof navigator !== "undefined" ? navigator.language : null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
      });
      if (error) throw error;
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* noop */
      }
      setStatus("success");
    } catch (err) {
      console.error("[lead-capture] insert failed", err);
      setStatus("error");
      setErrorMsg("Sorry, something went wrong. Please try again.");
    }
  }

  return {
    firstName,
    setFirstName,
    email,
    setEmail,
    consent,
    setConsent,
    status,
    errorMsg,
    submit,
  };
}

function PrivacyLine() {
  return (
    <p className="mt-3 text-[11.5px] leading-[1.55] text-[color:var(--charcoal-soft)]">
      We use your email only to send the guide and the occasional Portugal story. No spam.
      Unsubscribe anytime. See our{" "}
      <a href="/privacy" className="underline hover:text-[color:var(--teal)]">
        privacy policy
      </a>
      .
    </p>
  );
}

function SuccessState({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`text-center ${compact ? "py-2" : "py-4"}`}
      role="status"
      aria-live="polite"
    >
      <p className="serif text-[color:var(--charcoal)] text-[18px] md:text-[20px] leading-snug">
        Your map is on its way.
      </p>
      <p className="mt-2 text-[13px] text-[color:var(--charcoal-soft)]">
        You can also{" "}
        <a
          href={LEAD_MAGNET_URL}
          className="underline text-[color:var(--teal)]"
          target="_blank"
          rel="noopener noreferrer"
        >
          download it now
        </a>
        .
      </p>
    </div>
  );
}

function LeadForm({
  source,
  compact = false,
}: {
  source: string;
  compact?: boolean;
}) {
  const f = useLeadForm(source);

  if (f.status === "success") return <SuccessState compact={compact} />;

  return (
    <form onSubmit={f.submit} noValidate className="text-left">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`lc-fn-${source}`} className="sr-only">
            First name
          </label>
          <Input
            id={`lc-fn-${source}`}
            name="firstName"
            type="text"
            autoComplete="given-name"
            placeholder="First name"
            value={f.firstName}
            onChange={(e) => f.setFirstName(e.target.value)}
            required
            maxLength={80}
            className="h-11 bg-[color:var(--ivory)] border-[color:color-mix(in_oklab,var(--charcoal)_15%,transparent)]"
          />
        </div>
        <div>
          <label htmlFor={`lc-em-${source}`} className="sr-only">
            Email
          </label>
          <Input
            id={`lc-em-${source}`}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={f.email}
            onChange={(e) => f.setEmail(e.target.value)}
            required
            maxLength={254}
            className="h-11 bg-[color:var(--ivory)] border-[color:color-mix(in_oklab,var(--charcoal)_15%,transparent)]"
          />
        </div>
      </div>

      <label className="mt-3 flex items-start gap-2.5 cursor-pointer">
        <Checkbox
          checked={f.consent}
          onCheckedChange={(v) => f.setConsent(v === true)}
          aria-required="true"
          className="mt-0.5"
        />
        <span className="text-[12px] leading-[1.55] text-[color:var(--charcoal-soft)]">
          I agree to receive the guide and occasional emails from YES Experiences. I can
          unsubscribe at any time.
        </span>
      </label>

      {f.errorMsg ? (
        <p className="mt-2 text-[12px] text-red-700" role="alert">
          {f.errorMsg}
        </p>
      ) : null}

      <div className="mt-4 flex justify-center sm:justify-start">
        <CtaButton type="submit" variant="primary" disabled={f.status === "submitting"}>
          {f.status === "submitting" ? "Sending…" : "Send me the map"}
        </CtaButton>
      </div>

      <PrivacyLine />
    </form>
  );
}

/* ─── Inline (homepage) ───────────────────────────────────────── */

export function InlineEmailCapture() {
  return (
    <div
      className="reveal mx-auto max-w-2xl rounded-[6px] bg-[color:color-mix(in_oklab,var(--ivory)_92%,var(--sand))] px-5 py-6 sm:px-8 sm:py-8"
      style={{
        border:
          "1px solid color-mix(in oklab, var(--gold-deep, var(--gold)) 35%, transparent)",
      }}
    >
      <div className="flex items-center justify-center gap-2 text-[color:var(--teal)]">
        <Mail aria-hidden="true" className="h-4 w-4" />
        <span className="text-[10.5px] tracking-[0.22em] uppercase font-medium">
          Free guide
        </span>
      </div>
      <h3 className="serif mt-2 text-center text-[20px] sm:text-[22px] leading-snug text-[color:var(--charcoal)]">
        A Local&apos;s Map:{" "}
        <span className="italic text-[color:var(--teal)]">
          the best day trips from Lisbon
        </span>
      </h3>
      <p className="mt-2 text-center text-[13.5px] text-[color:var(--charcoal-soft)]">
        Planning a Portugal trip? Get our local day-trip map — free.
      </p>
      <div className="mt-5">
        <LeadForm source="homepage-inline" />
      </div>
    </div>
  );
}

/* ─── Exit-intent (desktop only) ───────────────────────────────── */

export function ExitIntentEmailCapture() {
  const [open, setOpen] = useState(false);
  const armed = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Desktop only: skip touch / small screens.
    const isDesktop = window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;
    if (!isDesktop) return;

    let dismissed = false;
    try {
      dismissed =
        localStorage.getItem(EXIT_INTENT_DISMISSED_KEY) === "1" ||
        localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      /* noop */
    }
    if (dismissed) return;

    // Arm only after the visitor has been on the page for a few seconds.
    const armTimer = window.setTimeout(() => {
      armed.current = true;
    }, 8000);

    const onLeave = (e: MouseEvent) => {
      if (!armed.current) return;
      // Only when the pointer leaves through the top of the viewport.
      if (e.clientY > 0) return;
      if ((e.relatedTarget as Node | null) != null) return;
      setOpen(true);
      armed.current = false;
    };
    document.addEventListener("mouseout", onLeave);
    return () => {
      window.clearTimeout(armTimer);
      document.removeEventListener("mouseout", onLeave);
    };
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(EXIT_INTENT_DISMISSED_KEY, "1");
    } catch {
      /* noop */
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-intent-title"
      className="fixed inset-0 z-[80] hidden lg:flex items-center justify-center p-6"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={dismiss}
        className="absolute inset-0 bg-[color:color-mix(in_oklab,var(--charcoal)_55%,transparent)]"
      />
      <div
        className="relative w-full max-w-md rounded-[6px] bg-[color:var(--ivory)] px-8 py-9 shadow-2xl"
        style={{
          border:
            "1px solid color-mix(in oklab, var(--gold-deep, var(--gold)) 45%, transparent)",
        }}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-3 top-3 p-1.5 rounded-full text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center justify-center gap-2 text-[color:var(--teal)]">
          <Mail aria-hidden="true" className="h-4 w-4" />
          <span className="text-[10.5px] tracking-[0.22em] uppercase font-medium">
            Before you go
          </span>
        </div>
        <h3
          id="exit-intent-title"
          className="serif mt-2 text-center text-[22px] leading-snug text-[color:var(--charcoal)]"
        >
          A Local&apos;s Map:{" "}
          <span className="italic text-[color:var(--teal)]">day trips from Lisbon</span>
        </h3>
        <p className="mt-2 text-center text-[13.5px] text-[color:var(--charcoal-soft)]">
          Planning a Portugal trip? Get our local day-trip map — free.
        </p>
        <div className="mt-5">
          <LeadForm source="homepage-exit-intent" />
        </div>
      </div>
    </div>
  );
}
