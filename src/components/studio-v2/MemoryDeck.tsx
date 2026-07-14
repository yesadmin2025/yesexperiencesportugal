import type { TravelerProfile } from "@/lib/studio-v2/profile";
import { INTENT_OPTIONS, PACE_OPTIONS, DURATION_OPTIONS, tierLabel } from "@/lib/studio-v2/content";

/**
 * MemoryDeck — tangible record of every choice the traveller has made.
 * A small horizontal stack of "memory cards" that grows as the journey
 * unfolds. Replaces the abstract progress bar with something the
 * user can SEE accumulating. Tap a card to jump back to that beat.
 */

interface MemoryCard {
  id: string;
  label: string;
  value: string;
  beatIndex: number;
}

export function MemoryDeck({
  profile,
  onJump,
  beatIndexFor,
}: {
  profile: TravelerProfile;
  onJump: (beatIndex: number) => void;
  beatIndexFor: (key: string) => number;
}) {
  const cards: MemoryCard[] = [];

  if (profile.name?.trim()) {
    cards.push({
      id: "name",
      label: "Story",
      value: profile.name.trim(),
      beatIndex: beatIndexFor("name"),
    });
  }
  if (profile.group) {
    const total = profile.group.adults + profile.group.teens + profile.group.children;
    cards.push({
      id: "group",
      label: "Guests",
      value: `${total}`,
      beatIndex: beatIndexFor("choice-group"),
    });
  }
  if (profile.duration) {
    const opt = DURATION_OPTIONS.find((o) => o.id === profile.duration);
    cards.push({
      id: "duration",
      label: "Duration",
      value:
        profile.duration === "multi-day"
          ? `${profile.durationDays ?? 3}d`
          : (opt?.label.split(" ")[0] ?? "—"),
      beatIndex: beatIndexFor("choice-duration"),
    });
  }
  if (profile.intent) {
    const opt = INTENT_OPTIONS.find((o) => o.id === profile.intent);
    cards.push({
      id: "intent",
      label: "Mood",
      value: opt?.label.split(" ")[0] ?? "—",
      beatIndex: beatIndexFor("choice-intent"),
    });
  }
  if (Object.keys(profile.priorityWeights).length > 0) {
    cards.push({
      id: "priorities",
      label: "Pulls",
      value: `${Object.keys(profile.priorityWeights).length}`,
      beatIndex: beatIndexFor("choice-priorities"),
    });
  }
  if (profile.pace) {
    const opt = PACE_OPTIONS.find((o) => o.id === profile.pace);
    cards.push({
      id: "pace",
      label: "Rhythm",
      value: opt?.label.split(" ")[0] ?? "—",
      beatIndex: beatIndexFor("choice-pace"),
    });
  }
  if (profile.enhancements.length > 0) {
    cards.push({
      id: "enh",
      label: "Touches",
      value: `+${profile.enhancements.length}`,
      beatIndex: beatIndexFor("choice-enhancements"),
    });
  }
  if (profile.group?.luxuryTier) {
    cards.push({
      id: "tier",
      label: "Tier",
      value: tierLabel(profile.group.luxuryTier).split(" ")[0],
      beatIndex: beatIndexFor("choice-tier"),
    });
  }

  if (cards.length === 0) return null;

  return (
    <div
      className="memory-deck flex items-center gap-1.5 overflow-x-auto pb-1"
      style={{ scrollbarWidth: "none" }}
      aria-label="Your journey so far"
    >
      {cards.map((c, i) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onJump(c.beatIndex)}
          className="memory-card group relative shrink-0 rounded-[2px] border px-2 py-1.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2"
          style={{
            width: 64,
            minHeight: 44,
            borderColor: "color-mix(in oklab, var(--gold) 28%, transparent)",
            background: "color-mix(in oklab, var(--ivory) 85%, var(--sand))",
            animation: `memoryCardIn 320ms ease-out both`,
            animationDelay: `${i * 40}ms`,
          }}
          aria-label={`${c.label}: ${c.value} — tap to revisit`}
        >
          <span
            className="block text-[8px] uppercase tracking-[0.2em]"
            style={{
              color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
              fontWeight: 600,
            }}
          >
            {c.label}
          </span>
          <span
            className="mt-0.5 block truncate text-[11px]"
            style={{
              color: "var(--charcoal)",
              fontFamily: "var(--font-display, Montserrat), sans-serif",
              fontWeight: 600,
            }}
          >
            {c.value}
          </span>
        </button>
      ))}
      <style>{`
        @keyframes memoryCardIn {
          from { opacity: 0; transform: translateY(4px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .memory-card { animation: none !important; }
        }
        .memory-deck::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
