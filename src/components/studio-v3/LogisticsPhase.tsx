/**
 * LogisticsPhase — the single persisted `logistics` phase, presented as three
 * light moments instead of one three-field form.
 *
 * WHEN → WHERE → WHO → compact review. All progression is LOCAL UI state:
 * nothing new is persisted on StudioV3State, no Studio phase is added or
 * resurrected, and the committed fields are exactly the ones the old screen
 * committed (dateMode/dateExact, pickup, adults/minorAges/guests).
 *
 * Business truth is untouched: the date rules come from DatePhaseControls and
 * `dateGuards`, the guest rules from Composition/GuestStepper, and every
 * visible pickup maps onto an existing operational `Pickup` id. Airport and
 * cruise pickups stay fully supported — they are simply moved out of the
 * primary grid into a quiet secondary line under Lisbon, so the first choice
 * reads like a human question rather than an operations dropdown.
 */

import { useMemo, useState } from "react";
import { ChoiceGrid } from "./ChoiceGrid";
import { Composition } from "./Composition";
import { DatePhaseControls, dateDisplayLabel } from "./DatePhase";
import { BackLink, ContinueCta, PhaseHeader, UnderstoodSummaryLine } from "./PhaseChrome";
import { formatGuestComposition } from "./formatGuests";
import type { ChoiceOption, Pickup, StudioV3State } from "./types";

/** Internal moments of the single Logistics phase. UI state only. */
export type LogisticsMoment = "when" | "where" | "who" | "review";

const MOMENT_ORDER: LogisticsMoment[] = ["when", "where", "who", "review"];

/** Visible pickup taxonomy. Each group resolves to a real `Pickup` id. */
export type PickupGroup =
  | "lisbon"
  | "cascais-estoril"
  | "sintra"
  | "sesimbra-setubal-arrabida"
  | "comporta-troia"
  | "other";

export const PICKUP_GROUPS: ChoiceOption<PickupGroup>[] = [
  { id: "lisbon", label: "Lisbon", whisper: "From your hotel or address." },
  { id: "cascais-estoril", label: "Cascais & Estoril", whisper: "The Atlantic edge." },
  { id: "sintra", label: "Sintra", whisper: "Among the palaces and pine." },
  {
    id: "sesimbra-setubal-arrabida",
    label: "Sesimbra, Setúbal & Arrábida",
    whisper: "South of the river.",
  },
  { id: "comporta-troia", label: "Comporta & Tróia", whisper: "By request." },
  { id: "other", label: "Somewhere else", whisper: "We'll work it out together." },
];

/** Lisbon arrival refinements — existing operational ids, never deleted. */
export const LISBON_ARRIVALS: { id: Pickup; label: string }[] = [
  { id: "lisbon-airport", label: "Airport" },
  { id: "lisbon-cruise", label: "Cruise terminal" },
  { id: "lisbon", label: "Standard Lisbon pickup" },
];

const LISBON_FAMILY: Pickup[] = ["lisbon", "lisbon-airport", "lisbon-cruise"];

/** Which visible group a saved/hydrated operational pickup belongs to. */
export function pickupGroupOf(pickup: Pickup | null | undefined): PickupGroup | null {
  if (!pickup) return null;
  if ((LISBON_FAMILY as string[]).includes(pickup)) return "lisbon";
  return pickup as PickupGroup;
}

/** Default operational id when a visible group is picked. */
export function defaultPickupForGroup(group: PickupGroup, current: Pickup | null): Pickup {
  if (group === "lisbon") {
    // Keep an already-saved airport/cruise choice rather than downgrading it.
    return current && (LISBON_FAMILY as string[]).includes(current) ? current : "lisbon";
  }
  return group;
}

/** Human label for the compact review row. */
export function pickupReviewLabel(pickup: Pickup | null): string {
  if (!pickup) return "";
  if (pickup === "lisbon-airport") return "Lisbon airport";
  if (pickup === "lisbon-cruise") return "Lisbon cruise terminal";
  if (pickup === "other") return "Somewhere else";
  return PICKUP_GROUPS.find((g) => g.id === pickup)?.label ?? pickup;
}

/** The moment Logistics should open on for a given (possibly hydrated) state. */
export function initialLogisticsMoment(state: StudioV3State): LogisticsMoment {
  if (state.dateMode && state.pickup) return "review";
  if (state.dateMode) return "where";
  return "when";
}

