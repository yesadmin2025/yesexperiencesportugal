from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content)


def replace_once(path: str, old: str, new: str) -> None:
    content = read(path)
    if old not in content:
        raise RuntimeError(f"Expected snippet not found in {path}: {old[:140]!r}")
    write(path, content.replace(old, new, 1))


# Route composition is enabled in the current Studio. curateJourney applies
# operational closures before replacement/extra-stop composition, so a later
# REGION_STOP_POOL candidate could re-introduce a stop that was correctly
# removed for the selected date. Revalidate AFTER every composition layer.
# If a replacement is closed, top the route back up from the already-curated,
# already-open original moments rather than silently shortening the day.
curation_path = "src/components/studio-v3/curation.ts"
replace_once(
    curation_path,
    "  const routePoints = composedRoutePoints.slice(0, 4);\n\n  // Short route sentence",
    '''  if (dateExact) {
    const openComposed = composedRoutePoints.filter(
      (point) => !isStopClosedOn(`${point.label} ${point.story}`, dateExact),
    );
    const desiredCount = Math.min(journey.moments.length, composedRoutePoints.length);
    const seen = new Set(openComposed.map((point) => point.label.toLowerCase()));

    for (const moment of journey.moments) {
      if (openComposed.length >= desiredCount) break;
      const key = moment.label.toLowerCase();
      if (seen.has(key)) continue;
      if (isStopClosedOn(`${moment.label} ${moment.story}`, dateExact)) continue;
      openComposed.push({
        index: openComposed.length,
        label: moment.label,
        story: moment.story,
        lat: moment.lat,
        lng: moment.lng,
      });
      seen.add(key);
    }

    composedRoutePoints.length = 0;
    openComposed.forEach((point, index) => composedRoutePoints.push({ ...point, index }));
  }

  const routePoints = composedRoutePoints.slice(0, 4);

  // Short route sentence''',
)

# jsdom does not provide matchMedia, while EditorialMap correctly consults it
# for reduced-motion. Stub only in the focused test environment.
test_path = "src/components/studio-v3/__tests__/studio-p8-route-truth.test.tsx"
replace_once(
    test_path,
    'describe("P8 hardening — truthful Your Day cartography", () => {\n',
    '''describe("P8 hardening — truthful Your Day cartography", () => {
  const installMatchMedia = () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  };
''',
)
replace_once(
    test_path,
    '  it("earns map mode only when every moment has real coherent coordinates", () => {\n    const resolved =',
    '  it("earns map mode only when every moment has real coherent coordinates", () => {\n    installMatchMedia();\n    const resolved =',
)

print("P8 hardening follow-up applied")
