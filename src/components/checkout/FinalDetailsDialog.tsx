import { useEffect, useRef, useState } from "react";
import { Clock, Loader2, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { prewarmStripeScript } from "@/components/checkout/BrandedCheckoutDrawer";

/**
 * Final details before payment — the last step before Stripe checkout
 * in every instant-book path (Signature, Tailored Signature, Studio).
 *
 * This is *checkout*, not an enquiry: required fields ensure the local
 * host has everything ready; optional fields flow through to Bókun
 * unchanged. The collected payload is passed verbatim into the existing
 * `create-signature-checkout` body under `guestDetails`.
 */
export interface GuestDetails {
  fullName: string;
  email: string;
  phone: string;
  tourDate: string;
  /** "HH:mm" — present when a Bókun availability slot was selected. */
  startTime?: string;
  /** Bókun availability slot id, when one was selected. */
  bokunAvailabilityId?: number;
  guests: number;
  pickupAddress: string;
  language: "en" | "pt" | "es" | "fr";
  mainContact: string;
  dietary?: string;
  mobility?: string;
  children?: string;
  occasion?: string;
  guideNotes?: string;
}

export interface FinalDetailsInitial {
  tourDate?: string | null;
  guests?: number;
  pickupAddress?: string | null;
  language?: GuestDetails["language"];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (details: GuestDetails) => Promise<void> | void;
  initial?: FinalDetailsInitial;
  submitting?: boolean;
  /** Signature tour id used to resolve the Bókun product → time slots. */
  tourId?: string;
  /** Optional explicit Bókun product id (Studio custom paths). */
  bokunProductId?: string | number;
}

interface SlotOption {
  availabilityId: number;
  startTime: string;
  availabilityCount: number | null;
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export function FinalDetailsDialog({
  open,
  onOpenChange,
  onConfirm,
  initial,
  submitting = false,
  tourId,
  bokunProductId,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tourDate, setTourDate] = useState(initial?.tourDate ?? "");
  const [guests, setGuests] = useState(initial?.guests ?? 2);
  const [pickupAddress, setPickupAddress] = useState(initial?.pickupAddress ?? "");
  const [language, setLanguage] = useState<GuestDetails["language"]>(initial?.language ?? "en");
  const [mainContact, setMainContact] = useState("");
  const [dietary, setDietary] = useState("");
  const [mobility, setMobility] = useState("");
  const [children, setChildren] = useState("");
  const [occasion, setOccasion] = useState("");
  const [guideNotes, setGuideNotes] = useState("");

  // Bókun time-slot state
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotOption | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slotsMapped, setSlotsMapped] = useState(false);
  const slotsFetchToken = useRef(0);

  useEffect(() => {
    if (!open) return;
    prewarmStripeScript();
    if (initial?.tourDate) setTourDate(initial.tourDate);
    if (initial?.guests) setGuests(initial.guests);
    if (initial?.pickupAddress) setPickupAddress(initial.pickupAddress);
    if (initial?.language) setLanguage(initial.language);
    // mainContact defaults to fullName if left blank — keeps the form short.
  }, [open, initial?.tourDate, initial?.guests, initial?.pickupAddress, initial?.language]);

  // Fetch availability whenever date or tour changes.
  useEffect(() => {
    if (!open) return;
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
        console.error("[FinalDetailsDialog] availability fetch failed", e);
        setSlots([]);
        setSlotsError("Live availability unavailable — your host will confirm a time.");
      } finally {
        if (token === slotsFetchToken.current) setSlotsLoading(false);
      }
    })();
  }, [open, tourDate, tourId, bokunProductId]);

  const handleSubmit = async () => {
    if (submitting) return;
    const missing: string[] = [];
    if (!fullName.trim()) missing.push("full name");
    if (!email.trim() || !isEmail(email)) missing.push("email");
    if (!phone.trim()) missing.push("phone / WhatsApp");
    if (!tourDate) missing.push("tour date");
    if (!guests || guests < 1) missing.push("number of guests");
    if (!pickupAddress.trim()) missing.push("pickup address");
    // Time slot is only required when Bókun returned slots for this date.
    if (slotsMapped && slots.length > 0 && !selectedSlot) missing.push("start time");
    if (missing.length) {
      toast.error(`Please complete: ${missing.join(", ")}`);
      return;
    }
    await onConfirm({
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 bg-[color:var(--ivory)] border border-[color:var(--border)] max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader className="px-5 sm:px-7 pt-6 pb-3 border-b border-[color:var(--border)]">
          <Eyebrow>Almost there</Eyebrow>
          <DialogTitle className="serif text-[1.35rem] leading-tight text-[color:var(--charcoal)] mt-2">
            Final details before payment
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[color:var(--charcoal-soft)] mt-1.5 leading-relaxed">
            So your local host has everything ready — then secure checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-5 sm:px-7 py-5 space-y-5">
          <Section title="Who's coming">
            <Row>
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
            </Row>
            <Row>
              <Field label="Email" required>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  autoComplete="email"
                />
              </Field>
              <Field label="Phone / WhatsApp" required>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+351 …"
                  className={inputClass}
                  autoComplete="tel"
                />
              </Field>
            </Row>
          </Section>

          <Section title="Your day">
            <Row>
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
                    className="px-3 py-2.5 text-sm hover:bg-[color:var(--sand)]"
                    aria-label="Decrease guests"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center text-sm">{guests}</span>
                  <button
                    type="button"
                    onClick={() => setGuests((g) => Math.min(24, g + 1))}
                    className="px-3 py-2.5 text-sm hover:bg-[color:var(--sand)]"
                    aria-label="Increase guests"
                  >
                    +
                  </button>
                </div>
              </Field>
            </Row>
            {(tourId || bokunProductId) && tourDate ? (
              <Field
                label="Start time"
                required={slotsMapped && slots.length > 0}
                hint={
                  slotsLoading
                    ? "Checking live availability…"
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
              <div className="grid grid-cols-4 border border-[color:var(--border)]">
                {(["en", "pt", "es", "fr"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLanguage(l)}
                    aria-pressed={language === l}
                    className={[
                      "py-2.5 text-xs uppercase tracking-[0.18em] transition-colors",
                      language === l
                        ? "bg-[color:var(--charcoal)] text-[color:var(--ivory)]"
                        : "text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]",
                    ].join(" ")}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Field>
          </Section>

          <Section title="Anything we should know" optional>
            <Row>
              <Field label="Dietary restrictions">
                <input value={dietary} onChange={(e) => setDietary(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Mobility notes">
                <input value={mobility} onChange={(e) => setMobility(e.target.value)} className={inputClass} />
              </Field>
            </Row>
            <Row>
              <Field label="Children / child seats">
                <input value={children} onChange={(e) => setChildren(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Special occasion">
                <input
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  placeholder="Anniversary, birthday…"
                  className={inputClass}
                />
              </Field>
            </Row>
            <Field label="Notes for the guide">
              <textarea
                value={guideNotes}
                onChange={(e) => setGuideNotes(e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </Field>
          </Section>
        </div>

        <DialogFooter className="px-5 sm:px-7 py-4 border-t border-[color:var(--border)] bg-[color:var(--sand)]/40 sm:flex-col sm:items-stretch sm:space-x-0 gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] disabled:opacity-60 disabled:cursor-not-allowed text-[color:var(--ivory)] px-5 py-3.5 text-sm tracking-wide transition-all min-h-[52px]"
          >
            {submitting ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Opening secure checkout…
              </>
            ) : (
              <>
                <Lock size={14} /> Continue to secure checkout
              </>
            )}
          </button>
          <p className="text-center text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]/80">
            Secure checkout · Final price shown before payment
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const inputClass =
  "w-full border border-[color:var(--border)] bg-[color:var(--ivory)] px-3 py-2.5 text-sm focus:border-[color:var(--gold)] focus:outline-none";

function Section({
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
        {optional && (
          <span className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]/70">
            Optional
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
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
    <div>
      <label className="flex items-baseline justify-between text-[10px] uppercase tracking-[0.25em] text-[color:var(--charcoal-soft)] mb-1.5">
        <span>
          {label}
          {required && <span className="text-[color:var(--gold)] ml-1">*</span>}
        </span>
        {hint && (
          <span className="normal-case tracking-normal text-[10px] text-[color:var(--charcoal-soft)]/70">
            {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
