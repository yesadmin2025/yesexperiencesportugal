import { describe, it, expect } from "vitest";
import {
  rankRelatedTours,
  relatedStoriesForTour,
  relatedStoriesForStory,
  seedFromTour,
  scoreTour,
} from "@/lib/related-experiences";
import { findTour, signatureTours } from "@/data/signatureTours";
import { LOCAL_STORIES_ARTICLES } from "@/content/local-stories-articles";

describe("related-experiences recommender", () => {
  it("ranks tours in the same region cluster ahead of unrelated ones", () => {
    const arrabidaWine = findTour("arrabida-wine-allinclusive")!;
    const results = rankRelatedTours(seedFromTour(arrabidaWine), 4);

    expect(results).not.toContainEqual(expect.objectContaining({ id: arrabidaWine.id }));
    // Every Arrábida / Sesimbra / Azeitão tour scores positive; the top of
    // the list should not be a Centro / Alentejo tour.
    const topRegions = results.slice(0, 2).map((t) => t.region);
    for (const r of topRegions) {
      expect(r.toLowerCase()).toMatch(/arr[aá]bida|sesimbra|azeit[aã]o|set[uú]bal/);
    }
  });

  it("scoreTour gives an exact region match more weight than a token overlap", () => {
    const base = findTour("arrabida-wine-allinclusive")!;
    const sameRegion = signatureTours.find(
      (t) => t.id !== base.id && t.region === base.region,
    );
    const otherArrabida = signatureTours.find(
      (t) =>
        t.id !== base.id &&
        t.region !== base.region &&
        t.region.toLowerCase().includes("arrábida"),
    );
    if (!sameRegion || !otherArrabida) return;
    expect(scoreTour(sameRegion, seedFromTour(base))).toBeGreaterThan(
      scoreTour(otherArrabida, seedFromTour(base)),
    );
  });

  it("relatedStoriesForTour puts the matching Local Story first", () => {
    const arrabidaWine = findTour("arrabida-wine-allinclusive")!;
    const stories = relatedStoriesForTour(arrabidaWine, 3);
    expect(stories.length).toBeGreaterThan(0);
    expect(stories[0].signatureSlug).toBe(arrabidaWine.id);
  });

  it("relatedStoriesForStory excludes the current article", () => {
    const [first] = LOCAL_STORIES_ARTICLES;
    const results = relatedStoriesForStory(first, 5);
    expect(results.every((r) => r.slug !== first.slug)).toBe(true);
  });
});
