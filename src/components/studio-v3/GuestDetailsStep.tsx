/**
 * GuestDetailsStep — plan §I / K.11 inline Guest Details phase.
 *
 * Replaces the modal `FinalDetailsDialog` on the Studio V3 path so the
 * traveller experiences the details step as a natural continuation of
 * the composer (not a popup). Design goals:
 *
 * - Inline, single-column, mobile-first (393×588 baseline).
 * - Sticky primary CTA above the virtual keyboard (safe-area padded).
 * - Back preserves the composed itinerary + already-typed form values.
 * - Never triggers Stripe until validation passes.
 * - Reuses the exact `GuestDetails` payload contract from
 *   FinalDetailsDialog so the downstream `create-signature-checkout`
 *   edge function stays untouched.
 *
 * Presentational only — parent owns phase transitions and Stripe.
 */

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CtaButton } from "@/components/ui/CtaButton";
import { BookingCtaSkeleton } from "@/components/ui/BookingCtaSkeleton";
import type { GuestDetails, FinalDetailsInitial } from "@/components/checkout/FinalDetailsDialog";
import { prewarmStripeScript } from "@/components/checkout/BrandedCheckoutDrawer";
import { CompositionField } from "@/components/booking/CompositionField";
import {
  formatCompositionSummary,
  hydrateLegacyComposition,
  isCompositionComplete,
  totalGuests,
  type TravellerComposition,
} from "@/lib/checkout/composition";
import { ChargeSummaryLine, type ChargeQuote } from "@/components/checkout/ChargeSummaryLine";

import {
  isStudioBookingDateAllowed,
  minimumStudioBookingDateIso,
} from "@/components/studio-v3/dateGuards";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CollapsibleFieldGroup,
  GuestField,
  GuestFieldGroup,
  guestInputClass,
} from "@/components/checkout/guest-form-ui";

