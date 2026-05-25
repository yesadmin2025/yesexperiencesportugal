import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { DriftLocale } from "@/lib/drift/i18n";
import type { SignatureTour } from "@/data/signatureTours";

/**
 * RevealInvestment — transparent "estimated experience investment" block,
 * rendered at the convergence reveal once an anchor Signature tour has
 * been matched.
 *
 * Rules of the house:
 *  - Numbers come ONLY from the real anchor SignatureTour (priceFrom +
 *    included[]). No invented add-ons, no fabricated totals.
 *  - We estimate an indicative party size from `companions` for display
 *    only; the final cost is always confirmed at booking.
 *  - Restraint over decoration. One ivory card, gold hairline, no chips,
 *    no animations beyond a calm reveal fade.
 *  - Mobile-first; expands inline (accordion) to keep the reveal flow
 *    uninterrupted.
 */

type Companions = "solo" | "couple" | "family" | "group" | undefined;

interface Props {
  anchor: SignatureTour;
  companions: Companions;
  locale: DriftLocale;
  /** Optional: number of stops in the composed day, shown as context. */
  stopsCount?: number;
}

const COPY: Record<
  DriftLocale,
  {
    eyebrow: string;
    fromLabel: string;
    perGuest: string;
    indicativeFor: (n: number) => string;
    indicativeTotal: string;
    includedTitle: string;
    finalNote: string;
    expand: string;
    collapse: string;
  }
> = {
  pt: {
    eyebrow: "investimento estimado",
    fromLabel: "desde",
    perGuest: "por pessoa",
    indicativeFor: (n) => `indicativo para ${n} ${n === 1 ? "pessoa" : "pessoas"}`,
    indicativeTotal: "estimativa total",
    includedTitle: "Tudo incluído",
    finalNote:
      "Valor final confirmado na reserva, em função da data, número de pessoas e ajustes pedidos.",
    expand: "ver detalhe",
    collapse: "esconder detalhe",
  },
  en: {
    eyebrow: "estimated investment",
    fromLabel: "from",
    perGuest: "per guest",
    indicativeFor: (n) => `indicative for ${n} ${n === 1 ? "guest" : "guests"}`,
    indicativeTotal: "estimated total",
    includedTitle: "All included",
    finalNote:
      "Final cost confirmed at booking, based on date, party size and any adjustments.",
    expand: "view breakdown",
    collapse: "hide breakdown",
  },
  es: {
    eyebrow: "inversión estimada",
    fromLabel: "desde",
    perGuest: "por persona",
    indicativeFor: (n) => `indicativo para ${n} ${n === 1 ? "persona" : "personas"}`,
    indicativeTotal: "estimación total",
    includedTitle: "Todo incluido",
    finalNote:
      "El precio final se confirma en la reserva, según fecha, número de personas y ajustes.",
    expand: "ver detalle",
    collapse: "ocultar detalle",
  },
  fr: {
    eyebrow: "investissement estimé",
    fromLabel: "à partir de",
    perGuest: "par personne",
    indicativeFor: (n) => `indicatif pour ${n} ${n === 1 ? "personne" : "personnes"}`,
    indicativeTotal: "estimation totale",
    includedTitle: "Tout inclus",
    finalNote:
      "Tarif final confirmé à la réservation, selon la date, le nombre de personnes et les ajustements.",
    expand: "voir le détail",
    collapse: "masquer le détail",
  },
};

/** Conservative party-size estimate by companion type — display only. */
function estimateParty(c: Companions): number {
  switch (c) {
    case "solo":
      return 1;
    case "couple":
      return 2;
    case "family":
      return 4;
    case "group":
      return 6;
    default:
      return 2;
  }
}

