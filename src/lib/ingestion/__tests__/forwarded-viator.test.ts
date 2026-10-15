import { describe, expect, it } from "vitest";
import { normaliseOtaRef, parseBookingEmail } from "../booking-email-parser";

describe("forwarded Viator emails", () => {
  it("normalises BR refs", () => {
    expect(normaliseOtaRef("#BR-1447627445")).toBe("1447627445");
    expect(normaliseOtaRef("BR-1447627445")).toBe("1447627445");
  });
  it("reads a forwarded Viator cancellation", () => {
    const r = parseBookingEmail({
      from: "Nidia <nidia@example.com>",
      subject: "Fwd: Booking Canceled: #BR-1447627445",
      body: "---------- Forwarded message ---------\nFrom: Viator <noreply@viator.com>\nSubject: Booking Canceled: #BR-1447627445\n\nBooking Reference: #BR-1447627445\nTravel Date: Sat, Oct 17, 2026\nLead Traveler Name: Emily Ramirez\n",
    });
    expect(r.bookings[0]?.sourceChannel).toBe("VIATOR");
    expect(r.bookings[0]?.intent).toBe("cancel");
    expect(r.bookings[0]?.externalBookingRef).toBe("1447627445");
  });
});
