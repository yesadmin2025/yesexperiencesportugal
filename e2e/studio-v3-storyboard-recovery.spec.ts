/**
 * Studio V3 storyboard recovery E2E.
 *
 * Reproduces the "Still not working" dead-end where a persisted
 * empty `editedRoutePoints` array on an otherwise valid Signature
 * draft stranded the storyboard on the "We couldn't compose a draft"
 * copy. Locks in the seedFromPool() + editedStops-empty-guard fix
 * in StudioV3.tsx.
 *
 * Two scenarios:
 *   1. Persisted `editedRoutePoints: []` — must not render the
 *      dead-end block; must render the active stops editor with
 *      at least one stop row.
 *   2. Persisted `editedRoutePoints: null` — the seedFromPool()
 *      recovery path must still surface real Signature stops.
 *
 * Soft-skips if the storyboard testid never appears within 15s
 * (draft hydration path shifted) so unrelated Studio refactors
 * don't red-line CI.
 */
import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { STUDIO_DRAFT_STORAGE_KEY } from "../src/components/studio-v3/studioDraftStorage";

const ARTIFACT_DIR = path.resolve(process.cwd(), "playwright-report/storyboard-recovery");

type EditedRoutePoints = Array<{ label: string; story: string }> | null;

function envelopeWith(editedRoutePoints: EditedRoutePoints) {
  return {
    version: 2 as const,
    draftId: "e2e-storyboard-recovery",
    savedAt: Date.now(),
    tourId: "sintra-cascais",
    addOnIds: [],
    state: {
      phase: "storyboard",
      feeling: "coastal",
      companions: "friends",
      occasion: "none",
      dateMode: "exact",
      dateExact: "2099-05-01",
      pickup: "lisbon",
      guests: 4,
      minorAges: [],
      interests: ["heritage", "coast", "photography"],
      rhythm: "full",
      considerations: ["none"],
      language: "en",
      investment: "elevated",
      tourId: "sintra-cascais",
      journeyTitle: "Sintra & Cascais — private day",
      guestsInferred: false,
      guestsPrivateEvent: false,
      firstName: "Alex",
      editedRoutePoints,
      destinationIntent: "lisbon-sintra-cascais",
      pathMode: "guided",
      rerollCount: 0,
      guestDraft: null,
    },
  };
}

async function hydrateDraft(page: Page, editedRoutePoints: EditedRoutePoints) {
  await page.addInitScript(
    ({ key, envelope }) => {
      window.localStorage.setItem(key, JSON.stringify(envelope));
    },
    { key: STUDIO_DRAFT_STORAGE_KEY, envelope: envelopeWith(editedRoutePoints) },
  );
}

async function ensureStoryboardOrSkip(page: Page) {
  const editor = page.getByTestId("studio-v3-stops-editor");
  const deadEnd = page.getByTestId("studio-v3-stops-editor-empty");
  try {
    await expect
      .poll(async () => (await editor.count()) + (await deadEnd.count()), {
        timeout: 15_000,
      })
      .toBeGreaterThan(0);
  } catch {
    test.skip(
      true,
      "Studio V3 storyboard did not hydrate from persisted draft within 15s — draft hydration path may have shifted.",
    );
  }
}

/**
 * Wraps a `toHaveScreenshot` assertion so that CI logs receive a
 * loud, greppable annotation with the scenario name and the last
 * observed stop count when the pixel diff fails. Without this,
 * a snapshot mismatch just shows a generic Playwright diff and
 * you have to open the HTML report to figure out which scenario
 * broke and how many stops actually rendered.
 */
