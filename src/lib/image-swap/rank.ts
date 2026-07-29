/**
 * Ranks candidate photos for an editorial slot.
 *
 * Score = tag overlap + orientation match + freshness + quality boost.
 */
import type { PoolPhoto } from "./pool";
import { estimateQuality } from "./quality";

export type RankedCandidate = {
  photo: PoolPhoto;
  score: number;
  reason: string;
  alreadyUsedIn: string[]; // module labels
};

export type SlotContext = {
  currentSrc: string;
  desiredOrientation: "portrait" | "landscape";
  desiredTags: string[]; // e.g. ["people","place"] or ["landscape","coast"]
};

export function rankCandidates(
  pool: PoolPhoto[],
  slot: SlotContext,
  usedElsewhere: Map<string, string[]>, // src -> module labels
  limit = 12,
): RankedCandidate[] {
  const results: RankedCandidate[] = [];
  for (const photo of pool) {
    if (photo.src === slot.currentSrc) continue;

    const tagOverlap = photo.tags.filter((t) => slot.desiredTags.includes(t)).length;
    const orientation: "portrait" | "landscape" =
      photo.width && photo.height
        ? photo.width >= photo.height
          ? "landscape"
          : "portrait"
        : photo.name.toLowerCase().match(/aerial|cliff|coast|bay|cove|sunset|boardwalk/)
          ? "landscape"
          : "portrait";
    const orientationMatch = orientation === slot.desiredOrientation ? 1 : 0;
    const usedIn = usedElsewhere.get(photo.src) ?? [];
    const fresh = usedIn.length === 0 ? 1 : 0;
    const quality = estimateQuality(photo);
    const qualityBoost = quality === "alta" ? 2 : quality === "baixa" ? -2 : 0;

    const score = tagOverlap * 3 + orientationMatch * 2 + fresh * 2 + qualityBoost;

    const reasons: string[] = [];
    if (tagOverlap > 0)
      reasons.push(
        `combina com o tema (${photo.tags.filter((t) => slot.desiredTags.includes(t)).join(", ")})`,
      );
    if (orientationMatch) reasons.push(`orientação ${orientation} correta`);
    if (quality === "alta") reasons.push("alta resolução");
    else if (quality === "baixa") reasons.push("resolução baixa");
    if (fresh) reasons.push("ainda não é usada noutro módulo");
    else reasons.push(`já usada em: ${usedIn.join(", ")}`);

    results.push({
      photo,
      score,
      reason: reasons.join(" · "),
      alreadyUsedIn: usedIn,
    });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
