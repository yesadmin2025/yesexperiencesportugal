/**
 * /faq page content — grouped questions.
 *
 * Truth rules: nothing here invents a tour, price, inclusion or policy.
 * Cancellation wording comes from CANCELLATION (business-nap single source
 * of truth). Booking / path answers mirror src/content/faq-data.ts so the
 * homepage FAQ and the FAQ page never contradict each other.
 */
import { CANCELLATION, EMAIL, PHONE_DISPLAY } from "@/config/business-nap";

export type FaqQa = { q: string; a: string };
export type FaqGroup = { id: string; title: string; intro: string; items: FaqQa[] };

export const FAQ_PAGE_GROUPS: FaqGroup[] = [
  {
    id: "trips",
    title: "Our trips",
    intro: "How a YES day is built, who hosts it and what it feels like.",
    items: [
      {
        q: "What is the difference between Signature, Studio and Travel Designer?",
        a: "Signature is a private day already designed by YES. Studio designs a private day in real time around your mood, group and rhythm. Travel Designer is a full Portugal journey, designed around you and delivered as a travel file.",
      },
      {
        q: "Are your experiences really private?",
        a: "Yes. Every YES experience is fully private — your group only, your own local host, and a vehicle dedicated to your day. We never merge parties and we never sell seats.",
      },
      {
        q: "Where do you pick us up?",
        a: "It depends on the experience. Each Signature page lists its included pickup areas, and that page is the reference for your day. If you are staying elsewhere in Portugal, tell us where you will be and we confirm what is possible. The pickup point and time are confirmed before your experience.",
      },
      {
        q: "Can I customize a Signature day?",
        a: "Yes. Many Signature days can be tailored — pace, timing and selected additions — within the same route. For a multi-day journey across regions, a Travel Designer is the right path.",
      },
      {
        q: "Can a Travel Designer plan a multi-day Portugal itinerary?",
        a: "Yes. A local Travel Designer composes full Portugal journeys, from a few days to a full trip across the country, shaped around your time, rhythm and interests — delivered as a curated travel file.",
      },
      {
        q: "How many days do I need in Portugal?",
        a: "There is no fixed length. A week can focus on one or two regions; a longer journey can move through more of Portugal without rushing. Our Travel Designer shapes the route, starting point and length around your plans, whether you have a few days or several weeks.",
      },
      {
        q: "Do you plan proposals and corporate days?",
        a: "Yes. Proposals are one of our specialities — cliff-top viewpoints, quiet vineyards, a candle-lit table at sunset, arranged discreetly. Companies and larger private groups plan through our Corporate & private groups service, with invoicing.",
      },
    ],
  },
  {
    id: "pricing",
    title: "Pricing",
    intro: "What a day costs, what is included and how the price is shown.",
    items: [
      {
        q: "How is the price calculated?",
        a: "Signature days are priced per person by group size; the total for your party is shown before you pay. Studio days price in real time as you shape the day, so you always see the total before confirming.",
      },
      {
        q: "What is included in the price?",
        a: "Each experience page lists exactly what is included and what is not. Some Signatures are all-inclusive; others intentionally leave lunch and personal extras outside the price. Anything optional is shown separately, never added silently.",
      },
      {
        q: "Do children pay the same as adults?",
        a: "On Signature days you enter the ages when booking and the price for your party is shown before you pay. Children are welcome on most days; some routes suit them better than others and we will say so honestly.",
      },
      {
        q: "How do we pay?",
        a: "Online, by card, through our secure checkout. Nothing is charged when you send an enquiry — payment only happens once you have the confirmed day in front of you.",
      },
    ],
  },
  {
    id: "cancellations",
    title: "Cancellations & changes",
    intro: "Plans change. Here is exactly where you stand.",
    items: [
      {
        q: "Can I cancel a Signature day?",
        a: CANCELLATION.signature.en,
      },
      {
        q: "What about Studio, Travel Designer and corporate bookings?",
        a: CANCELLATION.custom.en,
      },
      {
        q: "What happens if the weather turns?",
        a: "When reasonably possible, your host adapts the day — a different viewpoint, an indoor stop or a later start. Safety, sea and weather conditions or supplier closures can still affect some stops, and the cancellation terms of your booking apply.",
      },
      {
        q: "Can we change the date after booking?",
        a: `Write to ${EMAIL} or message us on ${PHONE_DISPLAY} as early as you can. Where the date is still open we move your day rather than cancel it.`,
      },
    ],
  },
  {
    id: "booking",
    title: "Booking",
    intro: "Two ways to book: instantly, or through a conversation.",
    items: [
      {
        q: "How do I book?",
        a: "Two ways. Reserve a Signature day instantly on its page, or send a booking request with your date, party and preferences and a local designer replies personally.",
      },
      {
        q: "Can I book a private tour in Portugal online with instant confirmation?",
        a: "Yes. Signature days and days you design in Studio are reserved online with secure payment and confirmed instantly. The cancellation terms that apply are shown before you pay.",
      },
      {
        q: "How far in advance should I book?",
        a: "Studio days need at least 3 days' notice, and the Signature booking calendar shows the earliest available date for each experience. For multi-day Travel Designer journeys, two to four weeks gives us room to design properly; peak season fills earlier.",
      },
      {
        q: "What happens after I send a request?",
        a: "Instant reservations are confirmed right away. For requests, a local replies personally within 24 hours, shares a clear proposal, and only then asks for confirmation — no pressure.",
      },
      {
        q: "Do I speak directly with a local designer?",
        a: "Yes. A local from our team follows up personally on every reservation and request.",
      },
    ],
  },
];

export const FAQ_PAGE_ITEMS: FaqQa[] = FAQ_PAGE_GROUPS.flatMap((g) => g.items);