export function RevealInvestment({ anchor, companions, locale, stopsCount }: Props) {
  void stopsCount; // reserved for future copy variants
  const t = COPY[locale];
  const party = estimateParty(companions);
  const total = anchor.priceFrom * party;
  const [open, setOpen] = useState(false);

  const included = useMemo(
    () => anchor.included.filter((line) => line && line.trim().length > 0),
    [anchor.included],
  );

  return (
    <section
      aria-labelledby="reveal-investment-title"
      className="mx-auto mt-10 max-w-[36ch] rounded-[8px] motion-safe:animate-[fade-in_0.9s_ease-out_both]"
      style={{
        background: "color-mix(in oklab, var(--ivory) 92%, white)",
        border: "1px solid color-mix(in oklab, var(--gold) 32%, transparent)",
        boxShadow:
          "0 1px 0 color-mix(in oklab, var(--charcoal) 8%, transparent), 0 18px 38px color-mix(in oklab, var(--charcoal) 8%, transparent)",
      }}
    >
      <div className="px-5 pt-5 pb-4">
        <p
          id="reveal-investment-title"
          className="text-center"
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: "9.5px",
            fontWeight: 700,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--gold)",
          }}
        >
          {t.eyebrow}
        </p>

        <div className="mt-3 flex items-baseline justify-center gap-2">
          <span
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: "10.5px",
              fontWeight: 600,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "color-mix(in oklab, var(--charcoal) 56%, transparent)",
            }}
          >
            {t.fromLabel}
          </span>
          <span
            className="tabular-nums"
            style={{
              fontFamily: "'Montserrat', system-ui, sans-serif",
              fontSize: "30px",
              fontWeight: 700,
              lineHeight: 1,
              color: "var(--charcoal)",
              letterSpacing: "-0.01em",
            }}
          >
            €{anchor.priceFrom}
          </span>
          <span
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
              fontSize: "13px",
              color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
            }}
          >
            {t.perGuest}
          </span>
        </div>

        <div
          aria-hidden="true"
          className="mx-auto my-4 h-px w-10"
          style={{ background: "color-mix(in oklab, var(--gold) 50%, transparent)" }}
        />

        <p
          className="text-center tabular-nums"
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: "12px",
            color: "color-mix(in oklab, var(--charcoal) 72%, transparent)",
          }}
        >
          <span style={{ fontWeight: 600 }}>€{total.toLocaleString("pt-PT")}</span>
          <span
            style={{
              marginLeft: 6,
              color: "color-mix(in oklab, var(--charcoal) 50%, transparent)",
            }}
          >
            · {t.indicativeFor(party)}
          </span>
        </p>
      </div>

      {included.length > 0 && (
        <div className="border-t" style={{ borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)" }}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="reveal-investment-included"
            className="flex w-full items-center justify-center gap-1.5 px-5 py-3 min-h-[44px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--gold)]"
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: "10.5px",
              fontWeight: 600,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "color-mix(in oklab, var(--charcoal) 70%, transparent)",
            }}
          >
            {open ? t.collapse : t.expand}
            <ChevronDown
              size={13}
              strokeWidth={1.8}
              aria-hidden="true"
              style={{
                transition: "transform 200ms ease-out",
                transform: open ? "rotate(180deg)" : "rotate(0)",
              }}
            />
          </button>

          {open && (
            <div
              id="reveal-investment-included"
              className="px-5 pb-5 motion-safe:animate-[fade-in_0.3s_ease-out_both]"
            >
              <p
                className="mb-2 text-center"
                style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "color-mix(in oklab, var(--charcoal) 64%, transparent)",
                }}
              >
                {t.includedTitle}
              </p>
              <ul className="space-y-1.5">
                {included.map((line, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2"
                    style={{
                      fontFamily: "'Inter', system-ui, sans-serif",
                      fontSize: "12.5px",
                      lineHeight: 1.5,
                      color: "color-mix(in oklab, var(--charcoal) 78%, transparent)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[7px] inline-block h-1 w-1 flex-none rounded-full"
                      style={{ background: "var(--gold)" }}
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <p
                className="mt-4 text-center italic"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "11.5px",
                  lineHeight: 1.55,
                  color: "color-mix(in oklab, var(--charcoal) 56%, transparent)",
                }}
              >
                {t.finalNote}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
