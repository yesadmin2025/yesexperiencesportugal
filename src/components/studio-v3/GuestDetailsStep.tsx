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
import { ArrowLeft, Clock, Loader2, Lock } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CtaButton } from "@/components/ui/CtaButton";
import { BookingCtaSkeleton } from "@/components/ui/BookingCtaSkeleton";
import { supabase } from "@/integrations/supabase/client";
import type { GuestDetails, FinalDetailsInitial } from "@/components/checkout/FinalDetailsDialog";
import { prewarmStripeScript } from "@/components/checkout/BrandedCheckoutDrawer";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface GuestDetailsStepProps {
  /** Signature tour id used to resolve the Bókun product → time slots. */
  readonly tourId?: string;
  /** Optional explicit Bókun product id (Studio custom paths). */
  readonly bokunProductId?: string | number;
  readonly initial?: FinalDetailsInitial;
  readonly journeyTitle?: string;
  readonly submitting?: boolean;
  readonly onBack: () => void;
  readonly onSubmit: (details: GuestDetails) => Promise<void> | void;
  /**
   * Called once the traveller blurs a valid email. Parent owns the
   * snapshot + email dispatch — this component only forwards the address.
   * Debounced + deduped internally so repeated blurs of the same address
   * never fire twice.
   */
  readonly onEmailBlur?: (email: string) => Promise<void> | void;
  readonly className?: string;
  readonly testId?: string;
}

interface SlotOption {
  availabilityId: number;
  startTime: string;
  availabilityCount: number | null;
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export function GuestDetailsStep({
  tourId,
  bokunProductId,
  initial,
  journeyTitle,
  submitting = false,
  onBack,
  onSubmit,
  onEmailBlur,
  className,
  testId,
}: GuestDetailsStepProps) {
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [tourDate, setTourDate] = useState(initial?.tourDate ?? "");
  const [guests, setGuests] = useState(initial?.guests ?? 2);
  const [pickupAddress, setPickupAddress] = useState(initial?.pickupAddress ?? "");
  const [language, setLanguage] = useState<GuestDetails["language"]>(initial?.language ?? "en");
  const [mainContact, setMainContact] = useState("");
  const [dietary, setDietary] = useState("");
  const [mobility, setMobility] = useState("");
  const [children, setChildren] = useState("");
  const [occasion, setOccasion] = useState("");
  const [guideNotes, setGuideNotes] = useState(initial?.guideNotes ?? "");

  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotOption | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slotsMapped, setSlotsMapped] = useState(false);
  const slotsFetchToken = useRef(0);

