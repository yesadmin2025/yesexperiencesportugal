import { describe, expect, it } from "vitest";
import { parseBookingEmail, dedupeKeysFor } from "@/lib/ingestion/booking-email-parser";

const BOKUN_NEW = {
  from: "Bókun Notifications <no-reply@bokun.io>",
  subject: "New booking: Sat 24.Oct '26 @ 09:00 (YES-T147327068) Ext. booking ref: 1449975423",
  body: `Booking ref.: YES-147327068
Product booking ref.: YES-T147327068
Ext. booking ref: 1449975423
Product: Private Arrábida Wine Tour from Lisbon
Sold by: Viator.com
Booking channel: Viator.com
Customer: Anna Schmidt
Customer email: anna.schmidt@example.com
Customer phone: +49 170 1234567
Date: Sat 24.Oct '26 @ 09:00
Rate: Private group up to 4
PAX: 2 adults
Pick-up: Hotel Avenida Palace, Lisbon
Guided languages: English
Extras:
- Picnic upgrade
Notes: Wedding anniversary
Viator amount: EUR 480.00
`,
};

const BOKUN_CANCEL = {
  from: "Bókun Notifications <no-reply@bokun.io>",
  subject: "Cancelled booking: Mon 21.Sep '26 @ 10:00 (YES-T147068061) Ext. booking ref: 1449300203",
  body: `Booking ref.: YES-147068061
Product booking ref.: YES-T147068061
Ext. booking ref: 1449300203
Product: Private Sintra & Cascais Day
Sold by: GetYourGuide
Booking channel: GetYourGuide
Customer: Marc Petit
Customer email: marc@example.com
Date: Mon 21.Sep '26 @ 10:00
PAX: 4 adults
Pick-up: Hotel Tivoli, Lisbon
`,
};

const DIRECT_PAID = {
  from: "YES Experiences <hello@yesexperiencesportugal.com>",
  subject: "Booking Confirmed — Private Azeitão Cheese Workshop",
  body: `Hello Sarah,

Private Azeitão Cheese Workshop: Wine & Sesimbra Coastal Tour

Date: 12 May 2026 @ 09:00
Pick-up: Hotel Bairro Alto, Lisbon
Guests: 2 adults
Special rate: EUR 690.00
Status: Confirmed & Fully Paid
Included:
- Private guide and vehicle
- Cheese workshop
Not included:
- Lunch

Name: Sarah Connor
Email: sarah@example.com
Phone: +1 415 555 0134

Best regards,
YES Experiences
`,
};

const DIRECT_TWO_TOURS = {
  from: "YES Experiences <hello@yesexperiencesportugal.com>",
  subject: "Booking Confirmed — two private days",
  body: `Hello Tom,

Name: Tom Hardy
Email: tom@example.com

Private Arrábida Wine Day
Date: 03 Jun 2026 @ 09:00
Pick-up: Hotel Valverde, Lisbon
Guests: 2 adults
Status: CONFIRMED – FULLY PAID

Private Sintra & Cascais Day
Date: 05 Jun 2026 @ 09:30
Pick-up: Hotel Valverde, Lisbon
Guests: 2 adults
Status: CONFIRMED – FULLY PAID
`,
};

const DIRECT_PRECONFIRM = {
  from: "YES Experiences <hello@yesexperiencesportugal.com>",
  subject: "Pre-Confirmation Voucher — Private Arrábida Wine Day",
  body: `Hello Tom,

Private Arrábida Wine Day
Date: 03 Jun 2026 @ 09:00
Pick-up: Hotel Valverde, Lisbon
Guests: 2 adults
Status: Pre-Confirmation Voucher

Name: Tom Hardy
Email: tom@example.com
`,
};

const INQUIRY = {
  from: "Julia <julia@example.com>",
  subject: "Question about a private day in September",
  body: `Hi there,

I am just wondering if it is possible to do a private wine day in September for two people.
Can you tell me the price?

Thanks,
Julia
`,
};

describe("Bókun new booking parse", () => {
  it("extracts every labelled field and maps the reseller channel", () => {
    const result = parseBookingEmail(BOKUN_NEW);
    expect(result.kind).toBe("bokun");
    const booking = result.bookings[0]!;
    expect(booking.intent).toBe("create");
    expect(booking.sourceChannel).toBe("VIATOR");
    expect(booking.externalBookingRef).toBe("1449975423");
    expect(booking.productBookingRef).toBe("YES-T147327068");
    expect(booking.tourTitle).toBe("Private Arrábida Wine Tour from Lisbon");
    expect(booking.customerName).toBe("Anna Schmidt");
    expect(booking.customerEmail).toBe("anna.schmidt@example.com");
    expect(booking.customerPhone).toBe("+49 170 1234567");
    expect(booking.date).toBe("2026-10-24");
    expect(booking.startTime).toBe("09:00");
    expect(booking.pax).toBe(2);
    expect(booking.pickup).toBe("Hotel Avenida Palace, Lisbon");
    expect(booking.language).toBe("English");
    expect(booking.extras).toContain("Picnic upgrade");
    expect(booking.amountPaid).toBe(48000);
    expect(booking.currency).toBe("EUR");
    expect(booking.bookingStatus).toBe("paid");
    expect(booking.reviewRequired).toBe(false);
  });
});

