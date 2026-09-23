/**
 * Internal "New booking" notification reader: structured body, subject
 * fallback, duplicate copies, and messages that must never be treated as a
 * booking.
 */
import { describe, expect, it } from "vitest";
import {
  dedupeInternalNotifications,
  internalNotificationQuery,
  isInternalBookingNotification,
  parseInternalNotification,
  parseInternalSubject,
} from "@/lib/ingestion/internal-notification-parser";

const SUBJECT =
  "New booking · YES Signature — Arrábida Private Wine Tour from Lisbon — All-Inclusive · 2026-09-25";

const BODY = `New booking confirmed
Stripe payment confirmed
Booking reference
cs_live_a1b2c3d4e5f6g7
Guest
Sofia Martins
Email
sofia@example.net
Experience
Arrábida Private Wine Tour from Lisbon
Type
signature
Booking date
2026-09-25
Guests
2
Total paid
€ 498,00
Pickup
Hotel Bairro Alto, Lisbon
Start time
09:00
Phone
+351 911 889 000
Language
English
Included
• Private driver-guide
• Hotel pickup & drop-off
Add-ons
• Private photographer
Customer notes
• Dietary: one vegetarian
`;

describe("internal booking notification parser", () => {
  it("reads the structured body of our own notification", () => {
    const block = parseInternalNotification({
      from: "YES <noreply@notify.yesexperiences.pt>",
      subject: SUBJECT,
      body: BODY,
    })!;
    expect(block).toBeTruthy();
    expect(block.customerEmail).toBe("sofia@example.net");
    expect(block.tourTitle).toBe("Arrábida Private Wine Tour from Lisbon");
    expect(block.date).toBe("2026-09-25");
    expect(block.startTime).toBe("09:00");
    expect(block.pickup).toContain("Bairro Alto");
    expect(block.pax).toBe(2);
    expect(block.amountCents).toBe(49800);
    expect(block.customerPhone).toContain("911 889 000");
    expect(block.language).toBe("English");
    expect(block.extras).toContain("Private photographer");
    expect(block.stripeRefs).toContain("cs_live_a1b2c3d4e5f6g7");
    expect(block.bookingType).toBe("signature");
  });

  it("falls back to the subject for tour title and date", () => {
    const block = parseInternalNotification({
      from: "onboarding@resend.dev",
      subject:
        "New booking · YES Tailored — Fátima, Nazaré & Óbidos Private Tour from Lisbon · 2026-10-02",
      body: `New booking confirmed
Email
guest@example.net
Total paid
€ 690,00
`,
    })!;
    expect(block.tourTitle).toBe("Fátima, Nazaré & Óbidos Private Tour from Lisbon");
    expect(block.date).toBe("2026-10-02");
    expect(block.bookingType).toBe("tailored");
  });

  it("returns null when no guest address is stated (never guesses the owner)", () => {
    expect(
      parseInternalNotification({
        from: "noreply@notify.yesexperiences.pt",
        subject: "New booking · a YES experience",
        body: "New booking confirmed\nTotal paid\n€ 100,00\n",
      }),
    ).toBeNull();
  });

  it("rejects refunds, cancellations and unrelated mail", () => {
    expect(isInternalBookingNotification("noreply@notify.yesexperiences.pt", "Refund issued · booking", BODY)).toBe(false);
    expect(isInternalBookingNotification("someone@random.com", "Your receipt from YES", "thanks")).toBe(false);
  });

  it("treats repeated copies sent to both addresses as one piece of evidence", () => {
    const first = parseInternalNotification({ from: "noreply@notify.yesexperiences.pt", subject: SUBJECT, body: BODY })!;
    const copy = parseInternalNotification({ from: "onboarding@resend.dev", subject: SUBJECT, body: BODY })!;
    const { unique, ignoredCopies } = dedupeInternalNotifications([{ block: first }, { block: copy }]);
    expect(unique).toHaveLength(1);
    expect(ignoredCopies).toBe(1);
  });

  it("parses the generic subject without inventing a tour title", () => {
    expect(parseInternalSubject("New booking · a YES experience")).toEqual({
      tourTitle: null,
      date: null,
      bookingType: null,
    });
  });

  it("builds a Gmail query limited to our own senders", () => {
    const query = internalNotificationQuery(30);
    expect(query).toContain("newer_than:30d");
    expect(query).toContain('subject:"New booking"');
    expect(query).toContain("notify.yesexperiences.pt");
  });
});
