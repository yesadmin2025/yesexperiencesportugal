import { useState } from "react";
import {
  ArrowRight,
  Briefcase,
  CalendarRange,
  Compass,
  Heart,
  PartyPopper,
  Sparkles,
  Users,
  Wine,
  X,
} from "lucide-react";
import { CtaButton } from "@/components/ui/CtaButton";
import expCoastal from "@/assets/exp-coastal.jpg";
import expGastro from "@/assets/exp-gastronomy.jpg";
import expRomantic from "@/assets/exp-romantic.jpg";
import expStreet from "@/assets/exp-street.jpg";
import expNature from "@/assets/exp-nature.jpg";
import { BuilderImage } from "./BuilderImage";
import { builderWaHref } from "./types";
import type { Intention, Mood, Who } from "./types";

/* ─────────────────────────────────────────────────────────────────
   Step 0 — "What are you creating?"

   Eight cinematic cards. Four feed straight into the existing engine
   with sensible presets; four (Multi-Day · Proposal · Celebration ·
   Corporate) open a concierge handover sheet — but every concierge
   card ALSO exposes a "Build & book instantly" CTA so the user can
   bypass concierge and go straight to checkout. The Builder always
   keeps the freedom to book instantly.
───────────────────────────────────────────────────────────────── */

export type TripPreset = {
  mood?: Mood;
  who?: Who;
  intention?: Intention;
};

interface TripTypeCard {
  id: string;
  label: string;
  sub: string;
  icon: typeof Wine;
  cover: string;
  preset: TripPreset;
  /** When true, opens the concierge handover sheet instead of jumping into the engine. */
  concierge?: {
    headline: string;
    body: string;
    waMessage: string;
  };
}

const CARDS: TripTypeCard[] = [
  {
    id: "private-day",
    label: "A private day",
    sub: "One full day, shaped end-to-end around you",
    icon: Compass,
    cover: expCoastal,
    preset: {},
  },
  {
    id: "wine-food",
    label: "Wine & food",
    sub: "Cellars, markets, long generous tables",
    icon: Wine,
    cover: expGastro,
    preset: { mood: "open", intention: "wine" },
  },
  {
    id: "family",
    label: "Family day",
    sub: "Real places, kid-welcome rhythm",
    icon: Users,
    cover: expStreet,
    preset: { who: "family" },
  },
  {
    id: "from-scratch",
    label: "Build from scratch",
    sub: "Start with a blank page, choose every beat",
    icon: Sparkles,
    cover: expNature,
    preset: {},
  },
  {
    id: "multi-day",
    label: "Multi-day journey",
    sub: "Two days or more, shaped with our team",
    icon: CalendarRange,
    cover: expCoastal,
    preset: {},
    concierge: {
      headline: "Multi-day journeys are shaped with a human",
      body: "Real lodging, real driver hours, real bookings — designed with you over a short call or chat. We never invent a multi-day itinerary.",
      waMessage: "Hi YES — I'd like to design a multi-day private experience in Portugal.",
    },
  },
  {
    id: "proposal",
    label: "A proposal",
    sub: "An intimate moment, set with care",
    icon: Heart,
    cover: expRomantic,
    preset: { mood: "romantic", who: "couple", intention: "wonder" },
    concierge: {
      headline: "Proposals are set with our concierge",
      body: "Florals, photographer, the right cove at the right hour — these are coordinated by hand. We'll confirm every detail before you book.",
      waMessage: "Hi YES — I'd like help planning a proposal day in Portugal.",
    },
  },
  {
    id: "celebration",
    label: "A celebration",
    sub: "Anniversary, birthday, milestone",
    icon: PartyPopper,
    cover: expRomantic,
    preset: { mood: "open", intention: "wonder" },
    concierge: {
      headline: "Special celebrations get the concierge touch",
      body: "Cake, private terrace, surprise moment — we handle the bespoke layer. Or shape a private day instantly with the builder below.",
      waMessage: "Hi YES — I'd like to plan a celebration day in Portugal.",
    },
  },
  {
    id: "corporate",
    label: "Corporate · Team",
    sub: "Client day, retreat, team experience",
    icon: Briefcase,
    cover: expStreet,
    preset: { who: "corporate" },
    concierge: {
      headline: "Corporate days are quoted by our team",
      body: "Group logistics, invoicing, dietary, vehicles — confirmed in writing. We'll come back within a working day.",
      waMessage: "Hi YES — I'd like a quote for a private corporate experience in Portugal.",
    },
  },
];

interface Props {
  /** Apply preset selections + jump into the live builder flow. */
  onChoose: (preset: TripPreset) => void;
}

