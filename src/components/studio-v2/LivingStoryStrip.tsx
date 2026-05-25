import { useMemo, useState } from "react";
import { ChevronUp } from "lucide-react";
import type { TravelerProfile } from "@/lib/studio-v2/profile";
import type { JourneyPreview } from "@/lib/studio-v2/engine";
import {
  INTENT_OPTIONS,
  PRIORITY_OPTIONS,
  storyOpener,
  storyAfterIntent,
  storyAfterPace,
  storyAfterGroup,
} from "@/lib/studio-v2/content";

/**
 * Living Story Strip — fixed bottom sheet that grows with every choice.
 * Replaces the "form" feeling with a tangible, cinematic record of what
 * the traveller is composing. Collapsed by default; swipe / tap to expand.
 *
 * No invented prices, no invented stops — only what the profile + preview
 * deterministically derive.
 */
export function LivingStoryStrip({
  profile,
  preview,
}: {
  profile: TravelerProfile;
  preview: JourneyPreview;
}) {
  const [open, setOpen] = useState(false);

  const dnaPills = useMemo(() => derivePills(profile), [profile]);
  const lines = useMemo(() => deriveLines(profile), [profile]);
  const tierLabel = profile.group?.luxuryTier
    ? profile.group.luxuryTier === "ultra"
      ? "Ultra"
      : profile.group.luxuryTier === "elevated"
        ? "Elevated"
        : "Refined"
    : null;

  const stops = preview.stops.length;
  const region = regionShort(preview.region);

  return (
    <aside
      aria-label="Your story so far"
      className="fixed inset-x-0 bottom-0 z-30 transition-[transform,box-shadow] duration-500 ease-out motion-reduce:transition-none"
      style={{
        background: "color-mix(in oklab, var(--ivory) 96%, transparent)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderTop: "1px solid color-mix(in oklab, var(--charcoal) 10%, transparent)",
        boxShadow: open
          ? "0 -18px 50px color-mix(in oklab, var(--charcoal) 22%, transparent)"
          : "0 -6px 18px color-mix(in oklab, var(--charcoal) 10%, transparent)",
        transform: "translateY(0)",
      }}
    >
      {/* collapsed bar */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="living-story-panel"
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 sm:px-8"
        style={{ minHeight: 64 }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className="relative inline-flex h-1.5 w-1.5 shrink-0"
            aria-hidden
          >
            <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--gold)] opacity-60" />
            <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--gold)]" />
          </span>
          <div className="min-w-0 flex-1">
            <p
              className="text-[9.5px] uppercase tracking-[0.32em]"
              style={{ color: "color-mix(in oklab, var(--gold) 82%, var(--charcoal))", fontWeight: 600 }}
            >
              {profile.name?.trim() ? `${profile.name.trim()}'s story` : "Your story"} · {stops} {stops === 1 ? "stop" : "stops"} · {region}
            </p>
            <p
              className="mt-0.5 truncate text-[13px]"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontStyle: "italic",
                color: "var(--charcoal)",
              }}
            >
              {lines[lines.length - 1]}
            </p>
          </div>
        </div>
        <ChevronUp
          className="h-4 w-4 shrink-0 transition-transform duration-300"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", color: "var(--charcoal)" }}
          aria-hidden
        />
      </button>

      {/* expanded panel */}
      <div
        id="living-story-panel"
        className="overflow-hidden transition-[max-height] duration-500 ease-out motion-reduce:transition-none"
        style={{ maxHeight: open ? "60vh" : 0 }}
      >
        <div className="px-5 pb-6 pt-1 sm:px-8">
          {dnaPills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {dnaPills.map((p, i) => (
                <span
                  key={p + i}
                  className="studio-v2-reveal inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] uppercase tracking-[0.22em]"
                  style={{
                    background: "color-mix(in oklab, var(--gold) 14%, transparent)",
                    color: "color-mix(in oklab, var(--charcoal) 82%, transparent)",
                    fontWeight: 600,
                    animationDelay: `${i * 90}ms`,
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-2.5">
            {lines.map((line, i) => (
              <p
                key={i}
                className="studio-v2-reveal text-[14px] leading-[1.5]"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontStyle: i === lines.length - 1 ? "italic" : "normal",
                  color:
                    i === lines.length - 1
                      ? "var(--charcoal)"
                      : "color-mix(in oklab, var(--charcoal) 65%, transparent)",
                  animationDelay: `${i * 80}ms`,
                }}
              >
                {line}
              </p>
            ))}
          </div>

          <div
            className="mt-5 flex items-center justify-between gap-3 border-t pt-4"
            style={{ borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)" }}
          >
            <div>
              <p
                className="text-[9.5px] uppercase tracking-[0.3em]"
                style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)", fontWeight: 600 }}
              >
                Experience investment
              </p>
              <p
                className="mt-1 text-[14px]"
                style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 600 }}
              >
                {tierLabel ? `${tierLabel} tier` : "Shaped to your tier"}
                <span
                  className="ml-2 text-[11px] italic"
                  style={{
                    fontFamily: "Georgia, serif",
                    fontWeight: 400,
                    color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
                  }}
                >
                  · confirmed at reveal
                </span>
              </p>
            </div>
            <div className="text-right">
              <p
                className="text-[9.5px] uppercase tracking-[0.3em]"
                style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)", fontWeight: 600 }}
              >
                Rhythm
              </p>
              <p
                className="mt-1 text-[14px]"
                style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 600 }}
              >
                {stops} {stops === 1 ? "stop" : "stops"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function derivePills(p: TravelerProfile): string[] {
  const out: string[] = [];
  if (p.intent) {
    const lab = INTENT_OPTIONS.find((o) => o.id === p.intent)?.label.split(" & ")[0];
    if (lab) out.push(lab);
  }
  if (p.pace) {
    out.push(
      p.pace === "light"    ? "Slow" :
      p.pace === "balanced" ? "Balanced" :
      p.pace === "rich"     ? "Rich" : "Full",
    );
  }
  const must = Object.entries(p.priorityWeights)
    .filter(([, w]) => (w ?? 0) >= 100)
    .map(([k]) => PRIORITY_OPTIONS.find((o) => o.id === k)?.label)
    .filter(Boolean) as string[];
  const on = Object.entries(p.priorityWeights)
    .filter(([, w]) => (w ?? 0) < 100 && (w ?? 0) > 0)
    .map(([k]) => PRIORITY_OPTIONS.find((o) => o.id === k)?.label)
    .filter(Boolean) as string[];
  for (const m of must.slice(0, 3)) out.push(`${m} · essential`);
  for (const o of on.slice(0, 2)) out.push(o);
  if (p.group?.occasion && p.group.occasion !== "none") {
    out.push(p.group.occasion.charAt(0).toUpperCase() + p.group.occasion.slice(1));
  }
  return out;
}

function deriveLines(p: TravelerProfile): string[] {
  const out: string[] = [storyOpener(p.name)];
  if (p.intent) out.push(storyAfterIntent(p.intent));
  if (p.pace)   out.push(storyAfterPace(p.pace));
  if (p.group)  out.push(storyAfterGroup(p.group));
  return out;
}

function regionShort(r: string): string {
  switch (r) {
    case "arrabida":     return "Arrábida";
    case "lisbon-coast": return "Atlantic edge";
    case "alentejo":     return "Alentejo";
    case "centro":       return "Centro";
    default:             return r;
  }
}
