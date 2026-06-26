/**
 * Plain-text mirror of the homepage FAQ (src/components/FAQ.tsx).
 *
 * Used to emit FAQPage JSON-LD without coupling the structured-data
 * payload to the React/JSX rendering. If you update FAQ.tsx, mirror
 * the wording here so search engines see the same Q/A.
 */
export const HOMEPAGE_FAQ: { q: string; a: string }[] = [
  {
    q: "What is the difference between Signature, Studio and Travel Designer?",
    a: "Signature is a ready-to-book private day. Studio designs a private day in real time around your mood, group and rhythm. Travel Designer is a full multi-day Portugal journey, composed by a local and delivered as a travel file.",
  },
  {
    q: "Can I customise a Signature day?",
    a: "Yes. Every Signature day can be adjusted — pace, stops, lunch, timing — within the same route. For deeper changes across regions, Bespoke is the right path.",
  },
  {
    q: "Do I speak directly with a local designer?",
    a: "Always. A local from our team takes your request personally — never a call centre, never a chatbot. For Bespoke journeys, the conversation begins before anything is confirmed.",
  },
  {
    q: "How far in advance should I book?",
    a: "Signature and Studio days are usually available within a few days' notice. For Bespoke journeys, two to four weeks gives us room to design properly; peak season fills earlier.",
  },
  {
    q: "What happens after I submit a request?",
    a: "A local replies personally, usually within the hour. We confirm the details, share a clear proposal, and only then ask for confirmation — no pressure, no automated funnels.",
  },
];
