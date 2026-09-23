import { describe, expect, it } from "vitest";
import { parseBookingEmail } from "@/lib/ingestion/booking-email-parser";
import { extractBody } from "@/lib/ingestion/gmail.server";

/**
 * Real Bókun notifications arrive as HTML: the apostrophe in "24.Oct '26" is
 * written as a numeric entity and the product sits on two lines under its
 * label. Both used to cost us the tour date and the tour name.
 */
const html = `<table>
<tr><td>Booking ref.</td><td>VIA-104657893</td></tr>
<tr><td>Product booking ref.</td><td>YES-T147327068</td></tr>
<tr><td>Ext. booking ref</td><td>1449975423</td></tr>
<tr><td>Product</td><td>349639P3 -<br>Private Lisbon Wine Tour - Setubal, Arrabida, 3 Wineries &amp; Lunch</td></tr>
<tr><td>Sold by</td><td>Viator.com</td></tr>
<tr><td>Customer</td><td>Porter, Rick</td></tr>
<tr><td>PAX</td><td>2 Adults</td></tr>
<tr><td>Pick-up</td><td>Olissippo Lapa Palace</td></tr>
<tr><td>Date</td><td>Sat 24.Oct &#x27;26<br>@ 09:00</td></tr>
</table>`;

describe("Bókun HTML notification parsing", () => {
  it("reads the tour date through a numeric HTML entity and the full product name", () => {
    const body = extractBody({
      mimeType: "text/html",
      body: { data: Buffer.from(html, "utf8").toString("base64url") },
    });

    const result = parseBookingEmail({
      subject: "New booking: Sat 24.Oct '26 @ 09:00 (YES-T147327068) Ext. booking ref: 1449975423",
      from: "Bókun Notifications <no-reply@bokun.io>",
      body,
      sentByUs: false,
    });

    expect(result.kind).toBe("bokun");
    const booking = result.bookings[0]!;
    expect(booking.date).toBe("2026-10-24");
    expect(booking.startTime).toBe("09:00");
    expect(booking.tourTitle).toBe("Private Lisbon Wine Tour - Setubal, Arrabida, 3 Wineries & Lunch");
    expect(booking.productCode).toBe("349639P3");
    expect(booking.sourceChannel).toBe("VIATOR");
    expect(booking.reviewRequired).toBe(false);
  });
});
