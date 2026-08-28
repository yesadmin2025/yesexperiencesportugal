import type React from "react";
import { useEffect, useState } from "react";

import { Lock } from "lucide-react";
import { CtaButton } from "@/components/ui/CtaButton";
import { BookingCtaSkeleton } from "@/components/ui/BookingCtaSkeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
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
  GuestField,
  GuestFieldGroup,
  GuestRow,
  guestInputClass,
} from "@/components/checkout/guest-form-ui";

/**
 * Final details before payment — the last step before Stripe checkout
 * in every instant-book path (Signature, Tailored Signature, Studio).
 *
 * Required fields ensure the local host has everything ready; optional
 * fields flow through to the host unchanged. The collected payload is
 * passed verbatim into the `create-signature-checkout` body under
 * `guestDetails`.
 */
export interface GuestDetails {
  fullName: string;
  email: string;
  phone: string;
  tourDate: string;
  /** "HH:mm" — optional preferred start time. */
  startTime?: string;
  /** Total headcount = adults + minorAges.length. Kept for downstream code
   *  that hasn't been fully migrated; NEVER used for pricing when minors
   *  are present — the server prices from `adults` + `minorAges`. */
  guests: number;
  /** Adults 18+ (required, min 1). */
  adults: number;
  /** Exact integer age per minor (0..17). Empty when adults-only. */
  minorAges: number[];
  pickupAddress: string;
  language: "en" | "pt";
  mainContact: string;
  dietary?: string;
  mobility?: string;
  children?: string;
  occasion?: string;
  guideNotes?: string;
}