export function TripTypeEntry({ onChoose }: Props) {
  const [conciergeCard, setConciergeCard] = useState<TripTypeCard | null>(null);

  return (
    <section
      aria-labelledby="builder-trip-type-title"
      className="relative isolate overflow-hidden bg-[color:var(--ivory)] text-[color:var(--charcoal)]"
    >
      {/* Subtle moving route line — same visual signature as the old entry */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full opacity-[0.14] motion-reduce:opacity-[0.10]"
      >
        <defs>
          <linearGradient id="builderTripLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--gold)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--teal)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M -50 420 C 220 360, 360 220, 560 240 S 880 360, 1080 220 1280 120 1300 80"
          stroke="url(#builderTripLine)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="6 14"
          className="builder-entry-line"
        />
      </svg>

      <div className="container-x relative z-10 py-12 md:py-20">
        <div className="section-enter max-w-2xl">
          <span className="inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.28em] font-semibold text-[color:var(--gold)]">
            <Sparkles size={12} aria-hidden="true" />
            Experience studio
          </span>

          <h1
            id="builder-trip-type-title"
            className="serif mt-5 text-[2.4rem] sm:text-[3.1rem] md:text-[3.6rem] leading-[1.02] tracking-[-0.02em] font-semibold"
          >
            What are you <span className="italic">creating?</span>
          </h1>

          <p className="mt-5 max-w-xl serif italic text-[1.1rem] sm:text-[1.25rem] leading-[1.35] text-[color:var(--charcoal)]/85">
            Pick a starting point. Shape it in real time. Confirm instantly — or hand it to our
            concierge.
          </p>
        </div>

        {/* Eight cinematic cards */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {CARDS.map((card) => (
            <TripCard
              key={card.id}
              card={card}
              onClick={() => {
                if (card.concierge) {
                  setConciergeCard(card);
                } else {
                  onChoose(card.preset);
                }
              }}
            />
          ))}
        </div>

        <p className="mt-8 text-[12px] text-[color:var(--charcoal)]/55 tracking-wide">
          About a minute. You shape it. Confirmed instantly.
        </p>
      </div>

      {/* Concierge handover sheet — always offers a direct-book escape hatch */}
      {conciergeCard && conciergeCard.concierge && (
        <ConciergeSheet
          headline={conciergeCard.concierge.headline}
          body={conciergeCard.concierge.body}
          waMessage={conciergeCard.concierge.waMessage}
          onBookInstantly={() => {
            const preset = conciergeCard.preset;
            setConciergeCard(null);
            onChoose(preset);
          }}
          onClose={() => setConciergeCard(null)}
        />
      )}
    </section>
  );
}

/* ─── Card ─────────────────────────────────────────────────────── */

function TripCard({ card, onClick }: { card: TripTypeCard; onClick: () => void }) {
  const Icon = card.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative overflow-hidden rounded-[2px] text-left transition-all duration-300",
        "border border-[color:var(--charcoal)]/10",
        "hover:-translate-y-[2px] hover:border-[color:var(--gold)]/60 hover:shadow-[0_18px_36px_-18px_rgba(46,46,46,0.45)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]/60",
      ].join(" ")}
    >
      <BuilderImage
        src={card.cover}
        alt=""
        ratio="4/5"
        overlay
        rounded={false}
        imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
      >
        <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-5">
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.24em] font-bold text-[color:var(--ivory)]/95">
            <Icon size={11} aria-hidden="true" />
            {card.concierge ? "Concierge or instant" : "Instant"}
          </span>
          <h3 className="serif mt-2 text-[1.15rem] md:text-[1.25rem] leading-tight font-semibold text-[color:var(--ivory)]">
            {card.label}
          </h3>
          <p className="mt-1 text-[12.5px] leading-snug text-[color:var(--ivory)]/80">{card.sub}</p>
          <span className="mt-3 inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--gold)] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Begin <ArrowRight size={11} />
          </span>
        </div>
      </BuilderImage>
    </button>
  );
}

/* ─── Concierge sheet ──────────────────────────────────────────── */

function ConciergeSheet({
  headline,
  body,
  waMessage,
  onBookInstantly,
  onClose,
}: {
  headline: string;
  body: string;
  waMessage: string;
  onBookInstantly: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-[2px] bg-[color:var(--ivory)] shadow-[0_28px_60px_-24px_rgba(46,46,46,0.55)] section-enter">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 h-9 w-9 inline-flex items-center justify-center rounded-full bg-[color:var(--charcoal)]/5 hover:bg-[color:var(--charcoal)]/10"
        >
          <X size={16} />
        </button>
        <div className="p-6 md:p-8">
          <span className="inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.28em] font-semibold text-[color:var(--gold)]">
            <Sparkles size={12} aria-hidden="true" />
            Concierge
          </span>
          <h3 className="serif mt-3 text-[1.5rem] md:text-[1.8rem] leading-[1.1] font-semibold text-[color:var(--charcoal)]">
            {headline}
          </h3>
          <p className="mt-3 serif italic text-[1rem] leading-[1.4] text-[color:var(--charcoal)]/80">
            {body}
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <CtaButton href={builderWaHref(waMessage)} variant="hairline">
              Chat with our concierge
            </CtaButton>
            <CtaButton type="button" onClick={onBookInstantly} variant="hairline" className="opacity-70 hover:opacity-100">
              Or build & book instantly
            </CtaButton>
          </div>

          <p className="mt-5 text-[11.5px] text-[color:var(--charcoal)]/55 tracking-wide">
            You always have the freedom to skip concierge and confirm a private day in minutes.
          </p>
        </div>
      </div>
    </div>
  );
}
