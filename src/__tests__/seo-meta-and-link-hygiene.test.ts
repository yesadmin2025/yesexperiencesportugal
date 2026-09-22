import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { LOCAL_STORIES_ARTICLES } from "@/content/local-stories-articles";
import { signatureTours } from "@/data/signatureTours";
import { LISBON_REGIONS } from "@/content/lisbon-regions";

function article(slug: string) {
  const found = LOCAL_STORIES_ARTICLES.find((a) => a.slug === slug);
  expect(found, `missing article ${slug}`).toBeTruthy();
  return found!;
}

describe("Meta description length locks (snippet quality)", () => {
  it("keeps the Arrábida wine tour description between 120 and 165 characters", () => {
    const tour = signatureTours.find((t) => t.id === "arrabida-wine-allinclusive");
    expect(tour).toBeTruthy();
    const description = tour!.seoDescription ?? "";
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(165);
  });

  it("keeps the Sesimbra guide description between 120 and 165 characters", () => {
    const description = article("what-to-do-in-sesimbra").metaDescription;
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(165);
  });
});

describe("Internal link hygiene in Local Stories", () => {
  const allLinkText = LOCAL_STORIES_ARTICLES.flatMap((a) => [
    ...a.sections.map((s) => s.body),
    ...(a.relatedReads ?? []).map((r) => r.path),
  ]).join("\n");

  it("never renders internal links carrying guide attribution parameters", () => {
    expect(allLinkText).not.toContain("?ref=guide");
    expect(allLinkText).not.toContain("ref_slot");
  });

  it("supports the Arrábida boat experience from the Sesimbra guide", () => {
    const body = article("what-to-do-in-sesimbra")
      .sections.map((s) => s.body)
      .join("\n");
    const occurrences = body.split("](/tours/arrabida-boat)").length - 1;
    expect(occurrences).toBe(1);
  });
});

describe("Wine intent split contract", () => {
  const guidePath = "/local-stories/best-wine-tours-from-lisbon";
  const commercialPath = "/lisbon-wine-tours";

  it("keeps the guide owning best-wine comparison intent without changing protected signals", () => {
    const guide = article("best-wine-tours-from-lisbon");
    expect(guide.title).toBe("Best Wine Tours from Lisbon — Private Day Trips 2026");
    expect(guide.h1).toBe("The Best Wine Tours from Lisbon");
    expect(guide.datePublished).toBe("2026-07-24");
    expect(guide.dateModified).toBe("2026-09-22");
    expect(guide.sections[0]).toMatchObject({
      heading: "The short answer: which wine tour from Lisbon is best?",
    });
    expect(guide.sections[0]?.body).toContain("we would choose Arrábida");
    expect(guide.sections.map((section) => section.heading)).toContain(
      "How we compare the best wine tours from Lisbon.",
    );
    expect(guide.faq).toHaveLength(6);
    expect(guide.sections.map((section) => section.body).join("\n")).toContain(
      `[Lisbon wine tours](${commercialPath})`,
    );
  });

  it("keeps the commercial hub and guide distinct, self-canonical, and cross-linked", () => {
    const guide = article("best-wine-tours-from-lisbon");
    const guideBody = guide.sections.map((section) => section.body).join("\n");
    const routeSource = readFileSync("src/routes/lisbon-wine-tours.tsx", "utf8");

    expect(guidePath).not.toBe(commercialPath);
    expect(guideBody).toContain(`[Lisbon wine tours](${commercialPath})`);
    expect(routeSource).toContain("best wine tours from Lisbon");
    expect(routeSource).toContain("best-wine-tours-from-lisbon");
    expect(routeSource).toContain('const PATH = "/lisbon-wine-tours"');
    expect(routeSource).toContain("links: [{ rel: \"canonical\", href: PAGE_URL }]");
  });

  it("keeps the requested wine-source pages to one contextual guide link each", () => {
    const guide = article("best-wine-tours-from-lisbon");
    expect(guide.sections.map((section) => section.body).join("\n")).toContain(
      "/tours/arrabida-wine-allinclusive",
    );

    const setubalBody = article("setubal-wine-guide")
      .sections.map((section) => section.body)
      .join("\n");
    expect(setubalBody.split(`](${guidePath})`).length - 1).toBe(1);

    const arrabidaRegion = LISBON_REGIONS.find((region) => region.path === "/private-tours-arrabida-sesimbra");
    const azeitaoRegion = LISBON_REGIONS.find((region) => region.path === "/private-tours-azeitao-setubal");
    expect(arrabidaRegion?.guideLink?.anchor).toBe("compare wine days from Lisbon");
    expect(azeitaoRegion?.guideLink?.anchor).toBe("which Lisbon wine day suits you");
  });

  it("keeps article copy clean of retired proof, small-group positioning and guaranteed-winery claims", () => {
    const guideText = [
      article("best-wine-tours-from-lisbon").standfirst,
      ...article("best-wine-tours-from-lisbon").sections.map((section) => section.body),
      ...(article("best-wine-tours-from-lisbon").faq ?? []).flatMap((item) => [item.q, item.a]),
    ].join("\n");
    expect(guideText).not.toMatch(/700\+/);
    expect(guideText).not.toMatch(/small-group/i);
    expect(guideText).not.toMatch(/guaranteed wineries|wineries are guaranteed|guaranteed winery/i);
  });
});
