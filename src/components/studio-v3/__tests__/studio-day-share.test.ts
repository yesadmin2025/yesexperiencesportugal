import { describe, expect, it } from "vitest";
import { studioDayShareUrl } from "../StudioDayWhatsApp";

describe("Studio unconfirmed WhatsApp summary", () => {
  it("shares the chosen stops and total without claiming a reservation", () => {
    const url = new URL(studioDayShareUrl({ title: "Arrábida day", stops: ["Azeitão", "Sesimbra"], date: "2026-10-26", totalEur: 506 }));
    const text = url.searchParams.get("text") ?? "";
    expect(url.hostname).toBe("wa.me");
    expect(text).toContain("· Azeitão\n· Sesimbra");
    expect(text).toContain("Total: €506");
    expect(text).toContain("not a confirmed reservation");
  });
});