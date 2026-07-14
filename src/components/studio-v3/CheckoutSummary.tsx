/**
 * CheckoutSummary — compact recap between Guest Details and Payment.
 *
 * Shows a tight summary card (date, guests, pickup, language, inclusions,
 * additions, total) then hands off to the existing Stripe embedded flow.
 * Instant-confirmation language only — never "to be confirmed".
 */

import * as React from "react";
import { ArrowLeft, Download, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CtaButton } from "@/components/ui/CtaButton";
import { BookingCtaSkeleton } from "@/components/ui/BookingCtaSkeleton";
import { findTour } from "@/data/signatureTours";
import { pickupCityLabel } from "./curation";
import {
  CHECKOUT_HEADER,
  CTA_RESERVE_AND_PAY,
  INSTANT_CONFIRMATION,
} from "@/content/signature-day-copy";
import type { StudioV3State } from "./types";
import type { SelectedAddOnSummary } from "./SignaturePriceCard";
import type { GuestDetails } from "@/components/checkout/FinalDetailsDialog";
import { cn } from "@/lib/utils";
import { resolveJourneyPricing, ageBand } from "@/data/signatureTourPricing";

export interface CheckoutSummaryProps {
  readonly state: StudioV3State;
  readonly guestDetails: GuestDetails;
  readonly selectedAddOns: SelectedAddOnSummary["items"];
  readonly perPaxEur: number | null;
  readonly totalEur: number | null;
  /**
   * Optional adults + minorAges — when both are set (adults ≥ 1 and at least
   * one minor), the summary itemises each traveller with their age-band %,
   * matching the server-side pricing used at Stripe checkout.
   */
  readonly adults?: number | null;
  readonly minorAges?: readonly number[];
  readonly submitting?: boolean;
  readonly onEditGuestDetails: () => void;
  readonly onBack: () => void;
  readonly onReserve: () => void;
  readonly className?: string;
  readonly testId?: string;
}


function formatEur(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso + "T00:00:00"));
  } catch {
    return iso;
  }
}

