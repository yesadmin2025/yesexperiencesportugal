/**
 * Tailored Signature policy — guardrails.
 *
 * A Tailored booking is a Signature with adjustments. It must NEVER
 * invent stops, options, add-ons, inclusions or prices, and it must
 * NEVER pull content from another Signature.
 *
 * Allowed adjustments live inside the resolved Signature product:
 *   - remove a stop attached to this Signature
 *   - replace a stop only with an approved alternative attached to
 *     this Signature
 *   - add an upgrade only if that upgrade exists for this Signature
 *   - adjust pace / focus within the Signature's own logic
 *   - choose language / pickup / time when the Signature supports it
 *
 * Anything outside these rails routes the guest to a different path:
 *   - "outside the Signature" → Experience Studio (`/studio-v3`)
 *   - "needs human judgement" → Travel Designer (`/bespoke`)
 *
 * This module is pure and safe to import from any layer (UI hooks,
 * server functions, edge functions). It does not fetch — callers
 * provide the resolved Signature data.
 */

export type SignatureStopRef = {
  /** Stable id used by the Signature itself. */
  id: string;
  /** Optional human-readable title used for messages. */
  title?: string;
};

export type SignatureUpgradeRef = {
  id: string;
  title?: string;
};

export type ResolvedSignature = {
  id: string;
  /** Stops that ship with this Signature, in canonical order. */
  stops: SignatureStopRef[];
  /**
   * Stops that may be swapped IN to this Signature, indexed by the
   * stop they replace. Empty / missing entries mean "no swap allowed".
   */
  alternateStops?: Record<string, SignatureStopRef[]>;
  /** Upgrades attached to this Signature only. */
  upgrades?: SignatureUpgradeRef[];
  /** Pace / focus options the Signature itself exposes. */
  pacingOptions?: string[];
  /** Languages this Signature supports. */
  languages?: string[];
};

export type TailorAdjustment =
  | { kind: "remove-stop"; stopId: string }
  | { kind: "replace-stop"; stopId: string; replacementId: string }
  | { kind: "add-upgrade"; upgradeId: string }
  | { kind: "set-pacing"; value: string }
  | { kind: "set-language"; value: string };

export type TailorEvaluation =
  | { allowed: true }
  | {
      allowed: false;
      /** Stable code so the UI can branch (toast / redirect / inline message). */
      code:
        | "stop-not-in-signature"
        | "no-swap-available"
        | "replacement-not-allowed"
        | "upgrade-not-in-signature"
        | "pacing-not-supported"
        | "language-not-supported";
      /** Where to send the guest next ("studio" / "designer" / stay). */
      route: "stay" | "studio" | "designer";
      /** Plain-English line for inline UI. */
      message: string;
    };

const NEEDS_STUDIO = "If you want something outside this Signature, design your day in the Studio.";
const NEEDS_DESIGNER =
  "If you'd like us to shape this differently, our Travel Designer can help.";

/**
 * Evaluate a single tailor adjustment against a resolved Signature.
 * Returns `allowed:true` when the adjustment is safe to apply, or a
 * structured refusal carrying a route hint for the UI.
 */
export function evaluateTailorAdjustment(
  signature: ResolvedSignature,
  adjustment: TailorAdjustment,
): TailorEvaluation {
  const stopIds = new Set(signature.stops.map((s) => s.id));

  switch (adjustment.kind) {
    case "remove-stop":
      if (!stopIds.has(adjustment.stopId)) {
        return {
          allowed: false,
          code: "stop-not-in-signature",
          route: "stay",
          message: "That stop isn't part of this Signature.",
        };
      }
      return { allowed: true };

    case "replace-stop": {
      if (!stopIds.has(adjustment.stopId)) {
        return {
          allowed: false,
          code: "stop-not-in-signature",
          route: "stay",
          message: "That stop isn't part of this Signature.",
        };
      }
      const allowed = signature.alternateStops?.[adjustment.stopId] ?? [];
      if (allowed.length === 0) {
        return {
          allowed: false,
          code: "no-swap-available",
          route: "studio",
          message: `This stop doesn't have an approved alternative. ${NEEDS_STUDIO}`,
        };
      }
      if (!allowed.some((a) => a.id === adjustment.replacementId)) {
        return {
          allowed: false,
          code: "replacement-not-allowed",
          route: "studio",
          message: `That replacement isn't approved for this Signature. ${NEEDS_STUDIO}`,
        };
      }
      return { allowed: true };
    }

    case "add-upgrade": {
      const upgrades = signature.upgrades ?? [];
      if (!upgrades.some((u) => u.id === adjustment.upgradeId)) {
        return {
          allowed: false,
          code: "upgrade-not-in-signature",
          route: "studio",
          message: `That upgrade isn't part of this Signature. ${NEEDS_STUDIO}`,
        };
      }
      return { allowed: true };
    }

    case "set-pacing": {
      const options = signature.pacingOptions ?? [];
      if (options.length > 0 && !options.includes(adjustment.value)) {
        return {
          allowed: false,
          code: "pacing-not-supported",
          route: "designer",
          message: `That pace isn't part of this Signature. ${NEEDS_DESIGNER}`,
        };
      }
      return { allowed: true };
    }

    case "set-language": {
      const langs = signature.languages ?? [];
      if (langs.length > 0 && !langs.includes(adjustment.value)) {
        return {
          allowed: false,
          code: "language-not-supported",
          route: "designer",
          message: `We don't currently run this Signature in that language. ${NEEDS_DESIGNER}`,
        };
      }
      return { allowed: true };
    }
  }
}

/**
 * Helper for the UI — given a refusal, returns the canonical path to
 * push the guest to (or `null` to stay on the Signature page).
 */
export function routeForRefusal(evaluation: TailorEvaluation): string | null {
  if (evaluation.allowed) return null;
  if (evaluation.route === "studio") return "/studio-v3";
  if (evaluation.route === "designer") return "/bespoke";
  return null;
}
