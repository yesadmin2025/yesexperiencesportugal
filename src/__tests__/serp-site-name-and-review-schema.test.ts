/**
 * SERP appearance lock — site name, brand-critical snippets and
 * policy-compliant review structured data.
 *
 * Google forbids using review markup built from ratings/reviews collected on
 * other websites (Viator/Tripadvisor/GetYourGuide/Google). Those stay visible
 * as attributed social proof; only first-party reviews may feed schema.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { organizationLd, websiteLd, tourProductLd } from "@/lib/jsonld";
import { withFirstPartyReviews } from "@/lib/first-party-review-schema";

const read = (p: string) => readFileSync(p, "utf8");

describe("WebSite / site-name signals", () => {
  it("WebSite node carries the exact brand name, alternates and canonical url", () => {
    const ld = websiteLd() as unknown as Record<string, unknown>;
    expect(ld["@type"]).toBe("WebSite");
    expect(ld.name).toBe("YES Experiences Portugal");
    expect(ld.alternateName).toEqual(["YES Experiences", "YES Portugal"]);
    expect(ld.url).toBe("https://yesexperiencesportugal.com/");
    expect(ld.publisher).toEqual({ "@id": "https://yesexperiencesportugal.com/#organization" });
  });

  it("Organization keeps the exact brand name and brand-consistent alternates", () => {
    const ld = organizationLd() as unknown as Record<string, unknown>;
    expect(ld.name).toBe("YES Experiences Portugal");
    expect(ld.alternateName).toEqual(["YES Experiences", "YES Portugal"]);
    expect(ld.logo).toMatchObject({
      "@type": "ImageObject",
      url: "https://yesexperiencesportugal.com/icon-192.png",
      width: 192,
      height: 192,
    });
  });

  it("Organization carries no self-serving rating or review markup", () => {
    const ld = organizationLd() as unknown as Record<string, unknown>;
    expect(ld.aggregateRating).toBeUndefined();
    expect(ld.review).toBeUndefined();
    expect(ld.reviews).toBeUndefined();
  });

  it("root og:site_name uses the exact brand casing", () => {
    const root = read("src/routes/__root.tsx");
    expect(root).toContain('{ property: "og:site_name", content: "YES Experiences Portugal" }');
    expect(root).not.toContain('content: "YES experiences Portugal"');
  });

  it("only one WebSite node is emitted sitewide", () => {
    const jsonld = read("src/lib/jsonld.ts");
    expect(jsonld.match(/"@type": "WebSite"/g)?.length ?? 0).toBe(1);
  });

  it("header and footer brand links use the exact brand string", () => {
    for (const p of ["src/components/Navbar.tsx", "src/components/Footer.tsx"]) {
      expect(read(p)).toContain('aria-label="YES Experiences Portugal — Home"');
    }
    expect(read("src/components/Logo.tsx")).toContain('alt = "YES Experiences Portugal"');
  });
});

describe("brand-critical SERP snippets", () => {
  it("homepage title and description are locked", () => {
    const home = read("src/routes/index.tsx");
    expect(home).toContain(
      '"Private Tours in Portugal & Tailor-Made Journeys | YES"',
    );
    expect(home).toContain(
      "Private tours, custom day experiences and tailor-made journeys across Portugal. Reserve a Signature day, design your own, or plan a full trip with a local expert.",
    );
  });

  it("contact title and description are locked", () => {
    const contact = read("src/routes/contact.tsx");
    expect(contact).toContain("Contact YES Experiences Portugal | Tours & Travel Design");
    expect(contact).toContain(
      "Contact YES Experiences Portugal for private tours, tailor-made journeys, proposals and corporate experiences. WhatsApp, email or a short call.",
    );
  });

  it("homepage and wine results describe their real preview photography", () => {
    const home = read("src/routes/index.tsx");
    const tour = read("src/routes/tours.$tourId.tsx");
    const guide = read("src/routes/local-stories.$slug.tsx");
    const hub = read("src/routes/lisbon-wine-tours.tsx");
    for (const source of [home, tour, guide]) {
      expect(source).toContain("og:image:alt");
      expect(source).toContain("twitter:image:alt");
    }
    expect(hub).toContain("arrabidaWineImage");
  });

  it("wine guide title/description are locked and never describe YES as small-group", async () => {
    const { LOCAL_STORIES_ARTICLES } = await import("@/content/local-stories-articles");
    const article = (
      LOCAL_STORIES_ARTICLES as Array<{
        slug: string;
        title: string;
        metaDescription: string;
        standfirst: string;
      }>
    ).find((a) => a.slug === "best-wine-tours-from-lisbon");
    expect(article).toBeTruthy();
    expect(article!.title).toBe("Best Wine Tours from Lisbon — Private Day Trips 2026");
    expect(article!.metaDescription).toBe(
      "Compare private wine tours from Lisbon to Arrábida, Azeitão and Alentejo, with hotel pickup, tastings and local lunch. Private from start to finish.",
    );
    for (const text of [article!.title, article!.metaDescription, article!.standfirst]) {
      expect(text.toLowerCase()).not.toMatch(/small[- ]group/);
    }
  });
});

describe("review structured data is first-party only", () => {
  it("the external-platform schema helper is retired", () => {
    expect(existsSync("src/lib/aggregate-review-schema.ts")).toBe(false);
    const route = read("src/routes/tours.$tourId.tsx");
    expect(route).not.toContain("withAggregateAndReviews");
    expect(route).toContain("withFirstPartyReviews");
  });

  it("tourProductLd emits no aggregateRating of its own", () => {
    const ld = tourProductLd({
      id: "arrabida-wine-allinclusive",
      title: "Arrábida Wine",
      blurb: "A private wine day.",
      img: "/img.jpg",
      priceFrom: 100,
    }) as unknown as Record<string, unknown>;
    expect(ld.aggregateRating).toBeUndefined();
    expect(ld.review).toBeUndefined();
  });

  it("tour offers are experience-truthful: named Brand, no shipping, real cancellation policy", () => {
    const ld = tourProductLd({
      id: "arrabida-wine-allinclusive",
      title: "Arrábida Wine",
      blurb: "A private wine day.",
      img: "/img.jpg",
      priceFrom: 100,
    }) as unknown as Record<string, unknown>;
    expect(ld.brand).toEqual({ "@type": "Brand", name: "YES Experiences Portugal" });
    const offers = ld.offers as Record<string, unknown>;
    expect(offers.doesNotShip).toBe(true);
    expect(offers).not.toHaveProperty("shippingDetails");
    expect(offers.hasMerchantReturnPolicy).toMatchObject({
      "@type": "MerchantReturnPolicy",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 1,
      returnFees: "https://schema.org/FreeReturn",
      refundType: "https://schema.org/FullRefund",
    });
  });

  it("no Viator meta rating/reviewCount is passed into tour Product schema", () => {
    const route = read("src/routes/tours.$tourId.tsx");
    expect(route).not.toMatch(/rating:\s*getViatorMeta/);
    expect(route).not.toMatch(/reviewCount:\s*getViatorMeta/);
  });

  it("omits rating and review when no first-party data exists", () => {
    const base = { "@id": "https://yesexperiencesportugal.com/tours/x#product" };
    expect(withFirstPartyReviews(base, null)).toEqual(base);
    expect(
      withFirstPartyReviews(base, { count: 0, average: null, reviews: [] }),
    ).toEqual(base);
  });

  it("emits first-party aggregateRating and Review nodes when data exists", () => {
    const out = withFirstPartyReviews(
      { "@id": "https://yesexperiencesportugal.com/tours/x#product" },
      {
        count: 2,
        average: 5,
        reviews: [
          {
            rating: 5,
            title: "Perfect day",
            body: "Exactly the day we hoped for.",
            reviewer_name: "Anna",
            published_at: "2026-05-04T10:00:00Z",
          },
        ],
      },
    ) as Record<string, unknown>;
    expect(out.aggregateRating).toMatchObject({ ratingValue: 5, reviewCount: 2 });
    const reviews = out.review as Array<Record<string, unknown>>;
    expect(reviews).toHaveLength(1);
    expect(reviews[0]!.publisher).toEqual({
      "@id": "https://yesexperiencesportugal.com/#organization",
    });
    expect(reviews[0]!.datePublished).toBe("2026-05-04");
  });

  it("first-party rows used in schema are rendered in the visible review list", () => {
    const tr = read("src/components/TourReviews.tsx");
    expect(tr).toContain("initialFirstParty");
    expect(tr).toContain("...ssrFirstParty");
    const route = read("src/routes/tours.$tourId.tsx");
    expect(route).toContain("initialFirstParty={firstPartyReviews}");
  });

  it("the first-party bundle query filters to published first-party rows", () => {
    const fns = read("src/lib/reviews.functions.ts");
    expect(fns).toContain("getFirstPartyReviewBundle");
    expect(fns).toContain('.eq("is_first_party", true)');
  });
});
