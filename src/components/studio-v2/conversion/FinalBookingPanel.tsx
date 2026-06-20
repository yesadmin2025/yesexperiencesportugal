/**
 * Studio v2 — Final booking panel.
 *
 * "Your day is ready." — the closing moment of the flow.
 * Two booking paths:
 *   PRIMARY  · "Ready to say yes?"  → Stripe checkout (demo modal until enabled)
 *   SECONDARY · "Refine with a local designer first" → WhatsApp (wa.me/351911889992)
 *
 * Shows a clean, brand-correct summary of the day the user just built:
 * stops + timing, party size, pickup, duration window, inclusions and the
 * final calculated price (pricePerGuestFrom × pax, matches Logistics Strip).
 */

import { useState } from "react";
import { ArrowRight, MessageCircle, X } from "lucide-react";
import type { TravelerProfile } from "@/lib/studio-v2/profile";
import type { RefineStop } from "@/components/studio-v2/RefineStage";
import type { StudioBlueprint } from "@/lib/studio-v2/blueprints";
import { whatsappHref } from "@/components/WhatsAppFab";
import { trackBuilderEvent } from "@/lib/builder-analytics";

interface Props {
  profile: TravelerProfile;
  region: string;
  archetype?: string;
  stops: RefineStop[];
  pax: number;
  pickup: string;
  blueprint: StudioBlueprint | null;
}

const INTENT_LABEL: Record<string, string> = {
  food_local: "Wine & food",
  coastal_calm: "Coastal & beaches",
  active_outdoor: "Active outdoor",
  elegant_cultural: "Elegant cultural",
  romantic_intimate: "Romantic intimate",
  hands_on: "Hands-on culture",
};

function paceLabel(pace?: string): string {
  if (!pace) return "their own rhythm";
  if (pace === "slow") return "an unhurried rhythm";
  if (pace === "balanced") return "a balanced rhythm";
  if (pace === "active") return "an active rhythm";
  return pace;
}

function buildDraftMessage({
  profile,
  region,
  stops,
  pax,
  pickup,
  totalPrice,
  perGuest,
  durationHours,
}: {
  profile: TravelerProfile;
  region: string;
  stops: RefineStop[];
  pax: number;
  pickup: string;
  totalPrice: number;
  perGuest: number;
  durationHours: [number, number];
}): string {
  const who = profile.name?.trim() ?? "a traveller";
  const intent = profile.intent
    ? (INTENT_LABEL[profile.intent] ?? profile.intent)
    : "a curated day";
  const stopList = stops
    .map(
      (s, i) => `  ${i + 1}. ${s.label}${s.duration_minutes ? ` (${s.duration_minutes} min)` : ""}`,
    )
    .join("\n");

  return [
    `Olá! Sou ${who}.`,
    ``,
    `Acabei de desenhar um dia no Studio e gostaria de o refinar com um local designer antes de reservar.`,
    ``,
    `— Resumo —`,
    `Região: ${region}`,
    `Atmosfera: ${intent}`,
    `Ritmo: ${paceLabel(profile.pace)}`,
    `Grupo: ${pax} ${pax === 1 ? "pessoa" : "pessoas"}`,
    `Pickup: ${pickup || "a confirmar"}`,
    `Duração estimada: ${durationHours[0]}–${durationHours[1]} h`,
    ``,
    `— Paragens (${stops.length}) —`,
    stopList,
    ``,
    `— Investimento estimado —`,
    `€${perGuest}/pessoa × ${pax} = €${totalPrice}`,
    ``,
    `Aguardo sugestões. Obrigado!`,
  ].join("\n");
}