export interface FinalDetailsInitial {
  tourDate?: string | null;
  /** Legacy adults-only count — hydrated as `{adults: guests, minorAges: []}`. */
  guests?: number;
  adults?: number;
  minorAges?: number[];
  pickupAddress?: string | null;
  language?: GuestDetails["language"];
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  guideNotes?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (details: GuestDetails) => Promise<void> | void;
  initial?: FinalDetailsInitial;
  submitting?: boolean;
  /** Signature tour id — recorded on the checkout session for the host. */
  tourId?: string;
  /**
   * Live charge quote for the composition currently in the form. MUST be
   * derived from the same math the flow sends to Stripe. Return `null`
   * when the selection isn't priceable yet.
   */
  priceQuote?: (c: { adults: number; minorAges: number[] }) => ChargeQuote | null;
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export function FinalDetailsDialog({
  open,
  onOpenChange,
  onConfirm,
  initial,
  submitting = false,
  priceQuote,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tourDate, setTourDate] = useState(initial?.tourDate ?? "");
  const [composition, setComposition] = useState<TravellerComposition>(() =>
    hydrateLegacyComposition(initial),
  );
  const [pickupAddress, setPickupAddress] = useState(initial?.pickupAddress ?? "");
  const [language, setLanguage] = useState<GuestDetails["language"]>(initial?.language ?? "en");
  const [mainContact, setMainContact] = useState("");
  const [dietary, setDietary] = useState("");
  const [mobility, setMobility] = useState("");
  const [children, setChildren] = useState("");
  const [occasion, setOccasion] = useState("");
  const [guideNotes, setGuideNotes] = useState("");
  const [editDay, setEditDay] = useState(false);
  const [altContact, setAltContact] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(false);


  useEffect(() => {
    if (!open) return;
    prewarmStripeScript();
    if (initial?.tourDate) setTourDate(initial.tourDate);
    if (initial) setComposition(hydrateLegacyComposition(initial));
    if (initial?.pickupAddress) setPickupAddress(initial.pickupAddress);
    if (initial?.language) setLanguage(initial.language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const compositionComplete = isCompositionComplete(composition);
  const quote =
    priceQuote && compositionComplete
      ? priceQuote({ adults: composition.adults, minorAges: [...composition.minorAges] })
      : null;

  const handleSubmit = async () => {
    if (submitting) return;
    const missing: string[] = [];
    if (!fullName.trim()) missing.push("full name");
    if (!email.trim() || !isEmail(email)) missing.push("email");
    if (!phone.trim()) missing.push("phone / WhatsApp");
    if (!tourDate) missing.push("tour date");
    if (!pickupAddress.trim()) missing.push("pickup address");
    if (!compositionComplete) missing.push("age for every child");
    if (missing.length) {
      toast.error(`Please complete: ${missing.join(", ")}`);
      return;
    }
    await onConfirm({
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 bg-[color:var(--ivory)] border border-[color:var(--border)] max-h-[92vh] overflow-hidden flex flex-col">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          className="flex flex-col flex-1 overflow-hidden"
          noValidate
        >
          <DialogHeader className="px-5 sm:px-7 pt-6 pb-3 border-b border-[color:var(--border)]">
            <DialogTitle className="serif text-[1.35rem] leading-tight text-[color:var(--charcoal)]">
              Your details
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[color:var(--charcoal-soft)] mt-1.5 leading-relaxed">
              So your local host has everything ready.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto px-5 sm:px-7 py-5 space-y-5">
            {/* Already-known day + party: compact summary with Edit, never re-asked. */}
            <div
              data-testid="final-details-known-summary"
              className="border border-[color:var(--border)] bg-[color:var(--sand)]/30 px-3.5 py-3"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <p className="min-w-0 text-[13px] leading-snug text-[color:var(--charcoal)]">
                  {tourDate ? formatKnownDate(tourDate) : "Date not set"}
                  <span className="mx-1.5 text-[color:var(--charcoal-soft)]">·</span>
                  <span className="text-[color:var(--charcoal-soft)]">
                    {compositionComplete
                      ? formatCompositionSummary(composition)
                      : "Add an age for every child"}
                  </span>
                </p>
                <button
                  type="button"
                  data-testid="final-details-edit-day"
                  aria-expanded={editDay}
                  onClick={() => setEditDay((v) => !v)}
                  className="shrink-0 min-h-[44px] px-2 text-[11px] uppercase tracking-[0.2em] text-[color:var(--teal)] hover:text-[color:var(--charcoal)]"
                >
                  {editDay ? "Done" : "Edit"}
                </button>
              </div>

              {editDay ? (
                <div className="mt-3 space-y-4" data-testid="final-details-day-editor">
                  <GuestField label="Tour date" required>
                    <input
                      type="date"
                      value={tourDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setTourDate(e.target.value)}
                      className={guestInputClass}
                    />
                  </GuestField>
                  <GuestField label="Who's travelling" required as="div">
                    <div className="border border-[color:var(--border)] bg-[color:var(--ivory)] p-3">
                      <CompositionField value={composition} onChange={setComposition} compact />
                    </div>
                  </GuestField>
                </div>
              ) : null}
            </div>

            <GuestFieldGroup title="Who's coming">
              <GuestField label="Full name" required>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={guestInputClass}
                  autoComplete="name"
                />
              </GuestField>
              <GuestRow>
                <GuestField label="Email" required>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={guestInputClass}
                    autoComplete="email"
                  />
                </GuestField>
                <GuestField label="Phone / WhatsApp" required>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+351 …"
                    className={guestInputClass}
                    autoComplete="tel"
                  />
                </GuestField>
              </GuestRow>
              <GuestField label="Pickup address / hotel" required>
                <input
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Hotel, address or meeting point"
                  className={guestInputClass}
                />
              </GuestField>
              {altContact ? (
                <GuestField label="Main contact person">
                  <input
                    value={mainContact}
                    onChange={(e) => setMainContact(e.target.value)}
                    placeholder={fullName || "Full name"}
                    className={guestInputClass}
                  />
                </GuestField>
              ) : (
                <button
                  type="button"
                  data-testid="final-details-alt-contact-toggle"
                  onClick={() => setAltContact(true)}
                  className="min-h-[44px] text-left text-[12px] text-[color:var(--teal)] hover:text-[color:var(--charcoal)]"
                >
                  Someone else is the main contact
                </button>
              )}
            </GuestFieldGroup>

            <Disclosure
              label="Anything we should know?"
              open={extrasOpen}
              onToggle={() => setExtrasOpen((v) => !v)}
              testId="final-details-extras"
            >
              <div className="space-y-4 pt-3">
                <GuestRow>
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
                </GuestRow>
                <GuestRow>
                  <GuestField
                    label="Child seats or logistics"
                    hint="Operational notes only — ages above set the price."
                  >
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
                </GuestRow>
                <GuestField label="Preferred tour language" as="div">
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
                </GuestField>
                <GuestField label="Notes for the guide">
                  <textarea
                    value={guideNotes}
                    onChange={(e) => setGuideNotes(e.target.value)}
                    rows={3}
                    className={`${guestInputClass} resize-none`}
                  />
                </GuestField>
              </div>
            </Disclosure>
          </div>

          <DialogFooter className="px-5 sm:px-7 py-4 border-t border-[color:var(--border)] bg-[color:var(--sand)]/40 sm:flex-col sm:items-stretch sm:space-x-0 gap-2">
            {priceQuote ? <ChargeSummaryLine quote={quote} /> : null}
            {submitting ? (
              <BookingCtaSkeleton className="w-full" label="Opening secure checkout…" />
            ) : (
              <CtaButton
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                iconLeading={<Lock size={14} aria-hidden />}
              >
                Continue to payment
              </CtaButton>
            )}
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatKnownDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" });
}

function Disclosure({
  label,
  open,
  onToggle,
  testId,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-[color:var(--border)] pt-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        data-testid={`${testId}-toggle`}
        className="flex min-h-[44px] w-full items-center justify-between gap-3 text-left text-[12.5px] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
      >
        <span>{label}</span>
        <ChevronDown
          size={14}
          aria-hidden
          className={open ? "rotate-180 transition-transform" : "transition-transform"}
        />
      </button>
      {open ? <div data-testid={testId}>{children}</div> : null}
    </div>
  );
}

