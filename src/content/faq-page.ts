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
        a: "From your hotel or address in Lisbon and the surrounding area, including Cascais, Sintra, Sesimbra and Setúbal. The pickup point and time are confirmed with you before the day.",
      },
      {
        q: "Can I customise a Signature day?",
        a: "Yes. Every Signature day can be adjusted — pace, stops, lunch, timing — within the same route. For deeper changes across regions, a Travel Designer is the right path.",
      },
      {
        q: "Can a Travel Designer plan a multi-day Portugal itinerary?",
        a: "Yes. A local Travel Designer composes full Portugal journeys, from a few days to a full trip across the country, shaped around your time, rhythm and interests — delivered as a curated travel file.",
      },
      {
        q: "Do you plan proposals and corporate days?",
        a: "Yes. Proposals are one of our specialities — cliff-top viewpoints, quiet vineyards, a candle-lit table at sunset, arranged discreetly. For companies we handle corporate days, client hospitality and incentives end to end, with invoice and DMC support.",
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
        a: "Signature days are priced per person, with the guide price shown on each experience page before you pay. Studio days price in real time as you shape the day, so you always see the total before confirming.",
      },
      {
        q: "What is included in the price?",
        a: "Each experience page lists exactly what its price covers — typically the private vehicle, your local host and the arranged stops. Anything optional is shown separately, never added silently.",
      },
      {
        q: "Do children pay the same as adults?",
        a: "Tell us the ages when you request the day and we confirm the exact price for your party. Children are welcome on most days; some routes suit them better than others and we will say so honestly.",
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
        a: "We adapt the day rather than cancel it. Your host knows the alternatives — an indoor cellar, a different viewpoint, a later start — and the rhythm of the day is kept intact.",
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
        q: "How far in advance should I book?",
        a: "Signature and Studio days are usually available within a few days' notice. For Travel Designer journeys, two to four weeks gives us room to design properly; peak season fills earlier.",
      },
      {
        q: "What happens after I send a request?",
        a: "A local replies personally, usually within the hour and always within 24 hours. We confirm the details, share a clear proposal, and only then ask for confirmation — no pressure, no automated funnels.",
      },
      {
        q: "Do I speak directly with a local designer?",
        a: "Always. A local from our team takes your request personally — never a call centre, never a chatbot.",
      },
    ],
  },
];

export const FAQ_PAGE_ITEMS: FaqQa[] = FAQ_PAGE_GROUPS.flatMap((g) => g.items);
