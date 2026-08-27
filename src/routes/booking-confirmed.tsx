import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import {
  Check,
  ArrowRight,
  MessageCircle,
  Mail,
  Receipt,
  Loader2,
  AlertCircle,
  Download,
  Map,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { findTour } from "@/data/signatureTours";
import { gaPurchase, buildTourItem } from "@/lib/analytics-ga4";
import { trackEvent } from "@/lib/analytics-events";

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
      { title: "Booking status — YES experiences Portugal" },
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
  const purchaseFiredFor = useRef<string | null>(null);

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

  // GA4 purchase — fire once per session_id when paid.
  useEffect(() => {
    if (state.kind !== "ok") return;
    if (state.data.paymentStatus !== "paid") return;
    if (!session_id || purchaseFiredFor.current === session_id) return;
    purchaseFiredFor.current = session_id;
    const t = tour ? findTour(tour) : null;
    const valueEur = state.data.amountTotal != null ? state.data.amountTotal / 100 : 0;
    const item = t
      ? buildTourItem(t, { quantity: 1, tier: "signature", itemCategory: "Signature" })
      : {
          item_id: tour ?? "unknown",
          item_name: tour ?? "YES experience",
          item_brand: "YES Experiences Portugal",
          item_category: "Signature",
          price: valueEur,
          quantity: 1,
          currency: "EUR",
        };
    item.price = valueEur;
    gaPurchase({
      transactionId: session_id,
      valueEur,
      items: [item],
      currency: state.data.currency ? state.data.currency.toUpperCase() : "EUR",
    });
    const isStudio = (tour ?? "").startsWith("studio");
    trackEvent(isStudio ? "studio_checkout_completed" : "checkout_completed", {
      experience_id: tour ?? null,
      experience_type: isStudio ? "studio" : "signature",
      value: valueEur,
      currency: state.data.currency ? state.data.currency.toUpperCase() : "EUR",
    });
  }, [state, session_id, tour]);

  const paid = state.kind === "ok" && state.data.paymentStatus === "paid";
  const pending = state.kind === "ok" && !paid;
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
              paid
                ? "bg-[color:var(--teal)] text-[color:var(--ivory)]"
                : "bg-[color:var(--charcoal)]/10 text-[color:var(--charcoal-soft)]"
            }`}
          >
            {state.kind === "loading" ? (
              <Loader2 size={28} strokeWidth={2.2} className="animate-spin" />
            ) : paid ? (
              <Check size={28} strokeWidth={2.2} className="motion-check-in" />
            ) : (
              <AlertCircle size={28} strokeWidth={2.2} />
            )}
          </div>

          <Eyebrow>
            {state.kind === "loading"
              ? "Verifying"
              : state.kind === "idle"
                ? "Confirmation link required"
                : state.kind === "error"
                  ? "Verification needed"
                  : paid
                    ? "Confirmed"
                    : "Payment pending"}
          </Eyebrow>
          <SectionTitle>
            {paid ? (
              <>
                Your day in Portugal is <SectionTitle.Em>reserved</SectionTitle.Em>
              </>
            ) : state.kind === "loading" ? (
              <>
                We’re checking your <SectionTitle.Em>booking</SectionTitle.Em>
              </>
            ) : state.kind === "idle" ? (
              <>
                We can’t verify this booking <SectionTitle.Em>from this link</SectionTitle.Em>
              </>
            ) : state.kind === "error" ? (
              <>
                We couldn’t verify your <SectionTitle.Em>booking yet</SectionTitle.Em>
              </>
            ) : (
              <>
                Your payment is still <SectionTitle.Em>processing</SectionTitle.Em>
              </>
            )}
          </SectionTitle>

          <p className="mt-5 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
            {state.kind === "loading" && "Confirming your payment with our secure processor…"}
            {state.kind === "idle" &&
              "This page only confirms a booking when it includes a valid secure payment reference. Please use the confirmation link returned after checkout."}
            {state.kind === "error" &&
              "We could not verify the payment reference right now. If your card was charged, keep this link and try again shortly, or contact us and we’ll check the payment directly."}
            {state.kind === "ok" &&
              (paid ? (
                <>
                  Payment received{amountLabel ? ` · ${amountLabel}` : ""}. Your full plan — stop by
                  stop, pickup details and your host’s direct WhatsApp — is ready below, and a copy
                  is on its way to{" "}
                  <span className="text-[color:var(--charcoal)]">
                    {state.data.customerEmail ?? "your inbox"}
                  </span>
                  .
                </>
              ) : (
                "Your payment has not been confirmed yet. As soon as it clears, your booking and full plan will appear on this page."
              ))}
          </p>

          {session_id ? (
            <p className="mt-4 text-[10px] uppercase tracking-[0.26em] text-[color:var(--charcoal-soft)]">
              Reference · {session_id.slice(-12)}
            </p>
          ) : null}

          {session_id && paid ? (
            <div className="mt-8 border border-[color:var(--gold)]/45 bg-[color:var(--ivory)] p-6 sm:p-7 text-left">
              <p className="text-[10.5px] uppercase tracking-[0.26em] text-[color:var(--charcoal)]">
                Your day, in full
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--charcoal-soft)]">
                Everything is already here — you don’t need the email to have your plan. Keep this
                link; it stays valid for your booking reference.
              </p>
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/itinerary"
                  search={{ session_id }}
                  className="inline-flex items-center justify-center gap-2 bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] text-[color:var(--ivory)] px-6 py-3 text-[12px] uppercase tracking-[0.22em] min-h-[48px]"
                >
                  <Map size={14} /> View itinerary
                </Link>
                <a
                  href={`/api/public/booking-itinerary?session_id=${encodeURIComponent(session_id)}`}
                  className="inline-flex items-center justify-center gap-2 border border-[color:var(--charcoal)]/25 hover:border-[color:var(--gold)] px-6 py-3 text-[12px] uppercase tracking-[0.22em] min-h-[48px]"
                >
                  <Download size={14} /> Download PDF
                </a>
              </div>
              <Link
                to="/booking-receipt"
                search={{ session_id }}
                className="mt-5 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.24em] text-[color:var(--teal)] hover:text-[color:var(--charcoal)] border-b border-[color:var(--teal)]/40 hover:border-[color:var(--gold)] pb-1 min-h-[44px]"
              >
                <Receipt size={14} /> Printable receipt
              </Link>
            </div>
          ) : null}

          {state.kind === "ok" && paid && state.data.receiptUrl ? (
            <div className="mt-4">
              <a
                href={state.data.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.24em] text-[color:var(--teal)] hover:text-[color:var(--charcoal)] border-b border-[color:var(--teal)]/40 hover:border-[color:var(--gold)] pb-1"
              >
                <Receipt size={14} /> Stripe payment receipt
              </a>
            </div>
          ) : null}

          {paid ? (
            <ul className="mt-10 grid sm:grid-cols-3 gap-4 text-left">
              <NextStep
                icon={<Mail size={14} />}
                title="Email copy"
                body="A confirmation with the same plan follows by email."
              />
              <NextStep
                icon={<MessageCircle size={14} />}
                title="Local host"
                body="Your guide will introduce themselves on WhatsApp within 24h."
              />
              <NextStep
                icon={<ArrowRight size={14} />}
                title="Anything to adjust"
                body="Dietary, pickup, occasion — write to us and we’ll adapt."
              />
            </ul>
          ) : null}

          {!paid && state.kind !== "loading" ? (
            <div
              data-testid="booking-status-unverified-help"
              className="mt-9 border border-[color:var(--charcoal)]/15 bg-[color:var(--ivory)] p-5 text-left"
            >
              <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal)]">
                No booking confirmation shown
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[color:var(--charcoal-soft)]">
                {pending
                  ? "Keep this payment link. Once Stripe confirms the payment, refreshing this page will reveal the confirmed booking details."
                  : "A booking reference and confirmed itinerary appear here only after we can verify the secure payment session."}
              </p>
            </div>
          ) : null}

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

function NextStep({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
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