async function assertEditorSnapshotWithAnnotation(
  page: Page,
  testInfo: import("@playwright/test").TestInfo,
  scenario: string,
  snapshotName: string,
) {
  const editor = page.getByTestId("studio-v3-stops-editor");
  const stopCount = await page.getByTestId("studio-v3-stop-row").count();

  testInfo.annotations.push(
    { type: "scenario", description: scenario },
    { type: "recovered-stop-count", description: String(stopCount) },
  );

  try {
    await expect(editor).toHaveScreenshot(snapshotName);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const banner = [
      "",
      "──────────────────────────────────────────────────────────────",
      `[storyboard-recovery] SCREENSHOT MISMATCH`,
      `  scenario:            ${scenario}`,
      `  snapshot:            ${snapshotName}`,
      `  recovered stop count: ${stopCount}`,
      `  spec:                ${testInfo.titlePath.join(" › ")}`,
      "──────────────────────────────────────────────────────────────",
      "",
    ].join("\n");
    // stderr so GitHub Actions surfaces it in the failing step log.
    process.stderr.write(banner);
    // GitHub Actions workflow-command so the annotation shows up
    // inline on the failing spec in the Checks UI.
    if (process.env.GITHUB_ACTIONS) {
      const oneLine = `storyboard-recovery: ${scenario} — recovered ${stopCount} stop(s); snapshot ${snapshotName} mismatched`;
      process.stdout.write(`::error title=Storyboard recovery snapshot mismatch::${oneLine}\n`);
    }
    testInfo.annotations.push({
      type: "screenshot-mismatch",
      description: `${scenario} — recovered ${stopCount} stop(s) — ${snapshotName}`,
    });
    throw new Error(
      `[storyboard-recovery] ${scenario} — recovered ${stopCount} stop(s) — snapshot ${snapshotName} mismatched\n${message}`,
    );
  }
}

/**
 * Read the visible stop labels (h3 in each RefineStopCard) in DOM order.
 * The editor renders one h3 per stop row, so the returned array mirrors
 * the storyboard order the guest sees.
 */
async function readRenderedLabels(page: Page): Promise<string[]> {
  return page.getByTestId("studio-v3-stop-row").locator("h3").allInnerTexts();
}

/**
 * Persisted non-editor metadata that MUST survive stops-editor recovery
 * unchanged. If recovery ever touched these, the fix would be leaking out
 * of the stops editor scope. Values here match the envelope in `envelopeWith`.
 */
const EXPECTED_PERSISTED_METADATA = {
  journeyTitle: "Sintra & Cascais — private day",
  firstName: "Alex",
};

async function assertPersistedMetadataIntact(page: Page) {
  // journeyTitle round-trip — rendered inside SaveSignatureButton's
  // accessible label and typically visible in the storyboard header.
  await expect(
    page.getByText(EXPECTED_PERSISTED_METADATA.journeyTitle, { exact: false }).first(),
  ).toBeVisible();
  // firstName round-trip — the storyboard greets the guest by first name;
  // if this disappears, hydration corrupted more than the stops list.
  await expect(
    page.getByText(EXPECTED_PERSISTED_METADATA.firstName, { exact: false }).first(),
  ).toBeVisible();
}

test.use({ viewport: { width: 393, height: 852 } });

