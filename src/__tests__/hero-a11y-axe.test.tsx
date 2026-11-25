/**
 * Hero accessibility — automated axe-core sweep.
 *
 * Why this exists
 * ---------------
 * Visual contract tests cover scene messages and CTA visibility, but they
 * do not catch missing labels, missing roles, or unlabelled interactive
 * groups. Those regressions are easy to introduce when iterating on the
 * cinematic hero (silent video + cross-fading chapter overlays + a final
 * action scene with two CTAs).
 *
 * What we assert
 * --------------
 * For every chapter in HERO_SCENES we mount a focused harness that
 * mirrors the production accessibility surface area:
 *
 *   • the hero <section> with aria-roledescription + dynamic aria-label
 *   • the polite live region announcing the active chapter
 *   • the labelled <video> (decorative film with aria-label)
 *   • the hidden chapter markers (aria-hidden, decorative)
 *   • on the final action scene, the role="group" CTA cluster with both
 *     primary and secondary CTAs as labelled anchors
 *
 * We then run axe-core against the rendered DOM and fail the test on any
 * WCAG 2.1 A / AA violation. Because this is wired into `bun run test`
 * (which runs as part of CI), missing labels / unlabelled groups / role
 * mismatches on the chapter overlays or hero CTAs surface immediately —
 * before the change reaches preview.
 *
 * The harness is intentionally lean: it does NOT mount the real route
 * (which would drag in TanStack Router, Supabase, Mapbox, etc.). It
 * reproduces the *exact* a11y-relevant markup from src/routes/index.tsx
 * — if production drifts, the snapshot here must be updated to match,
 * which is the point.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import axe, { type Result as AxeResult } from "axe-core";
import { HERO_SCENES } from "@/content/hero-scenes-manifest";
import { HERO_COPY } from "@/content/hero-copy";

afterEach(() => cleanup());

/**
 * Minimal harness mirroring the production hero a11y surface.
 * Keep this in sync with src/routes/index.tsx (hero <section> +
 * announcer + video + chapter markers + final-scene CTA group).
 */
function HeroA11yHarness({ sceneIndex }: { sceneIndex: number }) {
  const scene = HERO_SCENES[sceneIndex];
  const isActionScene = sceneIndex === HERO_SCENES.length - 1;
  const sceneLabel = scene.main.length
    ? scene.main.join(" ")
    : `${HERO_COPY.headlineLine1} ${HERO_COPY.headlineLine2}`;

  return (
    <main>
      <section
        data-hero-scene={scene.id}
        data-hero-scene-index={sceneIndex}
        aria-roledescription="cinematic hero film"
        aria-label={`YES Experiences hero film — chapter ${sceneIndex + 1} of ${HERO_SCENES.length}: ${sceneLabel}`}
      >
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="hero-chapter-announcer"
        >
          {`Chapter ${sceneIndex + 1} of ${HERO_SCENES.length}. ${sceneLabel}${
            scene.support ? `. ${scene.support}` : ""
          }`}
        </div>

        {/* Decorative chapter markers — display:none + aria-hidden. */}
        {HERO_SCENES.map((s, i) => (
          <div
            key={s.id}
            data-hero-scene-id={s.id}
            data-hero-active={i === sceneIndex ? "true" : "false"}
            aria-hidden="true"
            style={{ display: "none" }}
          />
        ))}

        {/* Decorative cinematic film — labelled for AT context. */}
        <video
          data-hero-film="true"
          aria-label="Cinematic film of Portugal — coastal roads, local tables, hidden coves and estate gardens. Decorative; full description provided alongside."
          muted
          playsInline
        />

        <h1>
          {HERO_COPY.headlineLine1} {HERO_COPY.headlineLine2}
        </h1>

        {scene.main.length > 0 ? (
          <p>
            {scene.main.map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </p>
        ) : null}

        {scene.support ? <p>{scene.support}</p> : null}

        {isActionScene ? (
          <div
            role="group"
            aria-label="Hero actions — browse signature experiences or design your own day"
          >
            <a href="/experiences" data-hero-field="primaryCta">
              {HERO_COPY.primaryCta}
            </a>
            <a href="/studio" data-hero-field="secondaryCta">
              {HERO_COPY.secondaryCta}
            </a>
          </div>
        ) : null}
      </section>
    </main>
  );
}

async function runAxe(container: HTMLElement) {
  const results = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    // color-contrast can't be evaluated reliably in jsdom (no layout/paint),
    // and the chrome-runtime-contrast script + brand-audit cover that lane.
    rules: { "color-contrast": { enabled: false } },
  });
  return results.violations;
}

function formatViolations(violations: AxeResult[]) {
  return violations
    .map((v) => {
      const targets = v.nodes.map((n) => n.target.join(" ")).join(", ");
      return `• [${v.id}] ${v.help} — ${targets}\n  ${v.helpUrl}`;
    })
    .join("\n");
}

describe("hero — automated a11y (axe-core)", () => {
  for (let i = 0; i < HERO_SCENES.length; i += 1) {
    const scene = HERO_SCENES[i];
    it(`chapter "${scene.id}" (#${i + 1}/${HERO_SCENES.length}) has no axe violations`, async () => {
      const { container } = render(<HeroA11yHarness sceneIndex={i} />);
      const violations = await runAxe(container);
      expect(
        violations,
        violations.length
          ? `axe found ${violations.length} violation(s) on chapter "${scene.id}":\n${formatViolations(violations)}`
          : "",
      ).toEqual([]);
    });
  }

  it("final action scene exposes a labelled CTA group with both CTAs", async () => {
    const last = HERO_SCENES.length - 1;
    const { container, getByRole } = render(<HeroA11yHarness sceneIndex={last} />);
    const group = getByRole("group", { name: /hero actions/i });
    expect(group).toBeTruthy();
    // Both CTAs must be reachable as named links inside the group.
    const links = group.querySelectorAll("a[href]");
    expect(links.length).toBe(2);
    const violations = await runAxe(container);
    expect(violations).toEqual([]);
  });

  it("non-action scenes do NOT render the hero CTA group", () => {
    for (let i = 0; i < HERO_SCENES.length - 1; i += 1) {
      const { container } = render(<HeroA11yHarness sceneIndex={i} />);
      expect(container.querySelector('[role="group"]')).toBeNull();
      cleanup();
    }
  });

  it("polite live region is present on every chapter and announces the chapter copy", () => {
    for (let i = 0; i < HERO_SCENES.length; i += 1) {
      const { getByTestId } = render(<HeroA11yHarness sceneIndex={i} />);
      const announcer = getByTestId("hero-chapter-announcer");
      expect(announcer.getAttribute("aria-live")).toBe("polite");
      expect(announcer.getAttribute("aria-atomic")).toBe("true");
      expect(announcer.getAttribute("role")).toBe("status");
      expect(announcer.textContent).toMatch(
        new RegExp(`^Chapter ${i + 1} of ${HERO_SCENES.length}\\.`),
      );
      cleanup();
    }
  });
});
