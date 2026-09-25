import { describe, it, expect, beforeEach } from "vitest";
import {
  readSignatureSelection,
  writeSignatureSelection,
  clearSignatureSelection,
} from "@/lib/booking/signature-selection-storage";

describe("Signature selection memory", () => {
  beforeEach(() => sessionStorage.clear());
  const future = new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10);

  it("restores date + party for the same tour only", () => {
    writeSignatureSelection("sintra-cascais", { date: future, adults: 3, minorAges: [8] });
    expect(readSignatureSelection("sintra-cascais")).toEqual({ date: future, adults: 3, minorAges: [8] });
    expect(readSignatureSelection("arrabida-wine-allinclusive")).toBeNull();
  });

  it("drops a past date but keeps the party", () => {
    writeSignatureSelection("t", { date: "2020-01-01", adults: 2, minorAges: [] });
    expect(readSignatureSelection("t")?.date).toBe("");
  });

  it("rejects invalid data and clears after booking", () => {
    sessionStorage.setItem("yes.signatureSelection.v1:t", JSON.stringify({ date: future, adults: 0, minorAges: [], savedAt: Date.now() }));
    expect(readSignatureSelection("t")).toBeNull();
    writeSignatureSelection("t", { date: future, adults: 2, minorAges: [] });
    clearSignatureSelection();
    expect(readSignatureSelection("t")).toBeNull();
  });
});
