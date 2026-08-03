import { readFile, writeFile } from "node:fs/promises";

const path = "src/components/studio-v3/LivingAtlasJourneyPreview.tsx";
let source = await readFile(path, "utf8");

if (source.includes("Saved on this device")) {
  console.log("Living Atlas product layer already applied.");
  process.exit(0);
}

function replaceOrThrow(search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Could not find patch anchor: ${label}`);
  }
  source = source.replace(search, replacement);
}

replaceOrThrow(
  'import { useMemo, useState } from "react";',
  'import { useEffect, useMemo, useState } from "react";',
  "React hooks import",
);

replaceOrThrow(
  "  RotateCcw,\n  Waves,",
  "  RefreshCw,\n  RotateCcw,\n  Undo2,\n  Waves,",
  "icons",
);

replaceOrThrow(
  `import {
  composeLivingAtlasPreviewDay,
  DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES,
  formatLivingAtlasDuration,
  livingAtlasPreviewDayTitle,
  type LivingAtlasPreviewPreferences,
} from "@/components/studio-v3/livingAtlasPreviewComposition";`,
  `import {
  DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES,
  formatLivingAtlasDuration,
  livingAtlasPreviewDayTitle,
  resolveLivingAtlasPreviewDay,
  type LivingAtlasPreviewPreferences,
} from "@/components/studio-v3/livingAtlasPreviewComposition";
import {
  formatLivingAtlasDurationDelta,
  replacementMapsEqual,
  type LivingAtlasAlternativesBySlot,
  type LivingAtlasReplacementMap,
  type LivingAtlasResolvedComposition,
} from "@/components/studio-v3/livingAtlasAlternatives";
import {
  clearLivingAtlasPreviewState,
  loadLivingAtlasPreviewState,
  saveLivingAtlasPreviewState,
  type LivingAtlasPreviewPathMode,
  type LivingAtlasPreviewStage,
} from "@/components/studio-v3/livingAtlasPreviewState";`,
  "composition imports",
);

replaceOrThrow(
  `type Stage = "entry" | "destination" | "interests" | "priority" | "result" | "shape";
type PathMode = "discover" | "destination";
`,
  "",
  "local stage types",
);

replaceOrThrow(
  `  const [stage, setStage] = useState<Stage>("entry");
  const [pathMode, setPathMode] = useState<PathMode | null>(null);`,
  `  const [stage, setStage] = useState<LivingAtlasPreviewStage>("entry");
  const [pathMode, setPathMode] = useState<LivingAtlasPreviewPathMode | null>(null);`,
  "typed journey state",
);

replaceOrThrow(
  `  const [preferences, setPreferences] = useState<LivingAtlasPreviewPreferences>(
    DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES,
  );

  const profile: ExperienceProfile = useMemo(() => ({ selected, leads }), [selected, leads]);`,
  `  const [preferences, setPreferences] = useState<LivingAtlasPreviewPreferences>(
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
    stage,
  ]);

  const profile: ExperienceProfile = useMemo(() => ({ selected, leads }), [selected, leads]);`,
  "autosave state",
);

replaceOrThrow(
  `  const composition = useMemo(
    () =>
      selectedSignatureId
        ? composeLivingAtlasPreviewDay({
            anchorSignatureId: selectedSignatureId,
            profile,
            preferences,
          })
        : null,
    [selectedSignatureId, profile, preferences],
  );`,
  `  const resolution = useMemo(
    () =>
      selectedSignatureId
        ? resolveLivingAtlasPreviewDay({
            anchorSignatureId: selectedSignatureId,
            profile,
            preferences,
            replacements,
          })
        : null,
    [selectedSignatureId, profile, preferences, replacements],
  );
  const composition = resolution?.composition ?? null;
  const alternativesBySlot = resolution?.alternativesBySlot ?? {};

  useEffect(() => {
    if (!resolution) return;
    if (!replacementMapsEqual(replacements, resolution.composition.appliedReplacements)) {
      setReplacements(resolution.composition.appliedReplacements);
    }
  }, [replacements, resolution]);`,
  "resolved composition",
);

replaceOrThrow(
  `    setDiscoverySignal(null);
    setPreferences(DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES);
  };`,
  `    setDiscoverySignal(null);
    setPreferences(DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES);
    setReplacements({});
    setStatusMessage("");
    clearLivingAtlasPreviewState();
  };`,
  "reset persistence",
);

replaceOrThrow(
  `                composition={composition}
                onBack={goBack}
              />`,
  `                composition={composition}
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
              />`,
  "ShapeStep props",
);

replaceOrThrow(
  `  composition,
  onBack,
}: {
  signatureId: LivingAtlasSignatureId;
  signatureTitle: string;
  profile: ExperienceProfile;
  preferences: LivingAtlasPreviewPreferences;
  onPreferencesChange: (preferences: LivingAtlasPreviewPreferences) => void;
  composition: ReturnType<typeof composeLivingAtlasPreviewDay>;
  onBack: () => void;
}) {
  const isArrabida = ARRABIDA_SIGNATURES.has(signatureId);
  const title = livingAtlasPreviewDayTitle(composition);`,
  `  composition,
  alternativesBySlot,
  replacements,
  isPersisted,
  statusMessage,
  onReplace,
  onUndo,
  onBack,
}: {
  signatureId: LivingAtlasSignatureId;
  signatureTitle: string;
  profile: ExperienceProfile;
  preferences: LivingAtlasPreviewPreferences;
  onPreferencesChange: (preferences: LivingAtlasPreviewPreferences) => void;
  composition: LivingAtlasResolvedComposition;
  alternativesBySlot: LivingAtlasAlternativesBySlot;
  replacements: LivingAtlasReplacementMap;
  isPersisted: boolean;
  statusMessage: string;
  onReplace: (slotId: string, stopId: string, message: string) => void;
  onUndo: (slotId: string, message: string) => void;
  onBack: () => void;
}) {
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
  const isArrabida = ARRABIDA_SIGNATURES.has(signatureId);
  const title = livingAtlasPreviewDayTitle(composition);`,
  "ShapeStep signature",
);

replaceOrThrow(
  `      <div className="mt-8 grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">`,
  `      <div
        className="mx-auto mt-5 flex max-w-3xl flex-wrap items-center justify-center gap-2 text-center"
        role="status"
        aria-live="polite"
      >
        {isPersisted ? (
          <span
            className="rounded-full border px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em]"
            style={{
              borderColor: "color-mix(in oklab, var(--gold) 34%, transparent)",
              color: "var(--gold)",
            }}
          >
            Saved on this device
          </span>
        ) : null}
        <span
          className="text-[11px] leading-5"
          style={{ color: "color-mix(in oklab, var(--ivory) 62%, transparent)" }}
        >
          {statusMessage ||
            "Every change is checked against the region, timing and interests before it enters your day."}
        </span>
      </div>
      <div className="mt-8 grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">`,
  "autosave status UI",
);

const itineraryPattern = /            <ol className="mt-6 space-y-3">[\s\S]*?            <\/ol>/;
if (!itineraryPattern.test(source)) {
  throw new Error("Could not find patch anchor: itinerary list");
}
source = source.replace(
  itineraryPattern,
  `            <ol className="mt-6 space-y-3">
              {composition.moments.map((moment, index) => {
                const alternatives = alternativesBySlot[moment.slotId] ?? [];
                const expanded = expandedSlotId === moment.slotId;
                const changed = Boolean(replacements[moment.slotId]);
                return (
                  <li
                    key={moment.slotId}
                    className="rounded-xl border p-4"
                    style={{
                      borderColor: changed
                        ? "color-mix(in oklab, var(--gold) 48%, transparent)"
                        : "color-mix(in oklab, var(--ivory) 13%, transparent)",
                      background: "color-mix(in oklab, var(--charcoal) 78%, transparent)",
                    }}
                  >
                    <div className="grid grid-cols-[2rem_1fr_auto] gap-3">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold"
                        style={{ background: "var(--gold)", color: "var(--charcoal)" }}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[15px] font-semibold">{moment.label}</p>
                          {changed ? (
                            <span
                              className="rounded-full px-2 py-1 text-[8px] font-bold uppercase tracking-[0.16em]"
                              style={{
                                background: "color-mix(in oklab, var(--gold) 18%, transparent)",
                                color: "var(--gold)",
                              }}
                            >
                              Your change
                            </span>
                          ) : null}
                        </div>
                        {moment.originalLabel ? (
                          <p
                            className="mt-1 text-[10px] leading-4"
                            style={{ color: "color-mix(in oklab, var(--ivory) 48%, transparent)" }}
                          >
                            Replaces {moment.originalLabel}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {moment.dimensions
                            .filter((dimension) => profile.selected.includes(dimension))
                            .map((dimension) => (
                              <span
                                key={dimension}
                                className="rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em]"
                                style={{
                                  borderColor: "color-mix(in oklab, var(--gold) 28%, transparent)",
                                  color: "color-mix(in oklab, var(--ivory) 72%, transparent)",
                                }}
                              >
                                {dimensionLabel(dimension)}
                              </span>
                            ))}
                        </div>
                      </div>
                      <span
                        className="pt-1 text-[11px]"
                        style={{ color: "color-mix(in oklab, var(--ivory) 58%, transparent)" }}
                      >
                        {moment.durationMin} min
                      </span>
                    </div>

                    <div
                      className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3"
                      style={{ borderColor: "color-mix(in oklab, var(--ivory) 10%, transparent)" }}
                    >
                      <span
                        className="text-[9px] font-semibold uppercase tracking-[0.14em]"
                        style={{ color: "color-mix(in oklab, var(--ivory) 46%, transparent)" }}
                      >
                        {alternatives.length > 0 ? "Validated choices available" : "Protected by your answers"}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {changed ? (
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedSlotId(null);
                              onUndo(
                                moment.slotId,
                                `${moment.label} was removed and the original moment was restored.`,
                              );
                            }}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[9px] font-bold uppercase tracking-[0.14em]"
                            style={{ borderColor: "color-mix(in oklab, var(--ivory) 18%, transparent)" }}
                          >
                            <Undo2 size={12} aria-hidden /> Undo
                          </button>
                        ) : null}
                        {alternatives.length > 0 ? (
                          <button
                            type="button"
                            aria-expanded={expanded}
                            aria-controls={`living-atlas-alternatives-${moment.slotId}`}
                            onClick={() => setExpandedSlotId(expanded ? null : moment.slotId)}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[9px] font-bold uppercase tracking-[0.14em]"
                            style={{
                              borderColor: "color-mix(in oklab, var(--gold) 38%, transparent)",
                              color: "var(--gold)",
                            }}
                          >
                            <RefreshCw size={12} aria-hidden />
                            {expanded ? "Hide alternatives" : `${alternatives.length} alternatives`}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {expanded ? (
                      <div
                        id={`living-atlas-alternatives-${moment.slotId}`}
                        className="mt-3 grid gap-2 sm:grid-cols-2"
                        role="region"
                        aria-label={`Alternatives to ${moment.label}`}
                      >
                        {alternatives.map((alternative) => (
                          <article
                            key={alternative.moment.stopId}
                            className="rounded-xl border p-3"
                            style={{
                              borderColor: "color-mix(in oklab, var(--gold) 24%, transparent)",
                              background: "color-mix(in oklab, var(--ivory) 4%, transparent)",
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="text-[13px] font-semibold leading-5">
                                  {alternative.moment.label}
                                </h3>
                                <p
                                  className="mt-1 text-[10px] font-bold uppercase tracking-[0.13em]"
                                  style={{ color: "var(--gold)" }}
                                >
                                  {formatLivingAtlasDurationDelta(alternative.durationDeltaMin)}
                                </p>
                              </div>
                              <span
                                className="rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em]"
                                style={{ borderColor: "color-mix(in oklab, var(--ivory) 16%, transparent)" }}
                              >
                                Checked
                              </span>
                            </div>
                            <p
                              className="mt-2 text-[11px] leading-5"
                              style={{ color: "color-mix(in oklab, var(--ivory) 62%, transparent)" }}
                            >
                              {alternative.explanation}
                            </p>
                            <button
                              type="button"
                              aria-label={`Replace ${moment.label} with ${alternative.moment.label}`}
                              onClick={() => {
                                setExpandedSlotId(null);
                                onReplace(
                                  moment.slotId,
                                  alternative.moment.stopId,
                                  `${moment.label} was replaced by ${alternative.moment.label}. The title, duration and coverage were recalculated.`,
                                );
                              }}
                              className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[9px] font-bold uppercase tracking-[0.14em]"
                              style={{ background: "var(--ivory)", color: "var(--charcoal)" }}
                            >
                              Use this moment <ArrowRight size={12} aria-hidden />
                            </button>
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>`,
);

replaceOrThrow(
  `  composition: ReturnType<typeof composeLivingAtlasPreviewDay>;
}) {`,
  `  composition: LivingAtlasResolvedComposition;
}) {`,
  "CompositionStatus type",
);

await writeFile(path, source);
console.log("Applied Living Atlas alternatives and persistence UI layer.");
