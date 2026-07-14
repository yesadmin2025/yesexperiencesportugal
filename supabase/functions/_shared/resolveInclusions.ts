// Server-authoritative inclusion resolver.
//
// Client-sent inclusionIds are IGNORED. Authoritative inclusions come from:
//   1. Mapped Bókun activity metadata (when available)
//   2. Canonical product source inclusions (passed in by caller)
//   3. Inclusions contributed by selected server add-ons
//
// Deduplicated by stable id. Removes inclusions belonging to stops that
// were removed from the itinerary (caller supplies retainedStopIds if known).

import type { AddOnLineItem } from "./signatureAddOnCatalogue.ts";

export interface ResolvedInclusion {
  id: string;
  label: string;
}

export interface InclusionResolveInput {
  bokunInclusions?: ReadonlyArray<string> | null;
  productInclusions?: ReadonlyArray<string> | null;
  addOnLines: ReadonlyArray<AddOnLineItem>;
}

function stableId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export function resolveAuthoritativeInclusions(
  input: InclusionResolveInput,
): ResolvedInclusion[] {
  const out = new Map<string, ResolvedInclusion>();
  const push = (label: string, idOverride?: string) => {
    const trimmed = label?.trim();
    if (!trimmed) return;
    const id = (idOverride ?? stableId(trimmed)).slice(0, 64);
    if (!id) return;
    if (!out.has(id)) out.set(id, { id, label: trimmed.slice(0, 140) });
  };

  // Priority 1: Bókun activity metadata
  if (input.bokunInclusions?.length) {
    for (const label of input.bokunInclusions) push(label);
  }
  // Priority 2: canonical product source
  if (input.productInclusions?.length) {
    for (const label of input.productInclusions) push(label);
  }
  // Priority 3: selected server add-ons
  for (const line of input.addOnLines) {
    for (const inclId of line.inclusionIds) {
      push(line.label, inclId);
    }
  }
  return Array.from(out.values()).slice(0, 30);
}