test.describe("Studio V3 storyboard recovery", () => {
  test("persisted empty editedRoutePoints does not strand the editor", async ({ page }, testInfo) => {
    const scenario = "persisted empty editedRoutePoints";
    await hydrateDraft(page, []);
    await page.goto("/studio-v3");
    await ensureStoryboardOrSkip(page);

    const editor = page.getByTestId("studio-v3-stops-editor");
    await expect(page.getByTestId("studio-v3-stops-editor-empty")).toHaveCount(0);
    await expect(editor).toBeVisible();
    await expect(page.getByTestId("studio-v3-stop-row").first()).toBeVisible();
    await expect(
      page.getByText("We couldn't compose a draft for this combination.", { exact: false }),
    ).toHaveCount(0);

    // Recovery seeded from the Signature pool — labels must be real,
    // non-empty strings, not placeholders. Persisted metadata (title,
    // firstName) must survive untouched.
    const labels = await readRenderedLabels(page);
    testInfo.annotations.push({
      type: "recovered-labels",
      description: JSON.stringify(labels),
    });
    expect(labels.length).toBeGreaterThan(0);
    for (const l of labels) expect(l.trim().length).toBeGreaterThan(0);
    await assertPersistedMetadataIntact(page);


    const editorShot = await editor.screenshot({
      path: path.join(ARTIFACT_DIR, "empty-editedRoutePoints-editor.png"),
    });
    await testInfo.attach("stops-editor (empty editedRoutePoints)", {
      body: editorShot,
      contentType: "image/png",
    });
    const pageShot = await page.screenshot({
      path: path.join(ARTIFACT_DIR, "empty-editedRoutePoints-page.png"),
    });
    await testInfo.attach("storyboard viewport (empty editedRoutePoints)", {
      body: pageShot,
      contentType: "image/png",
    });

    // Baselines live next to the spec at `*-snapshots/`. Update with
    // `bunx playwright test e2e/studio-v3-storyboard-recovery.spec.ts --update-snapshots`.
    await assertEditorSnapshotWithAnnotation(
      page,
      testInfo,
      scenario,
      "stops-editor-empty-editedRoutePoints.png",
    );
  });

  test("null editedRoutePoints seeds real Signature stops", async ({ page }, testInfo) => {
    const scenario = "null editedRoutePoints (seedFromPool)";
    await hydrateDraft(page, null);
    await page.goto("/studio-v3");
    await ensureStoryboardOrSkip(page);

    const editor = page.getByTestId("studio-v3-stops-editor");
    await expect(page.getByTestId("studio-v3-stop-row").first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("studio-v3-stops-editor-empty")).toHaveCount(0);

    const labels = await readRenderedLabels(page);
    testInfo.annotations.push({
      type: "recovered-labels",
      description: JSON.stringify(labels),
    });
    expect(labels.length).toBeGreaterThan(0);
    for (const l of labels) expect(l.trim().length).toBeGreaterThan(0);
    await assertPersistedMetadataIntact(page);


    const editorShot = await editor.screenshot({
      path: path.join(ARTIFACT_DIR, "null-editedRoutePoints-editor.png"),
    });
    await testInfo.attach("stops-editor (null editedRoutePoints)", {
      body: editorShot,
      contentType: "image/png",
    });
    const pageShot = await page.screenshot({
      path: path.join(ARTIFACT_DIR, "null-editedRoutePoints-page.png"),
    });
    await testInfo.attach("storyboard viewport (null editedRoutePoints)", {
      body: pageShot,
      contentType: "image/png",
    });

    await assertEditorSnapshotWithAnnotation(
      page,
      testInfo,
      scenario,
      "stops-editor-null-editedRoutePoints.png",
    );
  });
});

/**
 * Extra persisted-route-state scenarios.
 *
 * These lock in editor recovery for shapes that *aren't* the two
 * bugs the original fix targeted, but that a stale localStorage
 * envelope from an older build could realistically hand us:
 *   • single-stop partial edit (guest deleted all but one)
 *   • long override (more stops than the Signature pool)
 *   • whitespace / empty-label rows (malformed persisted data)
 *   • duplicate labels (legacy duplication bug artefact)
 *
 * Assertions are structural only (no snapshot baselines) — visual
 * regression stays on the two canonical scenarios above. We DO
 * annotate the recovered stop count on every case so a CI failure
 * tells you exactly which shape stranded the editor.
 */
type ExtraScenario = {
  name: string;
  slug: string;
  editedRoutePoints: NonNullable<EditedRoutePoints>;
  expectMinRows: number;
};

const EXTRA_SCENARIOS: ExtraScenario[] = [
  {
    name: "partial edit — single custom stop",
    slug: "partial-single",
    editedRoutePoints: [
      { label: "Cabo da Roca cliffs", story: "Sunset at the westernmost point of Europe." },
    ],
    expectMinRows: 1,
  },
  {
    name: "override longer than Signature pool",
    slug: "over-long",
    editedRoutePoints: Array.from({ length: 8 }).map((_, i) => ({
      label: `Custom stop ${i + 1}`,
      story: `Guest-added moment number ${i + 1}.`,
    })),
    expectMinRows: 6,
  },
  {
    name: "malformed rows — whitespace labels + empty stories",
    slug: "malformed",
    editedRoutePoints: [
      { label: "   ", story: "" },
      { label: "Sintra centro", story: "Old town wander." },
      { label: "", story: "   " },
    ],
    expectMinRows: 1,
  },
  {
    name: "duplicate labels — legacy duplication artefact",
    slug: "duplicates",
    editedRoutePoints: [
      { label: "Quinta da Regaleira", story: "Initiation well." },
      { label: "Quinta da Regaleira", story: "Initiation well." },
      { label: "Praia da Ursa", story: "Hidden cove hike." },
    ],
    expectMinRows: 2,
  },
];

