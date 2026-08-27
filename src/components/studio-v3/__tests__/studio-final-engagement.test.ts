import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { editorialAtmosphereLine, editorialMapLine } from "../CreationBeat";

const checkout = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/CheckoutSummary.tsx"),
  "utf8",
);

describe("Studio final engagement polish", () => {
  it("interprets destination choice instead of parroting its raw label", () => {
    const raw = "Sintra & Cascais enters the story. The shape begins to lean.";
    const line = editorialAtmosphereLine(raw);
    expect(line).toBe("A direction settles in. The shape begins to lean.");
    expect(line).not.toContain("Sintra & Cascais");
  });

  it("lets the map carry pickup truth while prose explains its consequence", () => {
    const line = editorialMapLine("origin", null, "Nídia, the day begins in Lisbon.");
    expect(line).toBe("The first chapter is anchored. From here, the route can breathe.");
    expect(line).not.toContain("Lisbon");
  });

  it("removes the investment label echo without flattening the reaction", () => {
    const raw = "The route is no longer a template. It refines around elevated.";
    const line = editorialMapLine("pins", null, raw);
    expect(line).toBe("The route is no longer a template. Its shape is becoming yours.");
    expect(line).not.toContain("elevated");
  });

  it("gives each pace a consequence rather than repeating the enum label", () => {
    const lines = [
      editorialMapLine("pace", "slow", "Slow"),
      editorialMapLine("pace", "balanced", "Balanced"),
      editorialMapLine("pace", "full", "Full"),
      editorialMapLine("pace", "immersive", "Immersive"),
    ];
    expect(new Set(lines).size).toBe(4);
    expect(lines.join(" ")).not.toMatch(/\bSlow\b|\bBalanced\b|\bFull\b|\bImmersive\b/);
  });

  it("leaves unrelated authored reaction lines untouched", () => {
    expect(editorialAtmosphereLine("Flexible. We'll leave room for the right light.")).toBe(
      "Flexible. We'll leave room for the right light.",
    );
    expect(editorialMapLine("pins", null, "Four signals, one route beginning to connect.")).toBe(
      "Four signals, one route beginning to connect.",
    );
  });

  it("offers localized date and party edits through the existing guest-details path", () => {
    expect(checkout).toContain('data-testid="studio-v3-checkout-summary-edit-date"');
    expect(checkout).toContain('data-testid="studio-v3-checkout-summary-edit-guests"');
    expect(checkout).toContain('editLabel="Edit date"');
    expect(checkout).toContain('editLabel="Edit party details"');
    expect(checkout.match(/onEdit=\{onEditGuestDetails\}/g) ?? []).toHaveLength(2);
  });

  it("does not fabricate a stops edit path the component does not own", () => {
    expect(checkout).not.toContain("onEditStops");
    expect(checkout).not.toContain('data-testid="studio-v3-checkout-summary-edit-stops"');
  });

  it("keeps one reserve CTA and 44px localized edit targets", () => {
    expect(checkout.match(/data-testid="studio-v3-checkout-summary-reserve"/g) ?? []).toHaveLength(1);
    expect(checkout).toContain("min-h-[44px]");
  });
});
