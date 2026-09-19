import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Scale, X } from "lucide-react";
import type { SignatureTour } from "@/data/signatureTours";
import { signatureDurationLabel } from "@/lib/tourContent";
import { PriceEur } from "@/components/ui/PriceEur";
import { Button } from "@/components/ui/button";
import { CtaMotionArrow } from "@/components/ui/CtaButton";

type CompareTour = SignatureTour & { highlights: string[] };

export function ExperienceCompare({ tours }: { tours: CompareTour[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const chosen = useMemo(() => tours.filter((tour) => selected.includes(tour.id)), [selected, tours]);

  const toggle = (id: string) => {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) return current;
      return [...current, id];
    });
  };

  return (
    <div className="experience-compare" aria-label="Compare Signature Experiences">
      <div className="experience-compare__rail" role="group" aria-label="Choose up to three experiences">
        <span className="experience-compare__label"><Scale size={15} aria-hidden="true" /> Compare</span>
        {tours.map((tour) => {
          const active = selected.includes(tour.id);
          return (
            <Button
              key={tour.id}
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={active}
              onClick={() => toggle(tour.id)}
              disabled={!active && selected.length >= 3}
              className="experience-compare__choice"
            >
              {active ? <Check aria-hidden="true" /> : null}{tour.title.split("—")[0].trim()}
            </Button>
          );
        })}
      </div>

      {chosen.length > 0 && (
        <div className="experience-compare__panel" aria-live="polite">
          <div className="experience-compare__panel-head">
            <p>{chosen.length === 1 ? "Choose one more to compare" : `${chosen.length} days compared`}</p>
            <Button type="button" variant="ghost" size="icon" onClick={() => setSelected([])} aria-label="Clear comparison">
              <X aria-hidden="true" />
            </Button>
          </div>
          <div className="experience-compare__grid">
            {chosen.map((tour) => (
              <article key={tour.id} className="experience-compare__column">
                <p className="experience-compare__region">{tour.region}</p>
                <h3>{tour.title}</h3>
                <dl>
                  <div><dt>Duration</dt><dd>{signatureDurationLabel(tour.id, tour.durationHours)}</dd></div>
                  <div><dt>From</dt><dd><PriceEur amountEur={tour.priceFrom} role="from" /> per person</dd></div>
                  <div><dt>Rhythm</dt><dd>{tour.pace.join(" · ")}</dd></div>
                </dl>
                <ul>{tour.highlights.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul>
                <Link to="/tours/$tourId" params={{ tourId: tour.id }}>
                  See dates &amp; reserve <CtaMotionArrow />
                </Link>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}