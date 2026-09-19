import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/components/SimpleBookingForm.tsx"), "utf8");

describe("Signature booking date field", () => {
  it("keeps partially typed dates instead of resetting the controlled input", () => {
    const onChange = source.slice(source.indexOf("aria-label=\"Date of your experience\""));
    const setDateIdx = onChange.indexOf("setDate(v);");
    const validateIdx = onChange.indexOf("validateDateISO(v, rule)");
    expect(setDateIdx).toBeGreaterThan(-1);
    expect(validateIdx).toBeGreaterThan(-1);
    // setDate must run BEFORE validation can early-return.
    expect(setDateIdx).toBeLessThan(validateIdx);
  });

  it("only warns once the typed date is complete", () => {
    // The warning is both inline (setBlockMessage) and a toast, but only
    // after the typed value is a full YYYY-MM-DD.
    expect(source).toContain("if (v.length === 10) {");
    const gate = source.slice(source.indexOf("if (v.length === 10) {"));
    expect(gate.slice(0, 160)).toContain("setBlockMessage(msg)");
    expect(gate.slice(0, 160)).toContain("toast.error(msg)");
  });
});
