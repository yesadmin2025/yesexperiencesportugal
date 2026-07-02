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
    a: "Yes. Every Signature day can be adjusted — pace, stops, lunch, timing — within the same route. For deeper changes across regions, a Travel Designer is the right path.",
  },
  {
    q: "Do I speak directly with a local designer?",
    a: "Always. A local from our team takes your request personally — never a call centre, never a chatbot. For Travel Designer journeys, the conversation begins before anything is confirmed.",
  },
  {
    q: "How far in advance should I book?",
    a: "Signature and Studio days are usually available within a few days' notice. For Travel Designer journeys, two to four weeks gives us room to design properly; peak season fills earlier.",
  },
  {
    q: "What happens after I submit a request?",
    a: "A local replies personally, usually within the hour. We confirm the details, share a clear proposal, and only then ask for confirmation — no pressure, no automated funnels.",
  },
  {
    q: "Do you offer private tours from Lisbon?",
    a: "Yes. Every YES experience is fully private — your group only, your own local host, and a car dedicated to your day. We depart from Lisbon (hotel or address pickup) across Sintra, Arrábida, Comporta, Évora, Alentejo and beyond.",
  },
  {
    q: "Can I book a private wine tour from Lisbon?",
    a: "Yes. Our most-loved wine days visit family wineries in Arrábida, Azeitão and the Alentejo — private tastings, long lunches with a view, and no marketplace groups. Reserve as a Signature day or design your own in the Studio.",
  },
  {
    q: "Can you plan a proposal in Portugal?",
    a: "Yes. Proposals are one of our specialities — cliff-top viewpoints, private beaches, quiet vineyards, or a candle-lit table at sunset. Location, timing, photography and every detail arranged discreetly.",
  },
  {
    q: "Do you create corporate experiences in Portugal?",
    a: "Yes. Corporate days, client hospitality, incentives and private groups of any size — transport, venues, suppliers and timing handled end to end, with invoice and DMC support.",
  },
  {
    q: "Can a Travel Designer plan a multi-day Portugal itinerary?",
    a: "Yes. A local Travel Designer composes full multi-day journeys — honeymoons, family journeys, celebrations, coast-to-Alentejo routes and beyond — delivered as a curated travel file, written around you.",
  },
];