export function FinalBookingPanel({
  profile,
  region,
  archetype,
  stops,
  pax,
  pickup,
  blueprint,
}: Props) {
  const [demoOpen, setDemoOpen] = useState(false);

  const perGuest = blueprint?.pricePerGuestFrom ?? 145;
  const totalPrice = perGuest * Math.max(1, pax);
  const durationHours: [number, number] = blueprint?.durationHours ?? [7, 9];

  const draftMsg = buildDraftMessage({
    profile,
    region,
    stops,
    pax,
    pickup,
    totalPrice,
    perGuest,
    durationHours,
  });

  const onSayYes = () => {
    void trackBuilderEvent("studio_v2_say_yes_click", {
      archetype,
      region,
      intent: profile.intent,
      pax,
      totalPrice,
    });
    setDemoOpen(true);
  };

  const onRefineWithLocal = () => {
    void trackBuilderEvent("studio_v2_refine_with_local_click", {
      archetype,
      region,
      intent: profile.intent,
      pax,
    });
  };

  return (
    <section className="mt-12">
      {/* Headline */}
      <h2
        className="text-[30px] leading-[1.05] sm:text-[40px]"
        style={{
          fontFamily: "var(--font-display, Montserrat), sans-serif",
          fontWeight: 700,
          letterSpacing: "-0.01em",
          color: "var(--charcoal)",
        }}
      >
        <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400 }}>
          Your day
        </span>{" "}
        is ready.
      </h2>
      <p
        className="mt-3 text-[14px] leading-[1.5]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
      >
        Everything below is exactly what you shaped — review it, then choose how you'd like to
        confirm.
      </p>

      {/* Summary card */}
      <div
        className="mt-7 rounded-[2px] border p-5 sm:p-6"
        style={{
          borderColor: "color-mix(in oklab, var(--gold) 28%, transparent)",
          background: "color-mix(in oklab, var(--sand) 40%, transparent)",
        }}
      >
        {/* Stops */}
        <p
          className="text-[10.5px] uppercase tracking-[0.32em]"
          style={{
            color: "color-mix(in oklab, var(--gold) 82%, var(--charcoal))",
            fontWeight: 700,
          }}
        >
          Itinerary · {stops.length} stops
        </p>
        <ol className="mt-3 space-y-2.5">
          {stops.map((s, i) => (
            <li
              key={s.key}
              className="flex items-baseline gap-3 text-[14px] leading-[1.35]"
              style={{ color: "var(--charcoal)" }}
            >
              <span
                className="shrink-0 text-[11px] tabular-nums"
                style={{
                  fontFamily: "var(--font-display, Montserrat), sans-serif",
                  fontWeight: 600,
                  color: "color-mix(in oklab, var(--gold) 80%, var(--charcoal))",
                  minWidth: 18,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1">{s.label}</span>
              {s.duration_minutes ? (
                <span
                  className="shrink-0 text-[11.5px] tabular-nums"
                  style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
                >
                  {s.duration_minutes} min
                </span>
              ) : null}
            </li>
          ))}
        </ol>

        {/* Facts grid */}
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <FactCell label="Group" value={`${pax} ${pax === 1 ? "guest" : "guests"}`} />
          <FactCell label="Pickup" value={pickup || "Lisboa"} />
          <FactCell label="Duration" value={`${durationHours[0]}–${durationHours[1]} h`} />
          <FactCell label="Style" value="Private throughout" />
        </dl>

        {/* Inclusions */}
        <div className="mt-6">
          <p
            className="text-[10.5px] uppercase tracking-[0.32em]"
            style={{
              color: "color-mix(in oklab, var(--gold) 82%, var(--charcoal))",
              fontWeight: 700,
            }}
          >
            Included
          </p>
          <ul
            className="mt-2 space-y-1 text-[13px] leading-[1.5]"
            style={{ color: "color-mix(in oklab, var(--charcoal) 75%, transparent)" }}
          >
            <li>· Private driver-host throughout the day</li>
            <li>· Hotel pickup &amp; return</li>
            <li>· All entries, tastings and reservations on your route</li>
            <li>· On-day support from a local designer</li>
          </ul>
        </div>

        {/* Price */}
        <div
          className="mt-6 flex items-end justify-between gap-4 border-t pt-5"
          style={{ borderColor: "color-mix(in oklab, var(--charcoal) 12%, transparent)" }}
        >
          <div>
            <p
              className="text-[10.5px] uppercase tracking-[0.32em]"
              style={{
                color: "color-mix(in oklab, var(--gold) 82%, var(--charcoal))",
                fontWeight: 700,
              }}
            >
              Total
            </p>
            <p
              className="mt-1 text-[12px]"
              style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
            >
              €{perGuest} / guest × {pax}
            </p>
          </div>
          <p
            className="text-[34px] leading-none tabular-nums sm:text-[40px]"
            style={{
              fontFamily: "var(--font-display, Montserrat), sans-serif",
              fontWeight: 700,
              color: "var(--charcoal)",
              letterSpacing: "-0.02em",
            }}
          >
            €{totalPrice.toLocaleString("en-GB")}
          </p>
        </div>
      </div>

      {/* PRIMARY action */}
      <div className="mt-8">
        <button
          type="button"
          onClick={onSayYes}
          className="group inline-flex w-full items-center justify-center gap-3 rounded-[2px] px-6 py-5 transition-all focus-visible:outline-none focus-visible:ring-2"
          style={{
            background: "color-mix(in oklab, var(--gold) 92%, var(--charcoal))",
            color: "var(--charcoal)",
            minHeight: 64,
            fontFamily: "var(--font-sans, Inter), sans-serif",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            boxShadow: "0 10px 28px -12px color-mix(in oklab, var(--gold) 65%, transparent)",
          }}
        >
          Ready to say yes?
          <ArrowRight
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-[3px]"
            aria-hidden
          />
        </button>
      </div>

      {/* SECONDARY action */}
      <div className="mt-3">
        <a
          href={whatsappHref(draftMsg)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onRefineWithLocal}
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-[2px] border px-6 py-3.5 transition-all focus-visible:outline-none focus-visible:ring-2"
          style={{
            background: "transparent",
            color: "var(--charcoal)",
            borderColor: "color-mix(in oklab, var(--charcoal) 22%, transparent)",
            minHeight: 48,
            fontFamily: "var(--font-sans, Inter), sans-serif",
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
          Refine with a local designer first
        </a>
      </div>

      {/* Reassurance */}
      <p
        className="mt-5 text-center text-[12.5px] italic"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "color-mix(in oklab, var(--charcoal) 62%, transparent)",
          lineHeight: 1.5,
        }}
      >
        Free cancellation up to 48h · Pay securely · Book now or shape it with a local — your
        choice.
      </p>

      {/* Demo modal — placeholder until Stripe checkout is enabled. */}
      {demoOpen && (
        <DemoCheckoutModal
          totalPrice={totalPrice}
          whatsappFallback={whatsappHref(draftMsg)}
          onClose={() => setDemoOpen(false)}
        />
      )}
    </section>
  );
}

function FactCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt
        className="text-[10px] uppercase tracking-[0.28em]"
        style={{
          color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
          fontWeight: 700,
        }}
      >
        {label}
      </dt>
      <dd
        className="mt-1.5 text-[14px] leading-[1.25]"
        style={{
          fontFamily: "var(--font-display, Montserrat), sans-serif",
          fontWeight: 600,
          color: "var(--charcoal)",
        }}
      >
        {value}
      </dd>
    </div>
  );
}

function DemoCheckoutModal({
  totalPrice,
  whatsappFallback,
  onClose,
}: {
  totalPrice: number;
  whatsappFallback: string;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Secure checkout"
      className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center"
      style={{ background: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[440px] rounded-t-[4px] sm:rounded-[4px] p-7"
        style={{ background: "var(--ivory)" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2"
          style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        <p
          className="text-[10.5px] uppercase tracking-[0.32em]"
          style={{
            color: "color-mix(in oklab, var(--gold) 82%, var(--charcoal))",
            fontWeight: 700,
          }}
        >
          Secure checkout
        </p>
        <h3
          className="mt-3 text-[22px] leading-[1.15]"
          style={{
            fontFamily: "var(--font-display, Montserrat), sans-serif",
            fontWeight: 700,
            color: "var(--charcoal)",
          }}
        >
          <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400 }}>
            Almost there —
          </span>{" "}
          secure payments arrive shortly.
        </h3>
        <p
          className="mt-4 text-[14px] leading-[1.5]"
          style={{ color: "color-mix(in oklab, var(--charcoal) 75%, transparent)" }}
        >
          We're finalising the secure payment surface. In the meantime, your local designer can lock
          the date and timings, and send you the payment link directly — same day, no surprises.
        </p>
        <p
          className="mt-4 text-[13px]"
          style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
        >
          Total today: <strong>€{totalPrice.toLocaleString("en-GB")}</strong>
        </p>
        <a
          href={whatsappFallback}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-[2px] px-6 py-4 focus-visible:outline-none focus-visible:ring-2"
          style={{
            background: "var(--charcoal)",
            color: "var(--ivory)",
            minHeight: 52,
            fontFamily: "var(--font-sans, Inter), sans-serif",
            fontWeight: 700,
            fontSize: 12.5,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
          Confirm via local designer
        </a>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 inline-flex w-full items-center justify-center px-6 py-3 text-[11.5px] uppercase tracking-[0.24em] focus-visible:outline-none focus-visible:ring-2"
          style={{
            color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
            fontWeight: 600,
            minHeight: 44,
          }}
        >
          Back to my day
        </button>
      </div>
    </div>
  );
}
