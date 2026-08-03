import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";

import { findTour } from "@/data/signatureTours";
import type { DestinationIntent } from "@/components/studio-v3/types";
import {
  DISCOVERY_SIGNAL_BY_SIGNATURE,
  decideLivingAtlasSignature,
  type LivingAtlasDiscoverySignal,
} from "@/components/studio-v3/livingAtlasDecision";
import {
  DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES,
  resolveLivingAtlasPreviewDay,
  type LivingAtlasPreviewPreferences,
} from "@/components/studio-v3/livingAtlasPreviewComposition";
import {
  replacementMapsEqual,
  type LivingAtlasReplacementMap,
} from "@/components/studio-v3/livingAtlasAlternatives";
import {
  clearLivingAtlasPreviewState,
  loadLivingAtlasPreviewState,
  saveLivingAtlasPreviewState,
  type LivingAtlasPreviewPathMode,
  type LivingAtlasPreviewStage,
} from "@/components/studio-v3/livingAtlasPreviewState";
import {
  MAX_LEAD_DIMENSIONS,
  MAX_SELECTED_DIMENSIONS,
  type ExperienceDimensionId,
  type ExperienceProfile,
} from "@/components/studio-v3/livingAtlasTaxonomy";
import {
  DestinationStep,
  EntryStep,
  InterestsStep,
  PriorityStep,
} from "@/components/studio-v3/LivingAtlasDiscoverySteps";
import { LivingAtlasDateStep } from "@/components/studio-v3/LivingAtlasDateStep";
import { ResultStep } from "@/components/studio-v3/LivingAtlasResultStep";
import { ShapeStep } from "@/components/studio-v3/LivingAtlasShapeStep";

