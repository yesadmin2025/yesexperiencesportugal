import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Scale, X } from "lucide-react";
import type { SignatureTour } from "@/data/signatureTours";
import { signatureDurationLabel } from "@/lib/tourContent";
import { PriceEur } from "@/components/ui/PriceEur";
import { Button } from "@/components/ui/button";
import { CtaMotionArrow } from "@/components/ui/CtaButton";
import { TourImage } from "@/components/tours/TourImage";

export type CompareTour = SignatureTour & { highlights: string[] };

type Props = {
  tours: CompareTour[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
};

export function ExperienceCompare({ tours, selected, onToggle, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const chosen = useMemo(() => selected.map((id) => tours.find((tour) => tour.id === id)).filter((tour): tour is CompareTour => Boolean(tour)), [selected, tours]);
  useEffect(() => {
    if (chosen.length < 2) setOpen(false);
  }, [chosen.length]);
  useEffect(() => {
    if (!open) return;
    document.documentElement.dataset.conversionOverlay = "compare";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      delete document.documentElement.dataset.conversionOverlay;
    };
  }, [open]);
  if (chosen.length === 0) return null;

  return (
    <>
      <aside className="experience-compare-dock" aria-live="polite" aria-label="Experience comparison" data-conversion-dock="compare">
        <div className="experience-compare-dock__summary">
          <Scale size={17} aria-hidden="true" />
          <span><strong>{chosen.length}/2 selected</strong><small>{chosen.length === 1 ? "Choose another experience" : "Ready to compare"}</small></span>
        </div>
        <div className="experience-compare-dock__actions">
          <Button type="button" variant="ghost" size="icon" onClick={onClear} aria-label="Clear comparison"><X aria-hidden="true" /></Button>
          <Button type="button" onClick={() => setOpen(true)} disabled={chosen.length < 2}>
            {chosen.length < 2 ? "Choose another" : "Compare 2"}
          </Button>
        </div>
      </aside>

      {open && chosen.length === 2 && (
        <div className="experience-compare-sheet" role="dialog" aria-modal="true" aria-labelledby="compare-title">
          <button className="experience-compare-sheet__backdrop" aria-label="Close comparison" onClick={() => setOpen(false)} />
          <section className="experience-compare-sheet__body">
            <header className="experience-compare-sheet__head">
              <div><p>Signature Experiences</p><h2 id="compare-title">Compare your two days</h2></div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close comparison"><X aria-hidden="true" /></Button>
            </header>
            <div className="experience-compare-sheet__intro">
              {chosen.map((tour) => (
                <article key={tour.id}>
                  <TourImage src={tour.img} alt={tour.title} ratio="3/2" focal={tour.focal} />
                  <p>{tour.region}</p><h3>{tour.title}</h3>
                  <Button type="button" variant="ghost" onClick={() => onToggle(tour.id)}><X aria-hidden="true" /> Remove</Button>
                </article>
              ))}
            </div>
            <div className="experience-compare-sheet__facts">
              {[
                ["Duration", (tour: CompareTour) => signatureDurationLabel(tour.id, tour.durationHours)],
                ["From", (tour: CompareTour) => <><PriceEur amountEur={tour.priceFrom} role="from" /> per person</>],
                ["Ideal for", (tour: CompareTour) => tour.idealFor?.[0] ?? "—"],
              ].map(([label, render]) => (
                <section key={String(label)}><h4>{String(label)}</h4><div>{chosen.map((tour) => <p key={tour.id}>{(render as (tour: CompareTour) => ReactNode)(tour)}</p>)}</div></section>
              ))}
              <section><h4>Highlights</h4><div>{chosen.map((tour) => <ul key={tour.id}>{tour.highlights.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul>)}</div></section>
            </div>
            <div className="experience-compare-sheet__ctas">
              {chosen.map((tour) => <Link key={tour.id} to="/tours/$tourId" params={{ tourId: tour.id }}>See dates &amp; reserve <CtaMotionArrow /></Link>)}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export function CompareControl({ active, disabled, onClick, title }: { active: boolean; disabled: boolean; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className="experience-card-compare inline-flex min-h-[36px] items-center gap-1.5 rounded-sm px-1.5 font-sans text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)] transition-colors hover:text-[color:var(--teal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] disabled:opacity-35"
      aria-label={`${active ? "Remove" : "Compare"} ${title}`}
    >
      {active ? <Check size={13} aria-hidden="true" /> : <Scale size={13} aria-hidden="true" />}
      {active ? "Selected" : "Compare"}
    </button>
  );
}