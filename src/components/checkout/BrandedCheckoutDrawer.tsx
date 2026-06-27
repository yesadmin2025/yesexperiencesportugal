import { useEffect, useMemo, useRef, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Lock, X, MapPin, Clock, Users, Calendar } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * BrandedCheckoutDrawer
 *
 * Renders Stripe Embedded Checkout inside an ivory, brand-styled drawer
 * (right side on desktop / bottom sheet on mobile). A premium experience
 * summary sits above the iframe so the guest always sees what they're
 * paying for. No full-page redirect — checkout happens on our domain.
 */

export interface CheckoutSummary {
  tourTitle: string;
  region?: string;
  durationHours?: string | number;
  guests: number;
  dateExact?: string | null;
  startTime?: string | null;
  pickupLabel?: string | null;
  pricePerPaxEur?: number | null;
  /** Total in EUR cents (per Stripe). Optional — we'll compute from pricePerPaxEur*guests if missing. */
  totalEur?: number | null;
  /** Optional hero image (locally uploaded YES photo when available). */
  heroSrc?: string | null;
  /** Short list (max 4) of inclusions / signature beats. */
  beats?: string[];
  flowLabel?: "Signature" | "Tailored" | "Studio";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientSecret: string | null;
  publishableKey: string | null;
  summary: CheckoutSummary;
  /** Called when Stripe reports the session as complete. */
  onComplete?: (sessionId: string | null) => void;
}

// One Stripe instance per publishable key (memoized across drawer opens).
const stripeCache = new Map<string, Promise<Stripe | null>>();
function getStripePromise(pk: string): Promise<Stripe | null> {
  if (!pk) return Promise.resolve(null);
  const cached = stripeCache.get(pk);
  if (cached) return cached;
  const p = loadStripe(pk);
  stripeCache.set(pk, p);
  return p;
}

/** Eager-prewarm Stripe.js so the drawer opens instantly. Call this on
 * intent (e.g. when FinalDetailsDialog opens). */
export function prewarmStripe(publishableKey: string | undefined | null) {
  if (publishableKey) void getStripePromise(publishableKey);
}

/** Inject the Stripe.js script tag once so the network/parse cost is
 * paid in parallel with the edge-function round-trip. Safe to call
 * repeatedly. */
let stripeScriptInjected = false;
export function prewarmStripeScript() {
  if (stripeScriptInjected || typeof document === "undefined") return;
  if (document.querySelector('script[src^="https://js.stripe.com/v3"]')) {
    stripeScriptInjected = true;
    return;
  }
  const s = document.createElement("script");
  s.src = "https://js.stripe.com/v3/";
  s.async = true;
  document.head.appendChild(s);
  stripeScriptInjected = true;
}