export function LivingAtlasJourneyPreview() {
  const [stage, setStage] = useState<LivingAtlasPreviewStage>("entry");
  const [pathMode, setPathMode] = useState<LivingAtlasPreviewPathMode | null>(null);
  const [destinationIntent, setDestinationIntent] = useState<DestinationIntent>("no-preference");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selected, setSelected] = useState<ExperienceDimensionId[]>([]);
  const [leads, setLeads] = useState<ExperienceDimensionId[]>([]);
  const [discoverySignal, setDiscoverySignal] = useState<LivingAtlasDiscoverySignal | null>(null);
  const [preferences, setPreferences] = useState<LivingAtlasPreviewPreferences>(
    DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES,
  );
  const [replacements, setReplacements] = useState<LivingAtlasReplacementMap>({});
  const [hasHydrated, setHasHydrated] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const restored = loadLivingAtlasPreviewState();
    if (restored) {
      setStage(restored.stage);
      setPathMode(restored.pathMode);
      setDestinationIntent(restored.destinationIntent);
      setSelectedDate(restored.selectedDate);
      setSelected(restored.selected);
      setLeads(restored.leads);
      setDiscoverySignal(restored.discoverySignal);
      setPreferences(restored.preferences);
      setReplacements(restored.replacements);
      setStatusMessage("Your saved Living Atlas draft has been restored.");
    }
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    saveLivingAtlasPreviewState({
      stage,
      pathMode,
      destinationIntent,
      selectedDate,
      selected,
      leads,
      discoverySignal,
      preferences,
      replacements,
    });
  }, [
    destinationIntent,
    discoverySignal,
    hasHydrated,
    leads,
    pathMode,
    preferences,
    replacements,
    selected,
    selectedDate,
    stage,
  ]);

  const profile: ExperienceProfile = useMemo(() => ({ selected, leads }), [selected, leads]);
  const decision = useMemo(
    () =>
      leads.length > 0
        ? decideLivingAtlasSignature({ profile, destinationIntent, discoverySignal })
        : null,
    [profile, destinationIntent, discoverySignal, leads.length],
  );

  const selectedSignatureId = decision?.selectedSignatureId ?? null;
  const selectedTour = selectedSignatureId ? findTour(selectedSignatureId) : null;
  const resolution = useMemo(
    () =>
      selectedSignatureId && selectedDate
        ? resolveLivingAtlasPreviewDay({
            anchorSignatureId: selectedSignatureId,
            profile,
            preferences,
            selectedDate,
            replacements,
          })
        : null,
    [selectedSignatureId, selectedDate, profile, preferences, replacements],
  );
  const composition = resolution?.composition ?? null;
  const alternativesBySlot = resolution?.alternativesBySlot ?? {};
  const routePlan = resolution?.routePlan ?? null;

  useEffect(() => {
    if (!resolution) return;
    if (!replacementMapsEqual(replacements, resolution.composition.appliedReplacements)) {
      setReplacements(resolution.composition.appliedReplacements);
    }
  }, [replacements, resolution]);

  const reset = () => {
    setStage("entry");
    setPathMode(null);
    setDestinationIntent("no-preference");
    setSelectedDate(null);
    setSelected([]);
    setLeads([]);
    setDiscoverySignal(null);
    setPreferences(DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES);
    setReplacements({});
    setStatusMessage("");
    clearLivingAtlasPreviewState();
  };

  const goBack = () => {
    if (stage === "destination") setStage("entry");
    if (stage === "date") setStage(pathMode === "destination" ? "destination" : "entry");
    if (stage === "interests") setStage("date");
    if (stage === "priority") setStage("interests");
    if (stage === "result") {
      setDiscoverySignal(null);
      setStage(selected.length > 1 ? "priority" : "interests");
    }
    if (stage === "shape") setStage("result");
  };

  const continueFromInterests = () => {
    if (selected.length === 0) return;
    if (selected.length === 1) {
      setLeads([selected[0]]);
      setStage("result");
      return;
    }
    setStage("priority");
  };

  return (
    <main
      className="min-h-[100dvh] w-full px-4 py-8 sm:px-6 sm:py-12"
      style={{
        background:
          "radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--gold) 13%, transparent), transparent 38%), var(--charcoal)",
        color: "var(--ivory)",
      }}
    >
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-6xl flex-col">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.28em]"
              style={{ color: "var(--gold)" }}
            >
              YES Experience Studio · Living Atlas preview
            </p>
            <p
              className="mt-1 text-[11px] leading-relaxed"
              style={{ color: "color-mix(in oklab, var(--ivory) 62%, transparent)" }}
            >
              Isolated, noindex and unbookable. No price, checkout or production behaviour is
              changed.
            </p>
          </div>
          {stage !== "entry" ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-[10px] font-semibold uppercase tracking-[0.2em] transition-opacity hover:opacity-80"
              style={{ borderColor: "color-mix(in oklab, var(--ivory) 20%, transparent)" }}
            >
              <RotateCcw size={13} aria-hidden />
              Restart
            </button>
          ) : null}
        </header>

        <section className="flex flex-1 items-center py-8 sm:py-12">
          <div className="w-full">
            {stage === "entry" ? (
              <EntryStep
                onDiscover={() => {
                  setPathMode("discover");
                  setDestinationIntent("no-preference");
                  setStage("date");
                }}
                onDestination={() => {
                  setPathMode("destination");
                  setStage("destination");
                }}
              />
            ) : null}

            {stage === "destination" ? (
              <DestinationStep
                value={destinationIntent}
                onChange={setDestinationIntent}
                onBack={goBack}
                onContinue={() => setStage("date")}
              />
            ) : null}

            {stage === "date" ? (
              <LivingAtlasDateStep
                selectedDate={selectedDate}
                onChange={(iso) => {
                  setSelectedDate(iso);
                  setReplacements({});
                  setStatusMessage("");
                }}
                onBack={goBack}
                onContinue={() => setStage("interests")}
              />
            ) : null}

            {stage === "interests" ? (
              <InterestsStep
                selected={selected}
                onToggle={(id) => {
                  setDiscoverySignal(null);
                  setSelected((current) => {
                    if (current.includes(id)) {
                      setLeads((currentLeads) => currentLeads.filter((lead) => lead !== id));
                      return current.filter((item) => item !== id);
                    }
                    if (current.length >= MAX_SELECTED_DIMENSIONS) return current;
                    return [...current, id];
                  });
                }}
                onBack={goBack}
                onContinue={continueFromInterests}
              />
            ) : null}

            {stage === "priority" ? (
              <PriorityStep
                selected={selected}
                leads={leads}
                onToggle={(id) => {
                  setDiscoverySignal(null);
                  setLeads((current) => {
                    if (current.includes(id)) return current.filter((item) => item !== id);
                    if (current.length >= MAX_LEAD_DIMENSIONS) return current;
                    return [...current, id];
                  });
                }}
                onBack={goBack}
                onContinue={() => setStage("result")}
              />
            ) : null}

            {stage === "result" && decision ? (
              <ResultStep
                decision={decision}
                profile={profile}
                destinationIntent={destinationIntent}
                selectedTourTitle={selectedTour?.title ?? null}
                onBack={goBack}
                onChooseFork={(signatureId) =>
                  setDiscoverySignal(DISCOVERY_SIGNAL_BY_SIGNATURE[signatureId])
                }
                onCompose={() => setStage("shape")}
              />
            ) : null}

            {stage === "shape" &&
            selectedSignatureId &&
            selectedDate &&
            composition &&
            routePlan ? (
              <ShapeStep
                signatureId={selectedSignatureId}
                signatureTitle={selectedTour?.title ?? selectedSignatureId}
                selectedDate={selectedDate}
                profile={profile}
                preferences={preferences}
                onPreferencesChange={setPreferences}
                composition={composition}
                routePlan={routePlan}
                alternativesBySlot={alternativesBySlot}
                replacements={replacements}
                isPersisted={hasHydrated}
                statusMessage={statusMessage}
                onReplace={(slotId, stopId, message) => {
                  setReplacements((current) => ({ ...current, [slotId]: stopId }));
                  setStatusMessage(message);
                }}
                onUndo={(slotId, message) => {
                  setReplacements((current) => {
                    const next = { ...current };
                    delete next[slotId];
                    return next;
                  });
                  setStatusMessage(message);
                }}
                onBack={goBack}
              />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
