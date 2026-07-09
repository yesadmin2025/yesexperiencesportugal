/**
 * Studio v2 — Host Handoff (Refine path).
 *
 * Premium, emotionally continuous transition to a named local designer.
 * Not "support escalation". The full real itinerary is persisted as a
 * draft (so the host can open /checkout/$token in the same conversation)
 * and pre-filled into a WhatsApp message with all the real stop names —
 * never invented copy, never compressed.
 */

import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle } from "lucide-react";
import { whatsappHref } from "@/components/WhatsAppFab";
import { createCustomBookingDraft } from "@/lib/studio-v2/bookings.functions";
import type { TravelerProfile } from "@/lib/studio-v2/profile";
import type { RefineStop } from "@/components/studio-v2/RefineStage";
import { trackBuilderEvent } from "@/lib/builder-analytics";

interface Props {
  profile: TravelerProfile;
  region: string;
  archetype?: string;
  stops: RefineStop[];
  /** Visual emphasis — primary when path === "refine", equal when "both". */
  emphasis?: "primary" | "equal";
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

function buildItineraryMessage(
  profile: TravelerProfile,
  region: string,
  stops: RefineStop[],
): string {
  const greeting = profile.name?.trim() ? `Olá! Sou ${profile.name.trim()}.` : "Olá!";
  const guests =
    (profile.group?.adults ?? 0) + (profile.group?.teens ?? 0) + (profile.group?.children ?? 0);
  const lines: string[] = [
    greeting,
    "",
    `Acabei de desenhar um dia em Portugal no Studio — região ${region}${guests > 0 ? `, ${guests} pessoa${guests === 1 ? "" : "s"}` : ""}${profile.ops?.preferredDate ? `, para ${profile.ops.preferredDate}` : ""}.`,
    "",
    "Roteiro real:",
    ...stops.map((s, i) => `${i + 1}. ${s.label}${s.tag ? ` · ${s.tag}` : ""}`),
    "",
    "Gostaria de refinar com um local designer antes de confirmar.",
  ];
  return lines.join("\n");
}

export function HostHandoffPanel({
  profile,
  region,
  archetype,
  stops,
  emphasis = "primary",
}: Props) {
  const createDraft = useServerFn(createCustomBookingDraft);
  const [busy, setBusy] = useState(false);
  const [draftToken, setDraftToken] = useState<string | null>(null);

  const totals = useMemo(() => {
    let km = 0;
    let exp = 0;
    for (let i = 0; i < stops.length; i++) {
      exp += stops[i].duration_minutes ?? 60;
      if (i > 0) km += haversineKm(stops[i - 1], stops[i]);
    }
    return { km: Math.round(km), drive: Math.round((km / 55) * 60), experience: exp };
  }, [stops]);

  const waMsg = useMemo(
    () => buildItineraryMessage(profile, region, stops),
    [profile, region, stops],
  );

  const onWhatsApp = async () => {
    void trackBuilderEvent("studio_v2_host_handoff_click", { archetype, region, emphasis });
    // Persist draft once so the host can open /checkout/$token in the same chat.
    if (!draftToken && !busy) {
      setBusy(true);
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
        setDraftToken(r.draftToken);
        void trackBuilderEvent("studio_v2_host_handoff_draft", { draftToken: r.draftToken });
      } catch {
        // Non-blocking — WhatsApp still opens even if persistence fails.
      } finally {
        setBusy(false);
      }
    }
  };

  // Build link with optional draft URL appended.
  const finalMsg = draftToken
    ? `${waMsg}\n\n${window.location.origin}/checkout/${draftToken}`
    : waMsg;

  const isPrimary = emphasis === "primary";

  return (
    <div
      className="flex flex-col items-center gap-4 rounded-[3px] border px-5 py-6 text-center"
      style={{
        borderColor: isPrimary
          ? "color-mix(in oklab, var(--gold) 50%, transparent)"
          : "color-mix(in oklab, var(--charcoal) 14%, transparent)",
        background: isPrimary
          ? "color-mix(in oklab, var(--gold) 8%, transparent)"
          : "color-mix(in oklab, var(--ivory) 60%, transparent)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="grid h-12 w-12 place-items-center rounded-full text-[14px]"
          style={{
            background: "color-mix(in oklab, var(--teal) 92%, transparent)",
            color: "var(--ivory)",
            fontFamily: "var(--font-display, Montserrat), sans-serif",
            fontWeight: 700,
          }}
          aria-hidden
        >
          M
        </div>
        <div className="text-left">
          <p
            className="text-[13.5px]"
            style={{
              fontFamily: "var(--font-display, Montserrat), sans-serif",
              fontWeight: 600,
              color: "var(--charcoal)",
            }}
          >
            Mariana
          </p>
          <p
            className="text-[10.5px] uppercase tracking-[0.26em]"
            style={{
              color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
              fontWeight: 600,
            }}
          >
            Your local in {region}
          </p>
        </div>
      </div>

      <p
        className="max-w-[34ch] text-[13.5px] italic leading-relaxed"
        style={{
          fontFamily: "Georgia, serif",
          color: "color-mix(in oklab, var(--charcoal) 72%, transparent)",
        }}
      >
        Some days are best shaped together. Mariana will refine the rhythm, confirm timings and the
        final investment — then secure every reservation.
      </p>

      <a
        href={whatsappHref(finalMsg)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onWhatsApp}
        className="inline-flex items-center justify-center gap-2.5 rounded-[2px] px-6 py-3.5 transition-all focus-visible:outline-none focus-visible:ring-2"
        style={{
          background: isPrimary
            ? "color-mix(in oklab, var(--gold) 92%, var(--charcoal))"
            : "transparent",
          color: isPrimary ? "var(--charcoal)" : "var(--charcoal)",
          border: isPrimary
            ? "none"
            : "1px solid color-mix(in oklab, var(--charcoal) 22%, transparent)",
          minHeight: 48,
          minWidth: 220,
          fontFamily: "var(--font-sans, Inter), sans-serif",
          fontWeight: 700,
          fontSize: 12.5,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        {busy ? "Preparing…" : "Refine with Mariana"}
      </a>
    </div>
  );
}
