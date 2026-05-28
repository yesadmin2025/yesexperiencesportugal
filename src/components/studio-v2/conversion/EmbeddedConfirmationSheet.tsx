/**
 * Studio v2 — Embedded Confirmation Sheet (Instant path).
 *
 * Slides up over the dimmed itinerary canvas. Captures the minimum
 * required details, persists the draft, marks it submitted via the
 * existing confirmCustomBookingDraft serverFn, and resolves into a
 * cinematic coda — never a hard redirect.
 *
 * Test-mode honest: a local designer confirms timings + final
 * investment before any charge. The architecture is Stripe-ready —
 * when payments go live, drop EmbeddedCheckoutProvider in place of
 * the coda and reuse the same draft token flow.
 */

import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, Check } from "lucide-react";
import {
  confirmCustomBookingDraft,
  createCustomBookingDraft,
} from "@/lib/studio-v2/bookings.functions";
import type { TravelerProfile } from "@/lib/studio-v2/profile";
import type { RefineStop } from "@/components/studio-v2/RefineStage";
import { trackBuilderEvent } from "@/lib/builder-analytics";

interface Props {
  open: boolean;
  onClose: () => void;
  profile: TravelerProfile;
  region: string;
  archetype?: string;
  stops: RefineStop[];
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function EmbeddedConfirmationSheet({
  open, onClose, profile, region, archetype, stops,
}: Props) {
  const createDraft = useServerFn(createCustomBookingDraft);
  const confirm = useServerFn(confirmCustomBookingDraft);

  const [name, setName] = useState(profile.name ?? "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const guestsDefault =
    (profile.group?.adults ?? 0) + (profile.group?.teens ?? 0) + (profile.group?.children ?? 0) || 2;
  const [guests, setGuests] = useState(guestsDefault);
  const [date, setDate] = useState(profile.ops?.preferredDate ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const totals = useMemo(() => {
    let km = 0;
    let exp = 0;
    for (let i = 0; i < stops.length; i++) {
      exp += stops[i].duration_minutes ?? 60;
      if (i > 0) km += haversineKm(stops[i - 1], stops[i]);
    }
    return { km: Math.round(km), drive: Math.round((km / 55) * 60), experience: exp };
  }, [stops]);

  useEffect(() => {
    if (!open) return;
    void trackBuilderEvent("studio_v2_instant_sheet_open", { archetype, region });
  }, [open, archetype, region]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const valid = name.trim().length >= 2 && /.+@.+\..+/.test(email) && guests >= 1;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await createDraft({
        data: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          profile: profile as any,
          region,
          archetype,
          stops: stops.map((s) => ({
            key: s.key,
            region_key: s.region_key,
            label: s.label,
            blurb: s.blurb ?? null,
            tag: s.tag ?? null,
            lat: s.lat,
            lng: s.lng,
            duration_minutes: s.duration_minutes,
            source_tour_keys: s.source_tour_keys ?? [],
          })),
          totalMinutes: totals.experience,
          totalDriveMinutes: totals.drive,
          totalKm: totals.km,
        },
      });
      await confirm({
        data: {
          draftToken: r.draftToken,
          contactName: name.trim(),
          contactEmail: email.trim(),
          contactPhone: phone.trim() || undefined,
          preferredDate: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
          guests,
        },
      });
      void trackBuilderEvent("studio_v2_instant_confirm", { draftToken: r.draftToken });
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "We could not secure your day.");
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm your day"
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
      style={{ background: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
    >
      <div
        className="relative w-full max-w-[560px] rounded-t-[6px] sm:rounded-[6px] p-6 sm:p-8"
        style={{
          background: "var(--ivory)",
          boxShadow: "0 -20px 60px -20px rgba(0,0,0,0.5)",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2"
          style={{ color: "var(--charcoal)" }}
        >
          <X className="h-4 w-4" />
        </button>

        {done ? (
          <div className="py-6 text-center">
            <div
              className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full"
              style={{
                background: "color-mix(in oklab, var(--gold) 22%, transparent)",
                color: "var(--charcoal)",
                border: "1px solid color-mix(in oklab, var(--gold) 60%, transparent)",
              }}
            >
              <Check className="h-5 w-5" />
            </div>
            <p
              className="text-[10.5px] uppercase tracking-[0.32em] mb-3"
              style={{ color: "color-mix(in oklab, var(--gold) 82%, var(--charcoal))", fontWeight: 700 }}
            >
              Your journey is set
            </p>
            <h2
              className="text-[26px] leading-[1.18]"
              style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 700, color: "var(--charcoal)" }}
            >
              {name.split(" ")[0] || "You"}, your day in Portugal is reserved.
            </h2>
            <p
              className="mt-4 text-[14px] italic leading-relaxed"
              style={{ fontFamily: "Georgia, serif", color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
            >
              A local designer will confirm every timing and the final investment
              within a few hours — by email and by WhatsApp if you prefer.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-8 inline-flex items-center justify-center rounded-[2px] px-6 py-3 text-[12px] uppercase tracking-[0.22em]"
              style={{
                background: "var(--charcoal)",
                color: "var(--ivory)",
                minHeight: 48,
                fontFamily: "var(--font-sans, Inter), sans-serif",
                fontWeight: 600,
              }}
            >
              Return to your story
            </button>
          </div>
        ) : (
          <>
            <p
              className="text-[10.5px] uppercase tracking-[0.32em]"
              style={{ color: "color-mix(in oklab, var(--gold) 82%, var(--charcoal))", fontWeight: 700 }}
            >
              Reserve your day
            </p>
            <h2
              className="mt-2 text-[24px] leading-[1.18]"
              style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 700, color: "var(--charcoal)" }}
            >
              A few quiet details, then it's yours.
            </h2>
            <p
              className="mt-2 text-[13px] italic"
              style={{ fontFamily: "Georgia, serif", color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}
            >
              {stops.length} stops · {Math.round((totals.experience / 60) * 10) / 10} h on the ground
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <Field label="Your name">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-[2px] border bg-transparent px-3 py-3 text-[14px] focus-visible:outline-none focus-visible:ring-2"
                  style={{ borderColor: "color-mix(in oklab, var(--charcoal) 22%, transparent)", color: "var(--charcoal)", minHeight: 48 }}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-[2px] border bg-transparent px-3 py-3 text-[14px] focus-visible:outline-none focus-visible:ring-2"
                  style={{ borderColor: "color-mix(in oklab, var(--charcoal) 22%, transparent)", color: "var(--charcoal)", minHeight: 48 }}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-[2px] border bg-transparent px-3 py-3 text-[14px] focus-visible:outline-none focus-visible:ring-2"
                    style={{ borderColor: "color-mix(in oklab, var(--charcoal) 22%, transparent)", color: "var(--charcoal)", minHeight: 48 }}
                  />
                </Field>
                <Field label="Guests">
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={guests}
                    onChange={(e) => setGuests(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                    className="w-full rounded-[2px] border bg-transparent px-3 py-3 text-[14px] focus-visible:outline-none focus-visible:ring-2"
                    style={{ borderColor: "color-mix(in oklab, var(--charcoal) 22%, transparent)", color: "var(--charcoal)", minHeight: 48 }}
                  />
                </Field>
              </div>
              <Field label="WhatsApp (optional)">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+351 …"
                  className="w-full rounded-[2px] border bg-transparent px-3 py-3 text-[14px] focus-visible:outline-none focus-visible:ring-2"
                  style={{ borderColor: "color-mix(in oklab, var(--charcoal) 22%, transparent)", color: "var(--charcoal)", minHeight: 48 }}
                />
              </Field>
            </div>

            {err && (
              <p className="mt-3 text-[12.5px]" style={{ color: "var(--charcoal)" }}>{err}</p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={!valid || busy}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[2px] px-6 py-4 transition-all disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2"
              style={{
                background: "color-mix(in oklab, var(--gold) 92%, var(--charcoal))",
                color: "var(--charcoal)",
                minHeight: 56,
                fontFamily: "var(--font-sans, Inter), sans-serif",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              {busy ? "Securing…" : "Reserve this day"}
            </button>
            <p
              className="mt-3 text-center text-[11.5px] italic"
              style={{ fontFamily: "Georgia, serif", color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
            >
              A local designer confirms every timing and the final investment before any charge.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="mb-1.5 block text-[10.5px] uppercase tracking-[0.28em]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)", fontWeight: 600 }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
