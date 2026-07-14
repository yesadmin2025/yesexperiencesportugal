import { useEffect, useMemo, useRef, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Lock, X, MapPin, Clock, Users, Calendar, AlertCircle } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CredentialStrip } from "@/components/ui/CredentialStrip";
import { useIsMobile } from "@/hooks/use-mobile";
import type { QuoteLine, QuoteAddOnLine } from "@/lib/pricing/resolveInternalQuote";

/**
 * BrandedCheckoutDrawer — Stripe Embedded Checkout inside an ivory,
 * brand-styled drawer. Consumes internal QuoteLines only.
 */

export interface CheckoutSummary {
  tourTitle: string;
  region?: string;
  durationHours?: string | number;
  guests: number;
  dateExact?: string | null;
  startTime?: string | null;
  pickupLabel?: string | null;
  priceLines?: QuoteLine[];
  addOnLines?: QuoteAddOnLine[];
  totalEur?: number | null;
  heroSrc?: string | null;
  beats?: string[];
  flowLabel?: "Signature" | "Tailored" | "Studio";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientSecret: string | null;
  publishableKey: string | null;
  summary: CheckoutSummary;
  onComplete?: (sessionId: string | null) => void;
}

const stripeCache = new Map<string, Promise<Stripe | null>>();
function getStripePromise(pk: string): Promise<Stripe | null> {
  if (!pk) return Promise.resolve(null);
  const cached = stripeCache.get(pk);
  if (cached) return cached;
  const p = loadStripe(pk);
  stripeCache.set(pk, p);
  return p;
}

export function prewarmStripe(publishableKey: string | undefined | null) {
  if (publishableKey) void getStripePromise(publishableKey);
}

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
  const [timedOut, setTimedOut] = useState(false);

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

  useEffect(() => {
    if (!open) {
      setTimedOut(false);
      return;
    }
    if (clientSecret) {
      setTimedOut(false);
      return;
    }
    const t = window.setTimeout(() => setTimedOut(true), 12_000);
    return () => window.clearTimeout(t);
  }, [open, clientSecret]);

  const total = summary.totalEur ?? null;

  useEffect(() => {
    if (open) prewarmStripeScript();
  }, [open]);

  const isMobile = useIsMobile();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={
          isMobile
            ? "w-full h-[94dvh] max-h-[94dvh] p-0 bg-[color:var(--ivory)] border-t border-[color:var(--border)] flex flex-col gap-0 rounded-t-2xl [&>button.absolute]:hidden"
            : "w-full sm:max-w-[560px] p-0 bg-[color:var(--ivory)] border-l border-[color:var(--border)] flex flex-col gap-0 [&>button.absolute]:hidden"
        }
        data-checkout="embedded"
      >
        <div className="relative px-5 sm:px-7 pt-6 pb-4 border-b border-[color:var(--border)] bg-[color:var(--ivory)]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close checkout"
            className="absolute top-4 right-4 p-2 text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
          >
            <X size={18} />
          </button>
          <Eyebrow>{summary.flowLabel ?? "Signature"} · Secure checkout</Eyebrow>
          <SheetTitle className="serif text-[1.35rem] leading-tight text-[color:var(--charcoal)] mt-2 font-normal">
            {summary.tourTitle}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Secure checkout for {summary.tourTitle}.
          </SheetDescription>
        </div>

        <div className="px-5 sm:px-7 py-2.5 border-b border-[color:var(--border)] bg-[color:var(--ivory)]">
          <CredentialStrip variant="light" compact />
        </div>

        <div className="overflow-y-auto flex-1">
          <ExperienceSummaryCard summary={summary} total={total} />

          <div className="px-2 sm:px-3 pb-6">
            {clientSecret && publishableKey && stripePromise && options ? (
              <div className="relative bg-white">
                <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            ) : timedOut ? (
              <CheckoutTimeout onRetry={() => onOpenChange(false)} />
            ) : (
              <CheckoutSkeleton />
            )}
          </div>
        </div>

        <div className="px-5 sm:px-7 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] border-t border-[color:var(--border)] bg-[color:var(--sand)]/40">
          <p className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
            <Lock size={11} /> Secure checkout · 256-bit encrypted
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
          <p className="text-[10px] uppercase tracking-[0.26em] text-[color:var(--charcoal)]">
            Your day
          </p>
          <h3 className="serif text-[1.05rem] leading-snug text-[color:var(--charcoal)] mt-1 truncate">
            {summary.tourTitle}
          </h3>
          <ul className="mt-2.5 space-y-1 text-[12.5px] text-[color:var(--charcoal-soft)]">
            {summary.region ? <Meta icon={<MapPin size={11} />}>{summary.region}</Meta> : null}
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
          {summary.beats.map((b) => (
            <li key={b} className="flex gap-2 text-[12.5px] leading-snug text-[color:var(--charcoal)]">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-[color:var(--gold)] shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {summary.priceLines && summary.priceLines.length > 0 ? (
        <div className="mt-4 pt-3 border-t border-[color:var(--border)]">
          <p className="text-[10px] uppercase tracking-[0.26em] text-[color:var(--charcoal)]">
            Price breakdown
          </p>
          <ul className="mt-2 space-y-1.5">
            {summary.priceLines.map((line) => (
              <li key={line.band} className="flex items-baseline justify-between gap-3 text-[12px] text-[color:var(--charcoal)]">
                <span className="min-w-0">{line.label} × {line.quantity}</span>
                <span className="tabular-nums shrink-0">{formatEur(line.subtotalEur)}</span>
              </li>
            ))}
            {(summary.addOnLines ?? []).map((line) => (
              <li key={line.id} className="flex items-baseline justify-between gap-3 text-[12px] text-[color:var(--charcoal)]">
                <span className="min-w-0">{line.label} × {line.quantity}</span>
                <span className="tabular-nums shrink-0">{formatEur(line.subtotalEur)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {total != null ? (
        <div className="mt-4 pt-3 border-t border-[color:var(--border)] flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-[0.26em] text-[color:var(--charcoal-soft)]">
            Total
          </span>
          <span className="serif text-[1.4rem] text-[color:var(--charcoal)]">{formatEur(total)}</span>
        </div>
      ) : null}
    </div>
  );
}

function formatEur(value: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
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

function CheckoutTimeout({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="px-4 py-8 mx-2 my-4 flex flex-col items-center text-center gap-3 border border-[color:var(--border)] bg-[color:var(--ivory)]"
    >
      <AlertCircle size={22} className="text-[color:var(--charcoal)]" aria-hidden />
      <p className="text-[13px] leading-relaxed text-[color:var(--charcoal)] max-w-[36ch]">
        Checkout is taking longer than usual. Close this and try again — no card was charged.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 text-[11.5px] uppercase tracking-[0.22em] font-semibold rounded-[2px] bg-[color:var(--teal)] text-[color:var(--ivory)] hover:bg-[color:var(--charcoal)] transition-colors"
      >
        Close and retry
      </button>
    </div>
  );
}
