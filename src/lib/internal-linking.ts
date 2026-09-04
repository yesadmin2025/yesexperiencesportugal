/**
 * Internal linking plan for the Journal.
 *
 * Every guide belongs to one topic cluster. Each cluster has a hub guide
 * (the page we want to rank), so a reader who lands on a long-tail piece is
 * always one click from the hub, from sibling reading, from the matching
 * Signature day, and from the Studio.
 *
 * Truth rules: labels and Signature slugs come from the article data itself,
 * never invented here. Nothing is linked that does not exist.
 */

import { LOCAL_STORIES_ARTICLES, type LocalStoryArticle } from "@/content/local-stories-articles";

export type GuideCluster = "arrabida-wine" | "lisbon-day-trips" | "sintra" | "alentejo" | "coast";

/** Hub guide slug per cluster. Each must exist in LOCAL_STORIES_ARTICLES. */
export const CLUSTER_HUBS: Record<GuideCluster, string> = {
  "arrabida-wine": "arrabida-wine-tour-from-lisbon",
  "lisbon-day-trips": "best-day-trips-from-lisbon",
  sintra: "sintra-day-tour-from-lisbon",
  alentejo: "alentejo-wine-tour-from-lisbon",
  coast: "portugal-coastal-drives-from-lisbon",
};

/** Slug → cluster, resolved by explicit rules then keyword fallback. */
export function clusterForSlug(slug: string): GuideCluster {
  const s = slug.toLowerCase();
  if (s.includes("sintra") && !s.includes("arrabida")) return "sintra";
  if (s.includes("evora") || s.includes("alentejo") || s.includes("roman-heritage"))
    return "alentejo";
  if (s.includes("arrabida") || s.includes("wine") || s.includes("winer")) return "arrabida-wine";
  if (
    s.includes("coast") ||
    s.includes("beach") ||
    s.includes("comporta") ||
    s.includes("troia") ||
    s.includes("sesimbra") ||
    s.includes("vicentine")
  )
    return "coast";
  return "lisbon-day-trips";
}

export interface GuideLinkTarget {
  path: string;
  label: string;
}

export interface GuideNextSteps {
  cluster: GuideCluster;
  /** The cluster hub, omitted when the article IS the hub. */
  hub?: GuideLinkTarget;
  /** Up to three sibling guides in the same cluster. */
  siblings: GuideLinkTarget[];
  /** Matching Signature day, when the article declares one. */
  signatureSlug?: string;
  /** Short label for the Studio invitation, tuned to the cluster. */
  studioLead: string;
}

const STUDIO_LEAD: Record<GuideCluster, string> = {
  "arrabida-wine": "Design a private wine day around what you actually like drinking",
  "lisbon-day-trips": "Design your own day out of Lisbon, hour by hour",
  sintra: "Design a Sintra day at your own pace, without the queues",
  alentejo: "Design an Alentejo day around the wines and towns you choose",
  coast: "Design a coastal day around the beaches and viewpoints you choose",
};

function byPath(path: string): LocalStoryArticle | undefined {
  const slug = path.replace("/local-stories/", "");
  return LOCAL_STORIES_ARTICLES.find((a) => a.slug === slug);
}

function target(article: LocalStoryArticle): GuideLinkTarget {
  return { path: `/local-stories/${article.slug}`, label: article.h1 || article.title };
}

/**
 * Resolve the onward links for one guide: hub first, then hand-authored
 * related reads, then same-cluster siblings to fill up to three.
 */
export function resolveGuideNextSteps(article: LocalStoryArticle): GuideNextSteps {
  const cluster = clusterForSlug(article.slug);
  const hubSlug = CLUSTER_HUBS[cluster];
  const hubArticle = LOCAL_STORIES_ARTICLES.find((a) => a.slug === hubSlug);
  const isHub = article.slug === hubSlug;

  const seen = new Set<string>([article.slug, ...(isHub ? [] : [hubSlug])]);
  const siblings: GuideLinkTarget[] = [];

  const push = (candidate?: LocalStoryArticle) => {
    if (!candidate || seen.has(candidate.slug) || siblings.length >= 3) return;
    seen.add(candidate.slug);
    siblings.push(target(candidate));
  };

  for (const r of article.relatedReads ?? []) {
    if (r.path.startsWith("/local-stories/")) push(byPath(r.path));
  }
  for (const a of LOCAL_STORIES_ARTICLES) {
    if (clusterForSlug(a.slug) === cluster) push(a);
  }

  return {
    cluster,
    hub: !isHub && hubArticle ? target(hubArticle) : undefined,
    siblings,
    signatureSlug: article.signatureSlug,
    studioLead: STUDIO_LEAD[cluster],
  };
}
