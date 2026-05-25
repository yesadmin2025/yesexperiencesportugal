import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { signatureTours, type SignatureTour } from "@/data/signatureTours";
import { recordDriftEvent } from "@/lib/drift/telemetry";
import { t as tt, type DriftLocale } from "@/lib/drift/i18n";
import type { DriftProfile } from "./StudioDrift";

/**
 * StudioDrawerReco — slim, single-row smart recommendation that lives
 * inside the StudioLivePreview drawer (Studio v4 / Fase 4).
 *
 * Not a card grid: a single editorial line + theme tag + price + "Add"
 * affordance. Reads from `signatureTours` (real catalog, no inventions).
 *
 *   ★ Also fits you · Slow Wine Day, Arrábida · €185+ · [Open]
 *
 * Only renders when:
 *   · drift confidence ≥ 0.35
 *   · at least style OR pickup is set (enough signal to score)
 *
 * Tap → opens the matching Signature page in a new tab (keeps the user's
 * drift session alive so they can come back and reserve).
 */
interface Props {
  profile: DriftProfile;
  locale: DriftLocale;
  confidence: number;
  /** Anchor tour id to exclude (the one already driving the live day). */
  excludeId?: string;
}

const STYLE_MATCH: Record<
  NonNullable<DriftProfile["style"]>,
  { themes: string[]; styles: string[] }
> = {
  coast: { themes: ["Coastal"], styles: ["coastal", "coast", "boat", "beach"] },
  heritage: { themes: ["Heritage"], styles: ["heritage", "history", "monastery"] },
  wine: { themes: ["Wine"], styles: ["wine", "tasting"] },
  table: { themes: ["Gastronomy", "Wine"], styles: ["gastronomy", "table", "tasting"] },
};

function score(t: SignatureTour, profile: DriftProfile): number {
  let s = 0;
  if (profile.style) {
    const m = STYLE_MATCH[profile.style];
    if (m.themes.includes(t.theme)) s += 3;
    if ((t.seed.styles ?? []).some((sty) => m.styles.includes(sty))) s += 1.5;
  }
  if (profile.pickup && t.seed.region && t.seed.region === profile.pickup) s += 1.8;
  if (profile.energy && t.seed.pace) {
    if (profile.energy === "slow" && t.seed.pace === "relaxed") s += 0.6;
    if (profile.energy === "vivid" && t.seed.pace === "full") s += 0.6;
  }
  return s;
}

export function StudioDrawerReco({ profile, locale, confidence, excludeId }: Props) {
  const pick = useMemo(() => {
    if (confidence < 0.35) return null;
    if (!profile.style && !profile.pickup) return null;
    const ranked = signatureTours
      .filter((t) => t.id !== excludeId)
      .map((t) => ({ t, s: score(t, profile) }))
      .filter((r) => r.s > 1)
      .sort((a, b) => b.s - a.s);
    return ranked[0]?.t ?? null;
  }, [profile, confidence, excludeId]);

  if (!pick) return null;

  return (
    <div
      className="mb-4 rounded-[8px] motion-safe:animate-[fade-in_0.4s_ease-out_both]"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in oklab, var(--gold) 12%, var(--ivory)), var(--ivory))",
        border: "1px solid color-mix(in oklab, var(--gold) 38%, transparent)",
      }}
    >
      <Link
        to="/tours/$tourId"
        params={{ tourId: pick.id }}
        target="_blank"
        rel="noopener"
        onClick={() =>
          void recordDriftEvent("cta_book", {
            meta: { kind: "drawer_reco_click", tourId: pick.id },
          })
        }
        className="flex items-center gap-3 px-3 py-2.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--gold)]"
      >
        <span
          aria-hidden="true"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
          style={{ background: "var(--gold)", color: "var(--charcoal)" }}
        >
          <Plus size={16} strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="text-[9.5px] uppercase tracking-[0.18em] font-bold"
            style={{ color: "var(--gold)" }}
          >
            {tt("reco.eyebrow", locale)}
          </p>
          <p
            className="truncate"
            style={{
              fontFamily: "'Montserrat', system-ui, sans-serif",
              fontWeight: 600,
              fontSize: "13px",
              color: "var(--charcoal)",
              lineHeight: 1.2,
            }}
          >
            {pick.title}
          </p>
          <p
            className="mt-0.5 truncate"
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: "10.5px",
              color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
            }}
          >
            {pick.region} · €{pick.priceFrom}+ /guest
          </p>
        </div>
        <span
          className="text-[10px] uppercase tracking-[0.18em] font-bold whitespace-nowrap"
          style={{ color: "var(--teal)" }}
        >
          {tt("reco.open", locale)} →
        </span>
      </Link>
    </div>
  );
}