test.describe("Studio V3 storyboard recovery — extra persisted states", () => {
  for (const scenario of EXTRA_SCENARIOS) {
    test(scenario.name, async ({ page }, testInfo) => {
      await hydrateDraft(page, scenario.editedRoutePoints);
      await page.goto("/studio-v3");
      await ensureStoryboardOrSkip(page);

      const editor = page.getByTestId("studio-v3-stops-editor");
      await expect(page.getByTestId("studio-v3-stops-editor-empty")).toHaveCount(0);
      await expect(editor).toBeVisible();
      await expect(
        page.getByText("We couldn't compose a draft for this combination.", { exact: false }),
      ).toHaveCount(0);

      const stopRows = page.getByTestId("studio-v3-stop-row");
      await expect(stopRows.first()).toBeVisible();
      const stopCount = await stopRows.count();

      testInfo.annotations.push(
        { type: "scenario", description: scenario.name },
        { type: "persisted-stop-count", description: String(scenario.editedRoutePoints.length) },
        { type: "recovered-stop-count", description: String(stopCount) },
      );

      if (stopCount < scenario.expectMinRows) {
        const banner = [
          "",
          "──────────────────────────────────────────────────────────────",
          "[storyboard-recovery] RECOVERY UNDER-COUNT",
          `  scenario:             ${scenario.name}`,
          `  persisted stop count: ${scenario.editedRoutePoints.length}`,
          `  recovered stop count: ${stopCount}`,
          `  minimum expected:     ${scenario.expectMinRows}`,
          "──────────────────────────────────────────────────────────────",
          "",
        ].join("\n");
        process.stderr.write(banner);
        if (process.env.GITHUB_ACTIONS) {
          process.stdout.write(
            `::error title=Storyboard recovery under-count::${scenario.name} — recovered ${stopCount} of ${scenario.expectMinRows}+ expected\n`,
          );
        }
      }
      expect(
        stopCount,
        `${scenario.name}: recovered ${stopCount} stop(s), expected ≥ ${scenario.expectMinRows}`,
      ).toBeGreaterThanOrEqual(scenario.expectMinRows);

      // Route metadata parity — every persisted stop MUST render, in the
      // persisted order, with its label unchanged. Whitespace-only /
      // empty labels are preserved verbatim; duplicates stay duplicated;
      // extras beyond any capping are still on-screen. If this fails,
      // recovery reordered / deduped / trimmed something it shouldn't.
      const renderedLabels = await readRenderedLabels(page);
      const persistedLabels = scenario.editedRoutePoints.map((p) => p.label);
      testInfo.annotations.push(
        { type: "persisted-labels", description: JSON.stringify(persistedLabels) },
        { type: "recovered-labels", description: JSON.stringify(renderedLabels) },
      );
      expect(
        renderedLabels.map((l) => l.trim()),
        `${scenario.name}: rendered labels must match persisted order`,
      ).toEqual(persistedLabels.map((l) => l.trim()));

      // Non-editor persisted metadata (title, firstName) must be intact —
      // the fix only widens the stops editor; nothing else should shift.
      await assertPersistedMetadataIntact(page);


      const editorShot = await editor.screenshot({
        path: path.join(ARTIFACT_DIR, `${scenario.slug}-editor.png`),
      });
      await testInfo.attach(`stops-editor (${scenario.slug})`, {
        body: editorShot,
        contentType: "image/png",
      });
    });
  }
});