describe("Bókun cancellation", () => {
  it("is a cancel intent carrying the same reference for matching", () => {
    const result = parseBookingEmail(BOKUN_CANCEL);
    const booking = result.bookings[0]!;
    expect(booking.intent).toBe("cancel");
    expect(booking.bookingStatus).toBe("cancelled");
    expect(booking.externalBookingRef).toBe("1449300203");
    expect(booking.sourceChannel).toBe("GETYOURGUIDE");
    // The cancellation shares the strongest dedupe key with the new booking,
    // so it can only ever update the existing reservation.
    expect(dedupeKeysFor(booking, "m2")[0]).toBe("ext:1449300203");
  });
});

describe("direct fully-paid confirmation", () => {
  it("parses one paid booking with inclusions and exclusions", () => {
    const result = parseBookingEmail(DIRECT_PAID);
    expect(result.kind).toBe("direct");
    expect(result.bookings).toHaveLength(1);
    const booking = result.bookings[0]!;
    expect(booking.sourceChannel).toBe("DIRECT");
    expect(booking.date).toBe("2026-05-12");
    expect(booking.startTime).toBe("09:00");
    expect(booking.pax).toBe(2);
    expect(booking.pickup).toBe("Hotel Bairro Alto, Lisbon");
    expect(booking.paymentStatus).toBe("PAID");
    expect(booking.bookingStatus).toBe("paid");
    expect(booking.amountPaid).toBe(69000);
    expect(booking.inclusions.length).toBeGreaterThan(0);
    expect(booking.exclusions).toContain("Lunch");
    expect(booking.customerEmail).toBe("sarah@example.com");
  });
});

describe("one email containing two tours", () => {
  it("yields two distinct bookings with distinct dedupe slots", () => {
    const result = parseBookingEmail(DIRECT_TWO_TOURS);
    expect(result.bookings).toHaveLength(2);
    expect(result.bookings.map((b) => b.date)).toEqual(["2026-06-03", "2026-06-05"]);
    expect(result.bookings[0]!.slot).toBe(0);
    expect(result.bookings[1]!.slot).toBe(1);
    expect(dedupeKeysFor(result.bookings[0]!, "m9")).not.toEqual(
      dedupeKeysFor(result.bookings[1]!, "m9"),
    );
  });
});

describe("pre-confirmation then fully paid", () => {
  it("stays pending first, then resolves to the same reservation key", () => {
    const pre = parseBookingEmail(DIRECT_PRECONFIRM).bookings[0]!;
    expect(pre.bookingStatus).toBe("pending");
    expect(pre.paymentStatus).toBe("PENDING_PAYMENT");

    const paid = parseBookingEmail({
      ...DIRECT_PRECONFIRM,
      subject: "Booking Confirmed — Private Arrábida Wine Day",
      body: DIRECT_PRECONFIRM.body.replace("Pre-Confirmation Voucher", "Confirmed & Fully Paid"),
    }).bookings[0]!;
    expect(paid.bookingStatus).toBe("paid");

    // Same customer, date and tour: the cautious fallback keys match, so the
    // paid voucher updates the pending booking instead of creating a second one.
    const preKeys = dedupeKeysFor(pre, "m10").filter((k) => k.startsWith("cust:"));
    const paidKeys = dedupeKeysFor(paid, "m11").filter((k) => k.startsWith("cust:"));
    expect(preKeys).toEqual(paidKeys);
    expect(preKeys.length).toBeGreaterThan(0);
  });
});

describe("enquiry email", () => {
  it("never produces a booking", () => {
    const result = parseBookingEmail(INQUIRY);
    expect(result.kind).toBe("ignored");
    expect(result.bookings).toHaveLength(0);
  });

  it("ignores marketing and refund threads too", () => {
    for (const subject of ["Our autumn newsletter", "Refund request for booking"]) {
      const result = parseBookingEmail({ from: "x@example.com", subject, body: "Please unsubscribe me." });
      expect(result.kind).toBe("ignored");
    }
  });
});