export function CheckoutSummary({
  state,
  guestDetails,
  selectedAddOns,
  perPaxEur,
  totalEur,
  adults = null,
  minorAges = [],
  submitting = false,
  onEditGuestDetails,
  onBack,
  onReserve,
  className,
  testId,
}: CheckoutSummaryProps) {
  const tour = state.tourId ? findTour(state.tourId) : null;
  const title = state.journeyTitle ?? tour?.title ?? "Your Signature";
  const dateLabel = formatDate(guestDetails.tourDate ?? state.dateExact);
  const pickupLabel =
    guestDetails.pickupAddress ||
    pickupCityLabel(state.pickup) ||
    "Pickup shared with your host";
  const included: string[] =
    tour?.included && tour.included.length > 0
      ? tour.included
      : ["Private guide", "Private transport", "All confirmed entries"];

  const [pdfLoading, setPdfLoading] = React.useState(false);
  const handleDownloadPdf = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const [{ pdf }, { SignatureOnePager }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./signatureOnePagerPdf"),
      ]);
      const blob = await pdf(
        <SignatureOnePager
          data={{
            title,
            dateLabel,
            guests: typeof guestDetails.guests === "number" ? guestDetails.guests : 2,
            pickupLabel,
            languageLabel: guestDetails.language === "pt" ? "Portuguese" : "English",
            inclusions: included,
            additions: selectedAddOns.map((a) => ({ label: a.label, priceEur: a.priceEur })),
            totalEur,
            perPaxEur,
          }}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const slug = (title || "signature-day")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 60);
      const isoBit = (guestDetails.tourDate ?? state.dateExact ?? "").replace(/[^0-9-]/g, "");
      const a = document.createElement("a");
      a.href = url;
      a.download = isoBit ? `signature-day-${slug}-${isoBit}.pdf` : `signature-day-${slug}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error("[CheckoutSummary] PDF generation failed", err);
      toast.error("Couldn't generate the PDF — please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <section
      data-testid={testId ?? "studio-v3-checkout-summary"}
      aria-labelledby="studio-v3-checkout-summary-title"
      className={cn(
        "w-full max-w-[560px] mx-auto px-5 pt-8 pb-[calc(env(safe-area-inset-bottom)+7rem)]",
        className,
      )}
    >
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.22em] min-h-[44px]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
      >
        <ArrowLeft size={14} aria-hidden /> Back
      </button>

      <header className="mt-2 text-center">
        <Eyebrow>Almost yours</Eyebrow>
        <h2
          id="studio-v3-checkout-summary-title"
          className="mt-3 text-[22px] leading-[1.25] [text-wrap:balance]"
          style={{
            fontFamily: "var(--font-editorial)",
            color: "var(--charcoal)",
            fontWeight: 500,
          }}
        >
          {CHECKOUT_HEADER}
        </h2>
        <p
          className="mt-2 text-[13.5px] italic"
          style={{
            fontFamily: "var(--font-editorial)",
            color: "color-mix(in oklab, var(--charcoal) 72%, transparent)",
          }}
        >
          {title}
        </p>
      </header>

      {/* Summary card */}
      <div
        className="mt-8 border p-5 space-y-4"
        style={{
          borderColor: "color-mix(in oklab, var(--charcoal) 12%, transparent)",
          background: "color-mix(in oklab, var(--sand) 40%, var(--ivory))",
        }}
      >
        <Row label="Date" value={dateLabel ?? "Flexible"} />
        <Row
          label="Guests"
          value={
            typeof guestDetails.guests === "number"
              ? `${guestDetails.guests} ${guestDetails.guests === 1 ? "guest" : "guests"}`
              : "—"
          }
        />
        <Row label="Pickup" value={pickupLabel} />
        <Row
          label="Language"
          value={guestDetails.language === "pt" ? "Portuguese" : "English"}
        />
        {guestDetails.startTime ? <Row label="Start time" value={guestDetails.startTime} /> : null}

        {(() => {
          // Age-band itemisation — shown when the traveller went through
          // the Composition control and captured minors. Mirrors what the
          // Stripe edge function priced server-side.
          const hasComposition =
            typeof adults === "number" && adults >= 1 && (minorAges?.length ?? 0) > 0;
          if (!hasComposition || !tour) return null;
          const journey = resolveJourneyPricing(tour, adults!, minorAges ?? []);
          if (!journey) return null;
          return (
            <div
              className="pt-3 border-t"
              style={{ borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)" }}
              data-testid="studio-v3-checkout-summary-travellers"
            >
              <p
                className="text-[10px] uppercase tracking-[0.22em] mb-2"
                style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
              >
                Travellers
              </p>
              <ul className="space-y-1 text-[13px]" style={{ color: "var(--charcoal)" }}>
                {journey.lines.map((l, i) => {
                  const label =
                    l.kind === "adult"
                      ? "Adult · 100%"
                      : l.band === "youth"
                        ? `Youth · age ${l.age} · 75%`
                        : l.band === "child"
                          ? `Child · age ${l.age} · 50%`
                          : `Infant · age ${l.age} · free`;
                  return (
                    <li key={i} className="flex justify-between gap-3">
                      <span>· {label}</span>
                      <span
                        className="tabular-nums"
                        style={{ color: l.unitEur === 0 ? "var(--teal)" : "var(--charcoal)" }}
                      >
                        {l.unitEur === 0 ? "Free" : formatEur(l.unitEur)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p
                className="mt-2 text-[11px] italic"
                style={{
                  fontFamily: "var(--font-serif)",
                  color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
                }}
              >
                Priced honestly by age — no adult fallback for minors.
              </p>
            </div>
          );
        })()}


        <div className="pt-3 border-t" style={{ borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)" }}>
          <p className="text-[10px] uppercase tracking-[0.22em] mb-2" style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}>
            Included
          </p>
          <ul className="space-y-1 text-[13px]" style={{ color: "var(--charcoal)" }}>
            {included.slice(0, 6).map((i) => (
              <li key={i}>· {i}</li>
            ))}
          </ul>
        </div>

        {selectedAddOns.length > 0 ? (
          <div className="pt-3 border-t" style={{ borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)" }}>
            <p className="text-[10px] uppercase tracking-[0.22em] mb-2" style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}>
              Your additions
            </p>
            <ul className="space-y-1 text-[13px]" style={{ color: "var(--charcoal)" }}>
              {selectedAddOns.map((a) => (
                <li key={a.id} className="flex justify-between gap-3">
                  <span>· {a.label}</span>
                  <span className="tabular-nums" style={{ color: "var(--teal)" }}>
                    {formatEur(a.priceEur)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div
          className="pt-3 border-t flex justify-between items-baseline"
          style={{ borderColor: "color-mix(in oklab, var(--charcoal) 14%, transparent)" }}
        >
          <span className="text-[11px] uppercase tracking-[0.22em]" style={{ color: "var(--charcoal)" }}>
            Total
          </span>
          <span
            className="text-[22px] tabular-nums"
            style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
          >
            {formatEur(totalEur)}
            {perPaxEur != null ? (
              <span
                className="ml-2 text-[11px] uppercase tracking-[0.2em]"
                style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
              >
                · {formatEur(perPaxEur)} / guest
              </span>
            ) : null}
          </span>
        </div>
      </div>

      {/* One-pager PDF download */}
      <div className="mt-6">
        <CtaButton
          type="button"
          variant="ghost"
          size="md"
          className="w-full"
          iconLeading={
            pdfLoading ? (
              <Loader2 size={14} className="animate-spin" aria-hidden />
            ) : (
              <Download size={14} aria-hidden />
            )
          }
          onClick={handleDownloadPdf}
          disabled={pdfLoading}
          data-testid="studio-v3-checkout-summary-pdf"
        >
          {pdfLoading ? "Preparing PDF…" : "Download one-pager (PDF)"}
        </CtaButton>
      </div>

      {/* Guest details recap */}
      <div className="mt-6 flex items-center justify-between">
        <div className="text-[12.5px]" style={{ color: "color-mix(in oklab, var(--charcoal) 78%, transparent)" }}>
          <div className="font-medium" style={{ color: "var(--charcoal)" }}>
            {guestDetails.fullName}
          </div>
          <div>{guestDetails.email}</div>
          <div>{guestDetails.phone}</div>
        </div>
        <button
          type="button"
          onClick={onEditGuestDetails}
          className="text-[11px] uppercase tracking-[0.22em] min-h-[44px] px-3"
          style={{ color: "var(--teal)" }}
        >
          Edit
        </button>
      </div>

      <p
        className="mt-6 text-center text-[12.5px] italic"
        style={{
          fontFamily: "var(--font-editorial)",
          color: "color-mix(in oklab, var(--charcoal) 68%, transparent)",
        }}
      >
        {INSTANT_CONFIRMATION}
      </p>

      {/* Sticky CTA bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--border)] bg-[color:var(--ivory)]/95 backdrop-blur-sm px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
        data-testid="studio-v3-checkout-summary-cta-bar"
      >
        <div className="max-w-[560px] mx-auto">
          {submitting ? (
            <BookingCtaSkeleton className="w-full" label="Opening secure checkout…" />
          ) : (
            <CtaButton
              type="button"
              variant="primary"
              size="md"
              className="w-full"
              iconLeading={<Lock size={14} aria-hidden />}
              onClick={onReserve}
              data-testid="studio-v3-checkout-summary-reserve"
            >
              {CTA_RESERVE_AND_PAY}
            </CtaButton>
          )}
          <p className="mt-2 text-center text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]/80">
            Secure checkout · Final price shown before payment
          </p>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-[13.5px]" style={{ color: "var(--charcoal)" }}>
      <span
        className="text-[11px] uppercase tracking-[0.22em]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
      >
        {label}
      </span>
      <span className="text-right">{value}</span>
    </div>
  );
}

export default CheckoutSummary;
