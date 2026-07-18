/**
 * Detect duplicated editorial images across modules.
 *
 * Three kinds:
 *   - exact:   same `src` in ≥2 module slots (identical URL).
 *   - content: same admin-upload `content_hash` reused across slots.
 *   - name:    same base filename (heuristic) across static assets.
 *
 * The `name` bucket is a best-effort signal for static assets that lack a
 * content hash — it groups `arrabida-viewpoint-women` + `arrabida-viewpoint-group`
 * only when they share a stem. Cross-bucket duplicates (exact wins over
 * content wins over name) never appear twice.
 */
import type { EditorialModuleKey, EditorialSlot } from "@/lib/editorial-overrides";
import type { PoolPhoto } from "./pool";

export type DupeKind = "exact" | "content" | "name";

export type SlotRef = {
  moduleKey: EditorialModuleKey;
  moduleLabel: string;
  slotIndex: number;
  slot: EditorialSlot;
};

export type DuplicateGroup = {
  key: string;
  kind: DupeKind;
  photos: PoolPhoto[]; // pool entries when resolvable
  usedIn: SlotRef[];
};

function baseName(name: string): string {
  // strip extension + trailing -1/-2/-women/-group qualifiers
  return name
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_](?:women|men|group|selfie|couple|solo|\d+)$/i, "");
}

export function findDuplicateGroups(
  effectiveByModule: Map<EditorialModuleKey, EditorialSlot[]>,
  moduleLabels: Map<EditorialModuleKey, string>,
  pool: PoolPhoto[],
): DuplicateGroup[] {
  const bySrc = new Map<string, SlotRef[]>();
  for (const [moduleKey, slots] of effectiveByModule) {
    const moduleLabel = moduleLabels.get(moduleKey) ?? moduleKey;
    slots.forEach((slot, slotIndex) => {
      const list = bySrc.get(slot.src) ?? [];
      list.push({ moduleKey, moduleLabel, slotIndex, slot });
      bySrc.set(slot.src, list);
    });
  }

  const poolBySrc = new Map(pool.map((p) => [p.src, p]));
  const groups: DuplicateGroup[] = [];
  const claimedSrcs = new Set<string>();

  // 1. Exact duplicates
  for (const [src, refs] of bySrc) {
    if (refs.length >= 2) {
      const p = poolBySrc.get(src);
      groups.push({
        key: `exact:${src}`,
        kind: "exact",
        photos: p ? [p] : [],
        usedIn: refs,
      });
      claimedSrcs.add(src);
    }
  }

  // 2. Content-hash duplicates (admin uploads). Uses .contentHash if the
  //    pool loader ever exposes it; today only present on admin rows fetched
  //    with hash. Falls back silently when not available.
  const byHash = new Map<string, { photo: PoolPhoto; refs: SlotRef[] }[]>();
  for (const p of pool) {
    const hash = (p as PoolPhoto & { contentHash?: string }).contentHash;
    if (!hash) continue;
    const refs = bySrc.get(p.src) ?? [];
    if (refs.length === 0) continue;
    const list = byHash.get(hash) ?? [];
    list.push({ photo: p, refs });
    byHash.set(hash, list);
  }
  for (const [hash, entries] of byHash) {
    if (entries.length < 2) continue;
    const usedIn = entries.flatMap((e) => e.refs);
    const srcs = entries.map((e) => e.photo.src);
    if (srcs.every((s) => claimedSrcs.has(s))) continue;
    groups.push({
      key: `content:${hash}`,
      kind: "content",
      photos: entries.map((e) => e.photo),
      usedIn,
    });
    for (const s of srcs) claimedSrcs.add(s);
  }

  // 3. Name-stem duplicates (static assets heuristic)
  const byStem = new Map<string, { photo: PoolPhoto; refs: SlotRef[] }[]>();
  for (const p of pool) {
    if (claimedSrcs.has(p.src)) continue;
    const refs = bySrc.get(p.src) ?? [];
    if (refs.length === 0) continue;
    const stem = baseName(p.name);
    if (stem.length < 4) continue;
    const list = byStem.get(stem) ?? [];
    list.push({ photo: p, refs });
    byStem.set(stem, list);
  }
  for (const [stem, entries] of byStem) {
    if (entries.length < 2) continue;
    // Only flag when they live in DIFFERENT modules
    const modules = new Set(entries.flatMap((e) => e.refs.map((r) => r.moduleKey)));
    if (modules.size < 2) continue;
    groups.push({
      key: `name:${stem}`,
      kind: "name",
      photos: entries.map((e) => e.photo),
      usedIn: entries.flatMap((e) => e.refs),
    });
  }

  return groups;
}
