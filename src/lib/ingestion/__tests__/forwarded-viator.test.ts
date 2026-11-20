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

describe("forwarded Viator new booking", () => {
  it("reads tour, pickup, time and net rate so it skips review", () => {
    const r = parseBookingEmail({
      from: "Nidia <nidia@example.com>",
      subject: "Fwd: New Booking for Fri, Nov 20, 2026 (#BR-1465868721)",
      body: "---------- Mensagem encaminhada ---------\nFrom: Viator <booking@t1.viator.com>\nAssunto: New Booking for Fri, Nov 20, 2026 (#BR-1465868721)\n\nBooking Reference: BR-1465868721\nTour Name: Private Evora Wine Tour\nTravel Date: Fri, Nov 20, 2026\nLead Traveler Name: Jane Doe\nTravelers: 2 Adults\nProduct Code: 349639P6\nTour Grade: Private Wine Tour 09:30\nTour Language: English - Guide\nNet Rate: EUR €352,26\nHotel Pickup: Hotel Avenida, Lisbon\nEmail:\ns-1@expmessaging.tripadvisor.com\n",
    });
    const b = r.bookings[0]!;
    expect(b.tourTitle).toBe("Private Evora Wine Tour");
    expect(b.pickup).toBe("Hotel Avenida, Lisbon");
    expect(b.startTime).toBe("09:30");
    expect(b.amountPaid).toBe(35226);
    expect(b.reviewRequired).toBe(false);
  });
});
