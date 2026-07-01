import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { Check, ArrowRight, MessageCircle, Mail, Receipt, Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";

interface Search {
  session_id?: string;
  tour?: string;
}

interface SessionStatus {
  status: "open" | "complete" | "expired";
  paymentStatus: "paid" | "unpaid" | "no_payment_required";
  amountTotal: number | null;
  currency: string | null;
  customerEmail: string | null;
  customerName: string | null;
  receiptUrl: string | null;
  environment: "sandbox" | "live";
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const Route = createFileRoute("/booking-confirmed")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
    tour: typeof s.tour === "string" ? s.tour : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Booking confirmed — YES experiences Portugal" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: BookingConfirmedPage,
});

function BookingConfirmedPage() {
  const { session_id, tour } = useSearch({ from: "/booking-confirmed" });
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ok"; data: SessionStatus }
    | { kind: "error"; message: string }
  >({ kind: session_id ? "loading" : "idle" });

  useEffect(() => {
    if (!session_id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/stripe-session-status?session_id=${encodeURIComponent(session_id)}`,
          { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } },
        );
        const body = (await res.json()) as SessionStatus | { error: string };
        if (cancelled) return;
        if (!res.ok || "error" in body) {
          setState({
            kind: "error",
            message: "error" in body ? body.error : "Could not verify your booking.",
          });
          return;
        }
        setState({ kind: "ok", data: body });
      } catch (e) {
        if (cancelled) return;
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : "Could not verify your booking.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session_id]);

  const paid = state.kind === "ok" && state.data.paymentStatus === "paid";
  const amountLabel =
    state.kind === "ok" && state.data.amountTotal != null && state.data.currency
      ? new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: state.data.currency.toUpperCase(),
        }).format(state.data.amountTotal / 100)
      : null;

  return (
    <SiteLayout>
      <section className="pt-28 pb-20 min-h-[70vh] bg-[color:var(--sand)]/30">
        <div className="container-x max-w-2xl text-center">
          <div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 ${
              state.kind === "loading"
                ? "bg-[color:var(--charcoal)]/10 text-[color:var(--charcoal-soft)]"
                : state.kind === "error"
                  ? "bg-[color:var(--charcoal)]/10 text-[color:var(--charcoal)]"
                  : "bg-[color:var(--teal)] text-[color:var(--ivory)]"
            }`}
          >
            {state.kind === "loading" ? (
              <Loader2 size={28} strokeWidth={2.2} className="animate-spin" />
            ) : state.kind === "error" ? (
              <AlertCircle size={28} strokeWidth={2.2} />
            ) : (
              <Check size={28} strokeWidth={2.2} />
            )}
          </div>

          <Eyebrow>
            {state.kind === "loading"
              ? "Verifying"
              : state.kind === "error"
                ? "Awaiting confirmation"
                : paid
                  ? "Confirmed"
                  : "Received"}
          </Eyebrow>
          <SectionTitle>
            {state.kind === "error" ? (
              <>
                We couldn't verify your <SectionTitle.Em>booking yet</SectionTitle.Em>
              </>
            ) : (
              <>
                Your day in Portugal is <SectionTitle.Em>reserved</SectionTitle.Em>
              </>
            )}
          </SectionTitle>

          <p className="mt-5 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
            {state.kind === "loading" && "Confirming your payment with our secure processor…"}
            {state.kind === "error" &&
              "If your card was charged, you'll still receive a confirmation email shortly. Reach out via WhatsApp if anything looks off."}
            {state.kind === "ok" &&
              (paid ? (
                <>
                  Payment received{amountLabel ? ` · ${amountLabel}` : ""}. A confirmation email is
                  on its way to{" "}
                  <span className="text-[color:var(--charcoal)]">
                    {state.data.customerEmail ?? "your inbox"}
                  </span>{" "}
                  with your itinerary, pickup details and your host's direct WhatsApp.
                </>
              ) : (
                "Your session is still being processed. Refresh in a moment or check your email for the confirmation."
              ))}
            {state.kind === "idle" &&
              "Payment received. A confirmation email is on its way with your itinerary, pickup details and your host's direct WhatsApp."}
          </p>

          {session_id ? (
            <p className="mt-4 text-[10px] uppercase tracking-[0.26em] text-[color:var(--charcoal-soft)]/70">
              Reference · {session_id.slice(-12)}
            </p>
          ) : null}

          {state.kind === "ok" && state.data.receiptUrl ? (
            <div className="mt-6">
              <a
                href={state.data.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.24em] text-[color:var(--teal)] hover:text-[color:var(--gold)] border-b border-[color:var(--teal)]/40 hover:border-[color:var(--gold)] pb-1"
              >
                <Receipt size={14} /> View your receipt
              </a>
            </div>
          ) : null}

          <ul className="mt-10 grid sm:grid-cols-3 gap-4 text-left">
            <NextStep
              icon={<Mail size={14} />}
              title="Check your inbox"
              body="Confirmation email with the full plan, in minutes."
            />
            <NextStep
              icon={<MessageCircle size={14} />}
              title="Local host"
              body="Your guide will introduce themselves on WhatsApp within 24h."
            />
            <NextStep
              icon={<ArrowRight size={14} />}
              title="Anything to adjust"
              body="Dietary, pickup, occasion — just reply to the email."
            />
          </ul>

          <div className="mt-12 flex flex-col sm:flex-row gap-3 justify-center">
            {tour ? (
              <Link
                to="/tours/$tourId"
                params={{ tourId: tour }}
                className="inline-flex items-center justify-center gap-2 border border-[color:var(--charcoal)]/25 hover:border-[color:var(--gold)] px-6 py-3 text-sm tracking-wide min-h-[48px]"
              >
                Back to your Signature
              </Link>
            ) : null}
            <Link
              to="/experiences"
              className="inline-flex items-center justify-center gap-2 bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] text-[color:var(--ivory)] px-6 py-3 text-sm tracking-wide min-h-[48px]"
            >
              Explore more Signatures <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function NextStep({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="border border-[color:var(--border)] bg-[color:var(--ivory)] p-5">
      <span className="inline-flex items-center justify-center w-8 h-8 border border-[color:var(--gold)]/60 text-[color:var(--gold)] mb-3">
        {icon}
      </span>
      <h3 className="text-[12px] uppercase tracking-[0.24em] text-[color:var(--charcoal)] mb-1.5">
        {title}
      </h3>
      <p className="text-[13px] leading-relaxed text-[color:var(--charcoal-soft)]">{body}</p>
    </li>
  );
}
