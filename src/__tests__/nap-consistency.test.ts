/**
 * NAP + license consistency guardrail.
 *
 * Ensures the business Name / Address / Phone / License remain unified
 * across the site and that stale claims never re-enter the codebase.
 *
 * Rules enforced:
 *  - "RNAVT" is never used anywhere (correct license authority is RNAAT).
 *  - Public prose never claims the team is based in / from Lisbon.
 *  - Public NAP literals (phone, license number, wa.me link) only
 *    appear in the single-source-of-truth config file, so drift is
 *    impossible.
 *
 * Excluded from literal-drift scans:
 *  - The config file itself (src/config/business-nap.ts) — canonical.
 *  - Internal-only inboxes / admin routes noted in the plan.
 *  - The __tests__ folder (this file references the strings).
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const CONFIG_REL = "config/business-nap.ts";
const TESTS_REL = "__tests__";

// Files intentionally allowed to keep their own literals — not public NAP.
const LITERAL_ALLOWLIST = new Set<string>([
  CONFIG_REL,
  "routes/admin.gbp-legacy-removal.tsx", // historical letter body about the legacy GBP profile
  "routes/auth.tsx", // admin login placeholder
  "lib/email/team-recipients.ts", // internal ops inbox
  "lib/email/send-internal.server.ts", // internal Resend reply_to
  "routes/api/public/hooks/stripe-webhook-health.ts", // internal alert recipient
]);

const FORBIDDEN_TOKENS: { needle: RegExp; reason: string }[] = [
  { needle: /RNAVT/g, reason: "Wrong license authority — use RNAAT." },
  {
    needle: /team from Lisbon/gi,
    reason: "The team is based in Sesimbra, not Lisbon.",
  },
  {
    needle: /based in Lisbon/gi,
    reason: "The team is based in Sesimbra, not Lisbon.",
  },
  {
    needle: /Lisbon-based team/gi,
    reason: "The team is based in Sesimbra, not Lisbon.",
  },
  {
    needle: /\bRNAAT\s+\d/g,
    reason: "License must be formatted as 'RNAAT nº 31/2023' (with 'nº').",
  },
  {
    needle: /\b(?:48\s?h|48\s?hours?|48-hour)\s+cancel/gi,
    reason: "Cancellation policy is 24h for Signature, never 48h.",
  },
];

const NAP_LITERALS: { needle: RegExp; reason: string }[] = [
  {
    needle: /911\s?889\s?992/g,
    reason: "Import PHONE_DISPLAY / PHONE_TEL / WHATSAPP_NUMBER from @/config/business-nap.",
  },
  {
    needle: /wa\.me\/351911889992/g,
    reason: "Use whatsappUrl() from @/config/business-nap.",
  },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/\.(tsx?|jsx?|mdx?|json)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const FILES = walk(ROOT).map((f) => ({
  abs: f,
  rel: path.relative(ROOT, f).replace(/\\/g, "/"),
}));

describe("NAP + license consistency", () => {
  it("never uses the forbidden RNAVT / Lisbon-team tokens", () => {
    const violations: string[] = [];
    for (const { abs, rel } of FILES) {
      if (rel.startsWith(TESTS_REL)) continue;
      const text = fs.readFileSync(abs, "utf8");
      for (const { needle, reason } of FORBIDDEN_TOKENS) {
        needle.lastIndex = 0;
        if (needle.test(text)) violations.push(`${rel}: ${reason}`);
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps public NAP literals (phone, wa.me) only in the canonical config", () => {
    const violations: string[] = [];
    for (const { abs, rel } of FILES) {
      if (rel.startsWith(TESTS_REL)) continue;
      if (LITERAL_ALLOWLIST.has(rel)) continue;
      const text = fs.readFileSync(abs, "utf8");
      for (const { needle, reason } of NAP_LITERALS) {
        needle.lastIndex = 0;
        if (needle.test(text)) violations.push(`${rel}: ${reason}`);
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("shared config exports the canonical values", async () => {
    const nap = await import("@/config/business-nap");
    expect(nap.LICENSE_LABEL).toBe("RNAAT nº 31/2023");
    expect(nap.EMAIL).toBe("info@yesexperiencesportugal.com");
    expect(nap.PHONE_DISPLAY).toBe("+351 911 889 992");
    expect(nap.WHATSAPP_NUMBER).toBe("351911889992");
    expect(nap.BASED_IN).toBe("Sesimbra, Portugal");
    expect(nap.whatsappUrl("hi")).toBe("https://wa.me/351911889992?text=hi");
    expect(nap.TRUST_LINE).toBe(
      "Licensed Portuguese tour operator · RNAAT nº 31/2023 · Based in Sesimbra, Portugal",
    );
    expect(nap.CANCELLATION_SIGNATURE).toMatch(/24h before the experience/);
    expect(nap.CANCELLATION_STUDIO).toMatch(/before checkout/);
  });
});
