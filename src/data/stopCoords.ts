// Minimal stop coordinate helper — deterministic layout for the schematic
// Portugal route map. Formerly resolved real geo from a hand-curated
// dataset; simplified to a deterministic evenly-spaced fallback.

export type StopCoord = { label: string; x: number; y: number };

const REGION_ANCHORS: Record<string, { x: number; y: number }> = {
  lisbon: { x: 40, y: 60 },
  arrabida: { x: 42, y: 68 },
  sintra: { x: 34, y: 58 },
  cascais: { x: 32, y: 62 },
  alentejo: { x: 55, y: 78 },
  algarve: { x: 45, y: 100 },
  troia: { x: 44, y: 74 },
  comporta: { x: 45, y: 78 },
  porto: { x: 42, y: 22 },
  coimbra: { x: 40, y: 40 },
};

export function snapStop(label: string, region: string, index: number): StopCoord {
  const anchor = REGION_ANCHORS[region] ?? REGION_ANCHORS.lisbon;
  // Fan stops out around the anchor deterministically by index.
  const dx = ((index % 4) - 1.5) * 4;
  const dy = Math.floor(index / 4) * 5 + (index % 2 === 0 ? -2 : 2);
  return { label, x: anchor.x + dx, y: anchor.y + dy };
}