export interface GuestDetailsStepProps {
  /** Signature tour id — recorded on the checkout session for the host. */
  readonly tourId?: string;
  readonly initial?: FinalDetailsInitial;
  readonly journeyTitle?: string;
  readonly submitting?: boolean;
  readonly onBack: () => void;
  readonly onSubmit: (details: GuestDetails) => Promise<void> | void;
  /**
   * Fires ONCE per explicit submit, in parallel with `onSubmit`, when the
   * guest chooses to send their Signature Story to their inbox. Parent
   * owns the snapshot + revision hash + dispatch — this component only
   * forwards the address. Never blocks advancing to checkout; failures
   * are swallowed by the parent (email is never a checkout gate).
   *
   * Replaces the old `onEmailBlur` behaviour — the email is no longer
   * sent on blur. Only the explicit "Continue and email…" action fires.
   */
  readonly onStorySubmit?: (email: string) => Promise<void> | void;
  /**
   * Live charge quote for the composition currently in the form. MUST be
   * derived from the same math the flow sends to Stripe.
   */
  readonly priceQuote?: (c: { adults: number; minorAges: number[] }) => ChargeQuote | null;
  /** Date already chosen in the Studio. When present it is shown, not asked again. */
  readonly fixedTourDate?: string;
  /**
   * PREFLIGHT TRUTH — when the date and the traveller composition were already
   * committed before the day was designed, this step must NOT ask for them
   * again. They are shown read-only, with a link back to the ONE screen that
   * owns them. Submitting can never mutate them.
   */
  readonly lockedComposition?: { adults: number; minorAges: readonly number[] } | null;
  readonly onEditOperational?: () => void;
  /** Allows each checkout path to describe the next action honestly. */
  readonly submitLabel?: string;
  readonly className?: string;
  readonly testId?: string;
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export function GuestDetailsStep({
  initial,
  journeyTitle,
  submitting = false,
  onBack,
  onSubmit,
  onStorySubmit,
  priceQuote,
  fixedTourDate,
  lockedComposition = null,
  onEditOperational,
  submitLabel,
  className,
  testId,
}: GuestDetailsStepProps) {
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const fixedDate =
    fixedTourDate && isStudioBookingDateAllowed(fixedTourDate) ? fixedTourDate : null;
  const [tourDate, setTourDate] = useState(
    fixedDate ??
      (initial?.tourDate && isStudioBookingDateAllowed(initial.tourDate) ? initial.tourDate : ""),
  );
  const [composition, setComposition] = useState<TravellerComposition>(() =>
    lockedComposition
      ? { adults: lockedComposition.adults, minorAges: [...lockedComposition.minorAges] }
      : hydrateLegacyComposition(initial),
  );
  const [pickupAddress, setPickupAddress] = useState(initial?.pickupAddress ?? "");
  const [language, setLanguage] = useState<GuestDetails["language"]>(initial?.language ?? "en");
  const [mainContact, setMainContact] = useState("");
  // Secondary by default: only surfaced when the guest says they are booking
  // for someone else. Payload contract (mainContact) is unchanged.
  const [showMainContact, setShowMainContact] = useState(false);
  const [dietary, setDietary] = useState("");
  const [mobility, setMobility] = useState("");
  const [children, setChildren] = useState("");
  const [occasion, setOccasion] = useState("");
  const [guideNotes, setGuideNotes] = useState(initial?.guideNotes ?? "");

  // Track whether the story email dispatch has already fired for this
  // exact email address on this session — a rapid double-tap of Submit
  // must never enqueue two emails. Server also dedupes via
  // journeyRevision-scoped idempotency key, but this guards the UI.
  const storyDispatchedForRef = useRef<string | null>(null);

  // Duplicate-tap guard. The `submitting` prop is parent state and only
  // flips after a render, so two taps in the same tick could both reach
  // checkout. This ref closes that window synchronously.
  const inFlightRef = useRef(false);

  // Inline validation. Each key maps to a required control so we can render
  // an accessible message, set aria-invalid and focus the first offender.
  type FieldKey = "fullName" | "email" | "phone" | "tourDate" | "pickupAddress" | "composition";
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const fieldRefs = useRef<Partial<Record<FieldKey, HTMLElement | null>>>({});
  const errorProps = (key: FieldKey) =>
    errors[key]
      ? { "aria-invalid": true as const, "aria-describedby": `studio-v3-error-${key}` }
      : {};

  useEffect(() => {
    prewarmStripeScript();
  }, []);

  useEffect(() => {
    if (fixedDate) setTourDate(fixedDate);
  }, [fixedDate]);

  // P2 #16 — reset scroll to top on mount so travellers land on the
  // "Almost there" header, not mid-form.
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || inFlightRef.current) return;
    const nextErrors: Partial<Record<FieldKey, string>> = {};
    const missing: string[] = [];
    if (!fullName.trim()) {
      nextErrors.fullName = "Please enter the name the reservation is under.";
      missing.push("full name");
    }
    if (!email.trim() || !isEmail(email)) {
      nextErrors.email = "Please enter a valid email so we can send your confirmation.";
      missing.push("email");
    }
    if (!phone.trim()) {
      nextErrors.phone = "Please add a phone or WhatsApp number for your host.";
      missing.push("phone / WhatsApp");
    }
    if (!isStudioBookingDateAllowed(tourDate)) {
      nextErrors.tourDate = `Please choose a date from ${minimumStudioBookingDateIso()} onwards — we need three days, counted in Lisbon time.`;
      missing.push("tour date");
    }
    if (!pickupAddress.trim()) {
      nextErrors.pickupAddress = "Please tell us where the day should start.";
      missing.push("pickup address");
    }
    if (!isCompositionComplete(composition)) {
      nextErrors.composition = "Please add an age for every child so we can price honestly.";
      missing.push("age for every child");
    }
    setErrors(nextErrors);
    if (missing.length) {
      toast.error(`Please complete: ${missing.join(", ")}`);
      const order: FieldKey[] = [
        "fullName",
        "email",
        "phone",
        "tourDate",
        "composition",
        "pickupAddress",
      ];
      const firstKey = order.find((k) => nextErrors[k]);
      const target = firstKey ? fieldRefs.current[firstKey] : null;
      if (target) {
        target.focus({ preventScroll: true });
        target.scrollIntoView?.({ block: "center", behavior: "smooth" });
      }
      return;
    }

    // Fire the Signature Story email exactly once for this address per
    // submit action. Fire-and-forget: NEVER blocks advancing to checkout.
    const emailNormalised = email.trim().toLowerCase();
    if (
      onStorySubmit &&
      isEmail(emailNormalised) &&
      storyDispatchedForRef.current !== emailNormalised
    ) {
      storyDispatchedForRef.current = emailNormalised;
      // Intentionally not awaited — checkout continues regardless.
      Promise.resolve(onStorySubmit(emailNormalised)).catch((err) => {
        // Reset so a manual retry (if surfaced later) is possible; server
        // idempotency prevents duplicate delivery on genuine success.
        storyDispatchedForRef.current = null;
        console.warn("[GuestDetailsStep] story email dispatch failed", err);
      });
    }