  const [storySent, setStorySent] = useState(false);
  const sentEmailRef = useRef<string | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    prewarmStripeScript();
  }, []);

  useEffect(() => () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
  }, []);

  const triggerEmailBlur = (raw: string) => {
    const value = raw.trim().toLowerCase();
    if (!onEmailBlur || !isEmail(value)) return;
    if (sentEmailRef.current === value) return;
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => {
      sentEmailRef.current = value;
      Promise.resolve(onEmailBlur(value))
        .then(() => setStorySent(true))
        .catch(() => {
          // silent — email dispatch never blocks reservation flow
        });
    }, 400);
  };

  // Fetch availability whenever date or tour changes.
  useEffect(() => {
    if (!tourDate || (!tourId && !bokunProductId)) {
      setSlots([]);
      setSelectedSlot(null);
      setSlotsMapped(false);
      setSlotsError(null);
      return;
    }
    const token = ++slotsFetchToken.current;
    setSlotsLoading(true);
    setSlotsError(null);
    setSelectedSlot(null);
    void (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("bokun-availability", {
          body: { tourId, bokunProductId, date: tourDate },
        });
        if (token !== slotsFetchToken.current) return;
        if (error) throw error;
        const result = (data ?? {}) as {
          slots?: SlotOption[];
          mapped?: boolean;
          error?: string;
        };
        setSlotsMapped(Boolean(result.mapped));
        setSlots(Array.isArray(result.slots) ? result.slots : []);
        if (result.error === "availability_unavailable") {
          setSlotsError("Live availability unavailable — your host will confirm a time.");
        }
      } catch (e) {
        if (token !== slotsFetchToken.current) return;
        console.error("[GuestDetailsStep] availability fetch failed", e);
        setSlots([]);
        setSlotsError("Live availability unavailable — your host will confirm a time.");
      } finally {
        if (token === slotsFetchToken.current) setSlotsLoading(false);
      }
    })();
  }, [tourDate, tourId, bokunProductId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const missing: string[] = [];
    if (!fullName.trim()) missing.push("full name");
    if (!email.trim() || !isEmail(email)) missing.push("email");
    if (!phone.trim()) missing.push("phone / WhatsApp");
    if (!tourDate) missing.push("tour date");
    if (!guests || guests < 1) missing.push("number of guests");
    if (!pickupAddress.trim()) missing.push("pickup address");
    if (slotsMapped && slots.length > 0 && !selectedSlot) missing.push("start time");
    if (missing.length) {
      toast.error(`Please complete: ${missing.join(", ")}`);
      return;
    }
    await onSubmit({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      tourDate,
      startTime: selectedSlot?.startTime,
      bokunAvailabilityId: selectedSlot?.availabilityId,
      guests,
      pickupAddress: pickupAddress.trim(),
      language,
      mainContact: mainContact.trim() || fullName.trim(),
      dietary: dietary.trim() || undefined,
      mobility: mobility.trim() || undefined,
      children: children.trim() || undefined,
      occasion: occasion.trim() || undefined,
      guideNotes: guideNotes.trim() || undefined,
    });
  };

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
        <FieldGroup title="Who's coming">
          <Field label="Full name" required>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
              autoComplete="name"
            />
          </Field>
          <Field label="Main contact person" hint="If different">
            <input
              value={mainContact}
              onChange={(e) => setMainContact(e.target.value)}
              placeholder={fullName || "Same as above"}
              className={inputClass}
            />
          </Field>
          <Field label="Email" required>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (storySent && e.target.value.trim().toLowerCase() !== sentEmailRef.current) {
                  setStorySent(false);
                }
              }}
              onBlur={(e) => triggerEmailBlur(e.target.value)}
              className={inputClass}
              autoComplete="email"
              inputMode="email"
            />
            {storySent ? (
              <p className="mt-1.5 text-[11px] italic text-[color:var(--teal)]">
                Your Signature Story is on its way to your inbox.
              </p>
            ) : null}
          </Field>
          <Field label="Phone / WhatsApp" required>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+351 …"
              className={inputClass}
              autoComplete="tel"
              inputMode="tel"
            />
          </Field>
        </FieldGroup>

        <FieldGroup title="Your day">
          <Field label="Tour date" required>
            <input
              type="date"
              value={tourDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setTourDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Guests" required>
            <div className="flex items-center border border-[color:var(--border)] bg-[color:var(--ivory)]">
              <button
                type="button"
                onClick={() => setGuests((g) => Math.max(1, g - 1))}
                className="min-w-[44px] min-h-[44px] px-3 py-2.5 text-sm hover:bg-[color:var(--sand)]"
                aria-label="Decrease guests"
              >
                −
              </button>
              <span className="flex-1 text-center text-sm tabular-nums">{guests}</span>
              <button
                type="button"
                onClick={() => setGuests((g) => Math.min(24, g + 1))}
                className="min-w-[44px] min-h-[44px] px-3 py-2.5 text-sm hover:bg-[color:var(--sand)]"
                aria-label="Increase guests"
              >
                +
              </button>
            </div>
          </Field>
          {(tourId || bokunProductId) && tourDate ? (
            <Field
              label="Start time"
              required={slotsMapped && slots.length > 0}
              hint={
                slotsLoading
                  ? "Checking…"
                  : slots.length > 0
                    ? `${slots.length} time${slots.length > 1 ? "s" : ""} available`
                    : undefined
              }
            >
              {slotsLoading ? (
                <div className="flex items-center gap-2 border border-[color:var(--border)] px-3 py-2.5 text-sm text-[color:var(--charcoal-soft)]">
                  <Loader2 size={14} className="animate-spin" />
                  Checking live availability…
                </div>
              ) : slots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((s) => {
                    const active = selectedSlot?.availabilityId === s.availabilityId;
                    return (
                      <button
                        key={s.availabilityId}
                        type="button"
                        onClick={() => setSelectedSlot(s)}
                        aria-pressed={active}
                        className={[
                          "flex items-center justify-center gap-1.5 border px-2.5 py-2.5 text-sm transition-colors min-h-[44px]",
                          active
                            ? "border-[color:var(--teal)] bg-[color:var(--teal)] text-[color:var(--ivory)]"
                            : "border-[color:var(--border)] bg-[color:var(--ivory)] text-[color:var(--charcoal)] hover:border-[color:var(--gold)]",
                        ].join(" ")}
                      >
                        <Clock size={12} aria-hidden /> {s.startTime}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[12px] text-[color:var(--charcoal-soft)] border border-dashed border-[color:var(--border)] px-3 py-2.5">
                  {slotsError ??
                    (slotsMapped
                      ? "No live slots for this date — your host will confirm a start time after booking."
                      : "Your host will confirm a start time after booking.")}
                </p>
              )}
            </Field>
          ) : null}
          <Field label="Pickup address / hotel" required>
            <input
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="Hotel, address or meeting point"
              className={inputClass}
            />
          </Field>
          <Field label="Preferred tour language" required>
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
          </Field>
        </FieldGroup>

        <FieldGroup title="Anything we should know" optional>
          <Field label="Dietary restrictions">
            <input
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Mobility notes">
            <input
              value={mobility}
              onChange={(e) => setMobility(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Children / child seats">
            <input
              value={children}
              onChange={(e) => setChildren(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Special occasion">
            <input
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="Anniversary, birthday…"
              className={inputClass}
            />
          </Field>
          <Field label="Notes for the guide">
            <textarea
              value={guideNotes}
              onChange={(e) => setGuideNotes(e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </Field>
        </FieldGroup>

        {/* Sticky CTA — sits above the virtual keyboard via safe-area padding
            on the wrapper. Uses fixed positioning so it stays reachable in
            the ≤ 6-viewport budget from Step 8. */}
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--border)] bg-[color:var(--ivory)]/95 backdrop-blur-sm px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
          data-testid="studio-v3-guest-details-cta-bar"
        >
          <div className="max-w-[560px] mx-auto">
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
                Continue to summary
              </CtaButton>
            )}
            <p className="mt-2 text-center text-[10px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]/80">
              Secure checkout · Final price shown at payment
            </p>
          </div>
        </div>
      </form>
    </section>
  );
}

const inputClass =
  "w-full min-h-[44px] border border-[color:var(--border)] bg-[color:var(--ivory)] px-3 py-2.5 text-[15px] focus:border-[color:var(--gold)] focus:outline-none";

function FieldGroup({
  title,
  optional,
  children,
}: {
  title: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--charcoal)]">
          {title}
        </h3>
        {optional ? (
          <span className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]/70">
            Optional
          </span>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between text-[10px] uppercase tracking-[0.25em] text-[color:var(--charcoal-soft)] mb-1.5">
        <span>
          {label}
          {required ? (
            <span className="text-[color:var(--teal)] ml-1" aria-hidden>
              *
            </span>
          ) : null}
          {required ? <span className="sr-only"> (required)</span> : null}
        </span>
        {hint ? (
          <span className="normal-case tracking-normal text-[10px] text-[color:var(--charcoal-soft)]/70">
            {hint}
          </span>
        ) : null}
      </div>
      {children}
    </label>
  );
}

export default GuestDetailsStep;