export function BrandedCheckoutDrawer({
  open,
  onOpenChange,
  clientSecret,
  publishableKey,
  summary,
  onComplete,
}: Props) {
  const stripePromise = useMemo(
    () => (publishableKey ? getStripePromise(publishableKey) : null),
    [publishableKey],
  );

  const completeFiredRef = useRef(false);

  const options = useMemo(() => {
    if (!clientSecret) return null;
    return {
      clientSecret,
      onComplete: () => {
        if (completeFiredRef.current) return;
        completeFiredRef.current = true;
        const sid = new URLSearchParams(window.location.search).get("session_id");
        onComplete?.(sid);
      },
    };
  }, [clientSecret, onComplete]);

  useEffect(() => {
    if (open) completeFiredRef.current = false;
  }, [open]);

  const total =
    summary.totalEur != null
      ? summary.totalEur
      : summary.pricePerPaxEur != null
      ? Math.round(summary.pricePerPaxEur * summary.guests)
      : null;

  useEffect(() => {
    if (open) prewarmStripeScript();
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[560px] p-0 bg-[color:var(--ivory)] border-l border-[color:var(--border)] flex flex-col gap-0 [&>button.absolute]:hidden"
        data-checkout="embedded"
      >
        {/* Header */}
        <div className="relative px-5 sm:px-7 pt-6 pb-4 border-b border-[color:var(--border)] bg-[color:var(--ivory)]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close checkout"
            className="absolute top-4 right-4 p-2 text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
          >
            <X size={18} />
          </button>
          <Eyebrow>
            {summary.flowLabel ?? "Signature"} · Secure checkout
          </Eyebrow>
          <SheetTitle className="serif text-[1.35rem] leading-tight text-[color:var(--charcoal)] mt-2 font-normal">
            {summary.tourTitle}
          </SheetTitle>
          <SheetDescription className="text-[12px] text-[color:var(--charcoal-soft)] mt-1.5 leading-relaxed">
            Confirmed instantly on yesexperiencesportugal.com — never leaves the page.
          </SheetDescription>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Premium experience summary card */}
          <ExperienceSummaryCard summary={summary} total={total} />

          {/* Stripe Embedded Checkout */}
          <div className="px-2 sm:px-3 pb-6">
            {clientSecret && publishableKey && stripePromise && options ? (
              <div className="relative bg-white">
                <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            ) : (
              <CheckoutSkeleton />
            )}
          </div>
        </div>

        {/* Trust footer */}
        <div className="px-5 sm:px-7 py-3 border-t border-[color:var(--border)] bg-[color:var(--sand)]/40">
          <p className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
            <Lock size={11} /> Stripe · Apple Pay · Google Pay · 256-bit secure
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ExperienceSummaryCard({
  summary,
  total,
}: {
  summary: CheckoutSummary;
  total: number | null;
}) {
  return (
    <div className="px-5 sm:px-7 pt-5 pb-6 border-b border-[color:var(--border)] bg-[color:var(--sand)]/30">
      <div className="flex gap-4">
        {summary.heroSrc ? (
          <div className="relative w-20 h-24 sm:w-24 sm:h-28 shrink-0 overflow-hidden">
            <img
              src={summary.heroSrc}
              alt=""
              aria-hidden
              className="w-full h-full object-cover"
              loading="eager"
              decoding="async"
            />
            <div className="absolute inset-0 ring-1 ring-[color:var(--gold)]/40" />
          </div>
        ) : null}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.26em] text-[color:var(--gold)]">
            Your day
          </p>
          <h3 className="serif text-[1.05rem] leading-snug text-[color:var(--charcoal)] mt-1 truncate">
            {summary.tourTitle}
          </h3>
          <ul className="mt-2.5 space-y-1 text-[12.5px] text-[color:var(--charcoal-soft)]">
            {summary.region ? (
              <Meta icon={<MapPin size={11} />}>{summary.region}</Meta>
            ) : null}
            {summary.durationHours ? (
              <Meta icon={<Clock size={11} />}>{summary.durationHours}h</Meta>
            ) : null}
            {summary.dateExact ? (
              <Meta icon={<Calendar size={11} />}>
                {formatDate(summary.dateExact)}
                {summary.startTime ? ` · ${summary.startTime}` : ""}
              </Meta>
            ) : null}
            <Meta icon={<Users size={11} />}>
              {summary.guests} guest{summary.guests > 1 ? "s" : ""}
            </Meta>
          </ul>
        </div>
      </div>

      {summary.beats && summary.beats.length > 0 ? (
        <ul className="mt-4 grid grid-cols-1 gap-1.5">
          {summary.beats.slice(0, 4).map((b) => (
            <li
              key={b}
              className="flex gap-2 text-[12.5px] leading-snug text-[color:var(--charcoal)]"
            >
              <span className="mt-1.5 w-1 h-1 rounded-full bg-[color:var(--gold)] shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {total != null ? (
        <div className="mt-4 pt-3 border-t border-[color:var(--border)] flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-[0.26em] text-[color:var(--charcoal-soft)]">
            Total
          </span>
          <span className="serif text-[1.4rem] text-[color:var(--charcoal)]">
            €{total.toLocaleString("en-GB")}
            {summary.pricePerPaxEur != null && summary.guests > 1 ? (
              <span className="ml-2 text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] font-sans">
                €{Math.round(summary.pricePerPaxEur).toLocaleString("en-GB")} × {summary.guests}
              </span>
            ) : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function Meta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span className="text-[color:var(--gold)]">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" });
  } catch {
    return iso;
  }
}

function CheckoutSkeleton() {
  return (
    <div className="px-3 py-6 space-y-3" aria-hidden>
      <div className="h-10 bg-[color:var(--sand)]/60 animate-pulse" />
      <div className="h-32 bg-[color:var(--sand)]/60 animate-pulse" />
      <div className="h-10 bg-[color:var(--sand)]/60 animate-pulse" />
      <p className="text-center text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] pt-2">
        Preparing secure checkout…
      </p>
    </div>
  );
}
