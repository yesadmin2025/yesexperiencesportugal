// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  TAILOR_HANDOFF_KEY, clearTailorHandoff, describeGuests, readTailorHandoff,
  saveTailorHandoff, tailorHandoffMessage,
} from "@/lib/tailor-handoff";

describe("Tailor → Contact handoff", () => {
  beforeEach(() => sessionStorage.clear());
  it("round-trips the composition and builds the confirmation message", () => {
    saveTailorHandoff({
      tourId: "arrabida-wine-allinclusive", title: "Your tailored Arrábida day",
      date: "2026-10-20", guests: describeGuests(2, 1),
      stops: ["Livramento Market", "José Maria da Fonseca"], removed: ["Bacalhôa"], pickup: "09:00 (to confirm)",
    });
    const h = readTailorHandoff();
    expect(h?.title).toBe("Your tailored Arrábida day");
    const msg = tailorHandoffMessage(h!);
    expect(msg).toContain("I'd like YES to confirm this tailored day:");
    expect(msg).toContain("Date: 2026-10-20");
    expect(msg).toContain("Guests: 2 adults, 1 child");
    expect(msg).toContain("My day: Livramento Market · José Maria da Fonseca");
    expect(msg).toContain("Removed / changed: Bacalhôa");
    expect(msg).not.toContain("I read your guide");
  });
  it("expires stale handoffs and clears after send", () => {
    saveTailorHandoff({ tourId: "x", title: "t", date: "", guests: "2 adults", stops: [], removed: [] }, 0);
    expect(readTailorHandoff(3 * 60 * 60 * 1000)).toBeNull();
    saveTailorHandoff({ tourId: "x", title: "t", date: "", guests: "2 adults", stops: [], removed: [] });
    clearTailorHandoff();
    expect(sessionStorage.getItem(TAILOR_HANDOFF_KEY)).toBeNull();
  });
});
