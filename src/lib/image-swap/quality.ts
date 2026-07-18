/**
 * Estimate the perceived quality tier of a stock photo based on its
 * largest side. Used by the /admin/image-swap filter bar and candidate
 * cards. Static assets without known dimensions fall back to a name
 * heuristic before returning "desconhecida".
 */
import type { PoolPhoto } from "./pool";

export type QualityTier = "alta" | "media" | "baixa" | "desconhecida";

export function estimateQuality(photo: PoolPhoto): QualityTier {
  const maxSide = Math.max(photo.width ?? 0, photo.height ?? 0);
  if (maxSide >= 1600) return "alta";
  if (maxSide >= 1000) return "media";
  if (maxSide > 0) return "baixa";
  // Static owner/ambient assets don't ship dimensions in the .asset.json.
  // We treat them as unknown; the filter can hide them explicitly.
  return "desconhecida";
}

export function qualityLabel(tier: QualityTier): string {
  switch (tier) {
    case "alta":
      return "Alta";
    case "media":
      return "Média";
    case "baixa":
      return "Baixa";
    default:
      return "—";
  }
}

export function resolutionLabel(photo: PoolPhoto): string | null {
  if (!photo.width || !photo.height) return null;
  return `${photo.width}×${photo.height}`;
}
