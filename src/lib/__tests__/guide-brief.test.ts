import { describe, expect, it } from "vitest";
import {
  buildGuideBrief,
  guideBriefText,
  guideDayText,
  whatsappLink,
  type GuideBriefRow,
} from "@/lib/guide-brief";

const row: GuideBriefRow = {
  id: "11111111-1111-1111-1111-111111111111",
  source_tour_id: "arrabida-wine-allinclusive",
  customer_name: "Jane Doe",
  customer_email: "jane@example.com",
  customer_phone: "+1 555 0100",
  guests: 4,
  preferred_date: "2026-10-04",
  notes: "Vegetarian lunch",
  status: "paid",
  stripe_session_id: "cs_live_abc",
  booking_details: {
    startTime: "09:30",
    pickupAddress: "Hotel Avenida Palace, Lisbon",
    language: "English",
    snapshot: {
      experienceName: "Arrábida Wine, all inclusive",
      durationMinutes: 540,
      composition: { guests: 4, adults: 2, minorAges: [7, 11] },
      itinerary: [
        { order: 1, label: "Livramento Market", note: "Coffee and pastries" },
        { order: 2, label: "Sesimbra boat tour" },
      ],
      pricing: { totalEur: 980, perPaxEur: 245 },
      addOns: [{ label: "Private boat", priceEur: 120 }],
    },
  },
};

describe("guide brief", () => {
  it("carries the operational facts the guide needs", () => {
    const brief = buildGuideBrief(row);
    expect(brief.experience).toBe("Arrábida Wine, all inclusive");
    expect(brief.date).toBe("2026-10-04");
    expect(brief.startTime).toBe("09:30");
    expect(brief.duration).toBe("9h");
    expect(brief.party).toContain("4 travellers");
    expect(brief.party).toContain("children aged 7, 11");
    expect(brief.pickup).toContain("Avenida Palace");
    expect(brief.guestPhone).toBe("+1 555 0100");
    expect(brief.stops).toHaveLength(2);
    expect(brief.requests).toContain("Vegetarian lunch");
  });

  it("never exposes money", () => {
    const text = guideBriefText(buildGuideBrief(row));
    expect(text).not.toMatch(/€|EUR|980|245|120|price|total/i);
  });

  it("marks unknown operational facts as to confirm instead of inventing them", () => {
    const bare = buildGuideBrief({
      ...row,
      customer_phone: null,
      preferred_date: null,
      notes: null,
      booking_details: null,
    });
    expect(bare.startTime).toBe("to confirm");
    expect(bare.pickup).toBe("to confirm");
    expect(bare.date).toBe("to confirm");
    expect(bare.stops).toEqual([]);
  });

  it("groups a whole day into one message", () => {
    const brief = buildGuideBrief(row);
    const text = guideDayText("2026-10-04", [brief, brief]);
    expect(text).toContain("2 trips");
    expect(text).not.toMatch(/€/);
  });

  it("encodes the WhatsApp link with digits only", () => {
    const link = whatsappLink("+351 900 000 000", "Pickup: Hotel & spa");
    expect(link.startsWith("https://wa.me/351900000000?text=")).toBe(true);
    expect(link).toContain("%26");
  });
});
