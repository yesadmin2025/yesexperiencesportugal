import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { Check, ArrowRight, MessageCircle, Mail } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";

interface Search {
  session_id?: string;
  tour?: string;
}

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

  return (
    <SiteLayout>
      <section className="pt-28 pb-20 min-h-[70vh] bg-[color:var(--sand)]/30">
        <div className="container-x max-w-2xl text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[color:var(--teal)] text-[color:var(--ivory)] mb-6">
            <Check size={28} strokeWidth={2.2} />
          </div>
          <Eyebrow>Confirmed</Eyebrow>
          <SectionTitle>
            Your day in Portugal is <SectionTitle.Em>reserved</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-5 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
            Payment received. A confirmation email is on its way with your itinerary,
            pickup details and your host's direct WhatsApp.
          </p>

          {session_id ? (
            <p className="mt-4 text-[10px] uppercase tracking-[0.26em] text-[color:var(--charcoal-soft)]/70">
              Reference · {session_id.slice(-12)}
            </p>
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
