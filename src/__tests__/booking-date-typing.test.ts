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
    expect(source).toContain("if (v.length === 10) toast.error(msg);");
  });
});