    inFlightRef.current = true;
    try {
      await onSubmit({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        tourDate,
        guests: totalGuests(composition),
        adults: composition.adults,
        minorAges: [...composition.minorAges],
        pickupAddress: pickupAddress.trim(),
        language,
        mainContact: mainContact.trim() || fullName.trim(),
        dietary: dietary.trim() || undefined,
        mobility: mobility.trim() || undefined,
        children: children.trim() || undefined,
        occasion: occasion.trim() || undefined,
        guideNotes: guideNotes.trim() || undefined,
      });
    } finally {
      inFlightRef.current = false;
    }
  };

  const quote =
    priceQuote && isCompositionComplete(composition)
      ? priceQuote({ adults: composition.adults, minorAges: [...composition.minorAges] })
      : null;

  return (
    <section
      data-testid={testId ?? "studio-v3-guest-details"}
      aria-labelledby="studio-v3-guest-details-title"
      className={cn(
        "w-full max-w-[560px] mx-auto px-5 pt-8 pb-[calc(env(safe-area-inset-bottom)+7rem)]",
        className,
      )}
    >
      <button
        type="button"
        onClick={onBack}
        data-testid="studio-v3-guest-details-back"
        className="inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.22em] min-h-[44px]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
      >
        <ArrowLeft size={14} aria-hidden /> Back
      </button>

      <header className="mt-2 text-center">
        <Eyebrow>Almost there</Eyebrow>
        <h2
          id="studio-v3-guest-details-title"
          className="mt-3 text-[22px] leading-[1.25] [text-wrap:balance]"
          style={{
            fontFamily: "var(--font-editorial)",
            color: "var(--charcoal)",
            fontWeight: 500,
          }}
        >
          A few details so your host is ready.
        </h2>
        {journeyTitle ? (
          <p
            className="mt-2 text-[13.5px] italic"
            style={{
              fontFamily: "var(--font-editorial)",
              color: "color-mix(in oklab, var(--charcoal) 72%, transparent)",
            }}
          >
            {journeyTitle}
          </p>
        ) : null}
      </header>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-7">
        <GuestFieldGroup title="Who's coming">
          <GuestField
            label="Full name"
            required
            error={errors.fullName}
            errorId="studio-v3-error-fullName"
          >
            <input
              ref={(el) => {
                fieldRefs.current.fullName = el;
              }}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={guestInputClass}
              autoComplete="name"
              {...errorProps("fullName")}
            />
          </GuestField>
          {showMainContact ? (
            <GuestField label="Main contact person on the day" hint="If different from you">
              <input
                value={mainContact}
                onChange={(e) => setMainContact(e.target.value)}
                placeholder={fullName || "Same as above"}
                className={guestInputClass}
                data-testid="studio-v3-main-contact-input"
              />
            </GuestField>
          ) : (
            <button
              type="button"
              onClick={() => setShowMainContact(true)}
              data-testid="studio-v3-main-contact-toggle"
              className="inline-flex min-h-[44px] items-center text-[12.5px] font-medium text-[color:var(--teal)] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]/45"
            >
              Booking for someone else?
            </button>
          )}
          <GuestField label="Email" required error={errors.email} errorId="studio-v3-error-email">
            <input
              ref={(el) => {
                fieldRefs.current.email = el;
              }}
              {...errorProps("email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={guestInputClass}
              autoComplete="email"
              inputMode="email"
            />
          </GuestField>
          <GuestField
            label="Phone / WhatsApp"
            required
            error={errors.phone}
            errorId="studio-v3-error-phone"
          >
            <input
              ref={(el) => {
                fieldRefs.current.phone = el;
              }}
              {...errorProps("phone")}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+351 …"
              className={guestInputClass}
              autoComplete="tel"
              inputMode="tel"
            />
          </GuestField>
        </GuestFieldGroup>

        <GuestFieldGroup title="Your day">
          <GuestField
            label="Tour date"
            required={!fixedDate}
            hint={fixedDate ? "Already set — change it if you need to." : undefined}
            error={errors.tourDate}
            errorId="studio-v3-error-tourDate"
          >
            {fixedDate ? (
              <div
                data-testid="studio-v3-fixed-tour-date"
                className={guestInputClass + " flex items-center"}
                aria-label="Selected tour date"
              >
                {new Intl.DateTimeFormat("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(new Date(fixedDate + "T00:00:00"))}
                {onEditOperational ? (
                  <button
                    type="button"
                    onClick={onEditOperational}
                    data-testid="studio-v3-edit-date"
                    className="ml-auto min-h-[44px] px-2 text-[10.5px] uppercase tracking-[0.22em] font-semibold text-[color:var(--teal)]"
                  >
                    Change
                  </button>
                ) : null}
              </div>
            ) : (
              <input
                ref={(el) => {
                  fieldRefs.current.tourDate = el;
                }}
                {...errorProps("tourDate")}
                type="date"
                value={tourDate}
                min={minimumStudioBookingDateIso()}
                onChange={(e) => setTourDate(e.target.value)}
                className={guestInputClass}
              />
            )}
          </GuestField>
          <GuestField
            label="Who's travelling"
            required={!lockedComposition}
            hint={lockedComposition ? "Already set — change it if you need to." : undefined}
            as="div"
            error={errors.composition}
            errorId="studio-v3-error-composition"
          >
            <div
              ref={(el) => {
                fieldRefs.current.composition = el;
              }}
              tabIndex={-1}
              className="border border-[color:var(--border)] bg-[color:var(--ivory)] p-3"
            >
              {lockedComposition ? (
                <div
                  data-testid="studio-v3-locked-composition"
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-[13.5px] text-[color:var(--charcoal)]">
                    {formatCompositionSummary(composition)}
                  </span>
                  {onEditOperational ? (
                    <button
                      type="button"
                      onClick={onEditOperational}
                      data-testid="studio-v3-edit-party"
                      className="min-h-[44px] px-2 text-[10.5px] uppercase tracking-[0.22em] font-semibold text-[color:var(--teal)]"
                    >
                      Change
                    </button>
                  ) : null}
                </div>
              ) : (
                <CompositionField value={composition} onChange={setComposition} compact />
              )}
            </div>
            {lockedComposition ? null : (
              <p className="mt-1.5 text-[11px] leading-snug text-[color:var(--charcoal-soft)]">
                {isCompositionComplete(composition)
                  ? formatCompositionSummary(composition)
                  : "Add an age for every child so we can price honestly."}
              </p>
            )}
          </GuestField>

          <GuestField
            label="Pickup address / hotel"
            required
            error={errors.pickupAddress}
            errorId="studio-v3-error-pickupAddress"
          >
            <input
              ref={(el) => {
                fieldRefs.current.pickupAddress = el;
              }}
              {...errorProps("pickupAddress")}
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="Hotel, address or meeting point"
              className={guestInputClass}
            />
          </GuestField>
          <GuestField label="Preferred tour language" required as="div">
            <div className="grid grid-cols-2 border border-[color:var(--border)]">
              {(["en", "pt"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLanguage(l)}
                  aria-pressed={language === l}
                  className={[
                    "min-h-[44px] py-2.5 text-xs uppercase tracking-[0.18em] transition-colors",
                    language === l
                      ? "bg-[color:var(--charcoal)] text-[color:var(--ivory)]"
                      : "text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]",
                  ].join(" ")}
                >
                  {l}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-[color:var(--charcoal-soft)]">
              Spanish available on request — subject to guide availability.
            </p>
          </GuestField>
        </GuestFieldGroup>

        <CollapsibleFieldGroup
          title="Anything your host should know?"
          subtitle="Dietary, mobility, children, a special occasion — only if it matters."
          testId="studio-v3-guest-details-optional"
        >
          <GuestField label="Dietary restrictions">
            <input
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              className={guestInputClass}
            />
          </GuestField>
          <GuestField label="Mobility notes">
            <input
              value={mobility}
              onChange={(e) => setMobility(e.target.value)}
              className={guestInputClass}
            />
          </GuestField>
          <GuestField label="Children / child seats">
            <input
              value={children}
              onChange={(e) => setChildren(e.target.value)}
              className={guestInputClass}
            />
          </GuestField>
          <GuestField label="Special occasion">
            <input
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="Anniversary, birthday…"
              className={guestInputClass}
            />
          </GuestField>
          <GuestField label="Preferences for your day" hint="Optional">
            <textarea
              value={guideNotes}
              onChange={(e) => setGuideNotes(e.target.value)}
              placeholder="Winery preferences or anything not shown in the Studio"
              rows={3}
              className={`${guestInputClass} resize-none`}
            />
            <p className="mt-1.5 text-[11px] leading-snug text-[color:var(--charcoal-soft)]">
              We consider these preferences whenever possible. They do not delay payment or booking
              confirmation.
            </p>
          </GuestField>
        </CollapsibleFieldGroup>

        {/* Sticky CTA — sits above the virtual keyboard via safe-area padding
            on the wrapper. */}
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--border)] bg-[color:var(--ivory)]/95 backdrop-blur-sm px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
          data-testid="studio-v3-guest-details-cta-bar"
        >
          <div className="max-w-[560px] mx-auto">
            {priceQuote ? <ChargeSummaryLine quote={quote} className="mb-3" /> : null}
            {submitting ? (
              <BookingCtaSkeleton className="w-full" label="Opening secure checkout…" />
            ) : (
              <CtaButton
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                iconLeading={<Lock size={14} aria-hidden />}
                data-testid="studio-v3-guest-details-submit"
              >
                {submitLabel ?? "Continue to summary"}
              </CtaButton>
            )}
            <p className="mt-2 text-center text-[10px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
              Secure checkout · Final price shown at payment
            </p>
          </div>
        </div>
      </form>
    </section>
  );
}

export default GuestDetailsStep;