interface Props {
  state: StudioV3State;
  setState: (updater: (s: StudioV3State) => StudioV3State) => void;
  onAdultsChange: (n: number) => void;
  onAddMinor: () => void;
  onRemoveMinor: (index: number) => void;
  onMinorAgeChange: (index: number, age: number) => void;
  /** Leave Logistics backwards, to the previous real Studio phase. */
  onBackPhase: () => void;
  /** Commit the same fields as before and advance to the next real phase. */
  onCompose: () => void;
  /** True when the adaptive refinement question already carried the
   *  acknowledgement, so Logistics must not repeat it. */
  acknowledgementShownEarlier: boolean;
}

export function LogisticsPhase({
  state,
  setState,
  onAdultsChange,
  onAddMinor,
  onRemoveMinor,
  onMinorAgeChange,
  onBackPhase,
  onCompose,
  acknowledgementShownEarlier,
}: Props) {
  const [moment, setMoment] = useState<LogisticsMoment>(() => initialLogisticsMoment(state));

  const group = pickupGroupOf(state.pickup);
  const showLisbonArrivals = group === "lisbon";

  const guestsLabel = useMemo(
    () => formatGuestComposition(state.adults ?? state.guests, state.minorAges ?? [], state.guests),
    [state.adults, state.guests, state.minorAges],
  );

  const goBack = () => {
    const index = MOMENT_ORDER.indexOf(moment);
    if (index <= 0) {
      onBackPhase();
      return;
    }
    setMoment(MOMENT_ORDER[index - 1]!);
  };

  const goNext = () => {
    const index = MOMENT_ORDER.indexOf(moment);
    if (index < MOMENT_ORDER.length - 1) setMoment(MOMENT_ORDER[index + 1]!);
  };

  return (
    <>
      <BackLink onClick={goBack} />
      <PhaseHeader
        eyebrow="The practical part"
        title={HEADINGS[moment].title}
        titleAccent={HEADINGS[moment].accent}
      />

      {moment === "when" && !acknowledgementShownEarlier ? (
        <div className="mt-4">
          <UnderstoodSummaryLine state={state} />
        </div>
      ) : null}

      <div
        data-testid="studio-v3-logistics"
        data-logistics-moment={moment}
        className="w-full max-w-[520px] mx-auto mt-6 flex flex-col items-center"
      >
        {moment === "when" ? (
          <section className="w-full" aria-label="When">
            <DatePhaseControls
              dateExact={state.dateExact}
              dateMode={state.dateMode}
              onPickExact={(iso) => setState((s) => ({ ...s, dateExact: iso, dateMode: "exact" }))}
              onPickFlexible={() =>
                setState((s) => ({ ...s, dateExact: null, dateMode: "flexible" }))
              }
              onPickUndecided={() =>
                setState((s) => ({ ...s, dateExact: null, dateMode: "undecided" }))
              }
            />
          </section>
        ) : null}

        {moment === "where" ? (
          <section className="w-full" aria-label="Where the day begins">
            <ChoiceGrid
              options={PICKUP_GROUPS}
              value={group}
              onSelect={(id) =>
                setState((s) => ({ ...s, pickup: defaultPickupForGroup(id, s.pickup) }))
              }
              columns={1}
            />
            {showLisbonArrivals ? (
              <div
                data-testid="studio-v3-lisbon-arrivals"
                className="mt-5 w-full"
                style={{ animation: "studioV3RiseIn 380ms ease-out both" }}
              >
                <p
                  className="text-[11px] uppercase tracking-[0.22em]"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "color-mix(in oklab, var(--charcoal) 62%, transparent)",
                  }}
                >
                  Arriving by air or sea?
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {LISBON_ARRIVALS.map((arrival) => {
                    const selected = state.pickup === arrival.id;
                    return (
                      <button
                        key={arrival.id}
                        type="button"
                        data-pickup-id={arrival.id}
                        data-selected={selected ? "true" : "false"}
                        aria-pressed={selected}
                        onClick={() => setState((s) => ({ ...s, pickup: arrival.id }))}
                        className="min-h-[44px] px-3.5 text-[12px] border transition-[border-color,background-color] duration-[180ms] ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                        style={{
                          fontFamily: "var(--font-body)",
                          color: "var(--charcoal)",
                          background: selected
                            ? "color-mix(in oklab, var(--teal) 8%, var(--ivory))"
                            : "var(--ivory)",
                          borderColor: selected
                            ? "var(--teal)"
                            : "color-mix(in oklab, var(--charcoal) 14%, transparent)",
                        }}
                      >
                        {arrival.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {moment === "who" ? (
          <section className="w-full" aria-label="Your party">
            <Composition
              adults={state.adults ?? state.guests}
              adultsInferred={state.guestsInferred}
              minorAges={state.minorAges ?? []}
              onAdultsChange={onAdultsChange}
              onAddMinor={onAddMinor}
              onRemoveMinor={onRemoveMinor}
              onMinorAgeChange={onMinorAgeChange}
            />
          </section>
        ) : null}

        {moment === "review" ? (
          <section
            className="w-full"
            aria-label="Your details"
            data-testid="studio-v3-logistics-review"
          >
            <ReviewRow
              moment="when"
              label="Date"
              value={dateDisplayLabel(state.dateMode, state.dateExact)}
              onEdit={() => setMoment("when")}
            />
            <ReviewRow
              moment="where"
              label="Pickup"
              value={pickupReviewLabel(state.pickup)}
              onEdit={() => setMoment("where")}
            />
            <ReviewRow
              moment="who"
              label="Guests"
              value={guestsLabel ?? ""}
              onEdit={() => setMoment("who")}
            />
            <p
              className="mt-5 text-[12.5px] leading-snug italic"
              style={{
                fontFamily: "var(--font-serif)",
                color: "color-mix(in oklab, var(--charcoal) 62%, transparent)",
              }}
            >
              That's enough for us to shape the route.
            </p>
          </section>
        ) : null}
      </div>

      {moment === "review" ? (
        <ContinueCta disabled={false} onClick={onCompose} label="Compose my day" />
      ) : (
        <ContinueCta
          disabled={!canLeave(moment, state)}
          onClick={goNext}
          label={continueLabel(moment, state)}
        />
      )}

      <MomentDots moment={moment} />
    </>
  );
}

const HEADINGS: Record<LogisticsMoment, { title: string; accent: string }> = {
  when: { title: "When are we", accent: "making it happen?" },
  where: { title: "Where should", accent: "we collect you?" },
  who: { title: "How many", accent: "are coming?" },
  review: { title: "This is", accent: "your day's frame" },
};

function canLeave(moment: LogisticsMoment, state: StudioV3State): boolean {
  if (moment === "when") return Boolean(state.dateMode);
  if (moment === "where") return Boolean(state.pickup);
  return true;
}

function continueLabel(moment: LogisticsMoment, state: StudioV3State): string {
  if (moment === "when")
    return state.dateMode ? "Continue" : "Pick a date, or tell us you're flexible";
  if (moment === "where") return state.pickup ? "Continue" : "Where does the day begin?";
  return "Continue";
}

function ReviewRow({
  moment,
  label,
  value,
  onEdit,
}: {
  moment: LogisticsMoment;
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div
      data-testid="studio-v3-logistics-review-row"
      data-review-row={moment}
      className="flex items-center justify-between gap-3 py-3 border-b"
      style={{ borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)" }}
    >
      <div className="min-w-0">
        <p
          className="text-[10.5px] uppercase tracking-[0.24em]"
          style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
        >
          {label}
        </p>
        <p
          className="mt-0.5 text-[14.5px] leading-snug truncate"
          style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
        >
          {value || "—"}
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        data-edit-row={moment}
        className="shrink-0 min-h-[44px] min-w-[44px] px-2 text-[10.5px] uppercase tracking-[0.22em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
        style={{ color: "var(--teal)" }}
        aria-label={`Edit ${label.toLowerCase()}`}
      >
        Edit
      </button>
    </div>
  );
}

/** Tiny, quiet progress indicator — no "1 of 3" fraction. */
function MomentDots({ moment }: { moment: LogisticsMoment }) {
  const index = Math.min(MOMENT_ORDER.indexOf(moment), 2);
  return (
    <div className="mt-6 flex items-center gap-1.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-[3px] w-5 transition-colors duration-[220ms]"
          style={{
            background:
              i <= index ? "var(--gold)" : "color-mix(in oklab, var(--charcoal) 16%, transparent)",
          }}
        />
      ))}
    </div>
  );
}
