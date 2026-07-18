/**
 * Stock pool for the admin image-swap tool.
 *
 * Aggregates every real photo the site can legitimately draw from:
 *   • owner-photos/*  — verified owner photography
 *   • ambient/*       — curated landscape stock (real places)
 *   • tour_gallery_photos (admin uploads) — resolved to signed URLs
 *
 * Static assets are collected via import.meta.glob so new files added to
 * the folders show up automatically without touching this file. Uploads
 * come from Supabase at runtime.
 */
import { supabase } from "@/integrations/supabase/client";

export type PoolSource = "owner-photo" | "ambient" | "admin-upload";

export type PoolPhoto = {
  id: string;               // stable id (url or storage_path)
  src: string;              // usable src (CDN url or signed url)
  source: PoolSource;
  name: string;             // human-readable filename
  tags: string[];           // inferred: people, landscape, craft, food, coast, wine
  width?: number;
  height?: number;
};

type AssetJson = { url: string; original_filename?: string };

const ownerModules = import.meta.glob<AssetJson>(
  "/src/assets/owner-photos/*.asset.json",
  { eager: true, import: "default" },
);
const ambientModules = import.meta.glob<AssetJson>(
  "/src/assets/ambient/*.asset.json",
  { eager: true, import: "default" },
);

function inferTags(name: string): string[] {
  const n = name.toLowerCase();
  const tags: string[] = [];
  if (/(couple|group|women|people|selfie|hands|painter|potter|harvester|guide)/.test(n))
    tags.push("people");
  if (/(cove|bay|cliff|beach|coast|sunset|aerial|boardwalk|palm|pessegueiro|espichel|vicentine)/.test(n))
    tags.push("landscape", "coast");
  if (/(potter|ceramic|azulejo|painter|craft|barrel)/.test(n)) tags.push("craft");
  if (/(wine|tasting|cheers|petiscos|moscatel|barrel|cake|orange)/.test(n)) tags.push("wine", "food");
  if (/(sintra|arrabida|azeitao|alentejo|comporta|troia|setubal)/.test(n)) tags.push("place");
  if (tags.length === 0) tags.push("editorial");
  return Array.from(new Set(tags));
}

function toPool(source: PoolSource, path: string, mod: AssetJson): PoolPhoto {
  const name = (mod.original_filename ?? path.split("/").pop() ?? "photo").replace(/\.asset\.json$/, "");
  return {
    id: mod.url,
    src: mod.url,
    source,
    name,
    tags: inferTags(name),
  };
}

const STATIC_POOL: PoolPhoto[] = [
  ...Object.entries(ownerModules).map(([p, m]) => toPool("owner-photo", p, m)),
  ...Object.entries(ambientModules).map(([p, m]) => toPool("ambient", p, m)),
];

const SIGNED_URL_TTL = 60 * 60 * 24 * 7;

export async function loadAdminUploads(): Promise<PoolPhoto[]> {
  const { data, error } = await supabase
    .from("tour_gallery_photos")
    .select("id, storage_path, alt, width, height")
    .order("created_at", { ascending: false });
  if (error || !data || data.length === 0) return [];
  const { data: signed } = await supabase.storage
    .from("tour-photos")
    .createSignedUrls(
      data.map((r) => r.storage_path),
      SIGNED_URL_TTL,
    );
  const byPath = new Map((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]));
  return data
    .map((r) => {
      const url = byPath.get(r.storage_path);
      if (!url) return null;
      const name = r.storage_path.split("/").pop() ?? "upload";
      return {
        id: r.storage_path,
        src: url,
        source: "admin-upload" as const,
        name,
        tags: inferTags(`${name} ${r.alt ?? ""}`),
        width: r.width ?? undefined,
        height: r.height ?? undefined,
      } satisfies PoolPhoto;
    })
    .filter((x): x is PoolPhoto => x !== null);
}

export async function loadFullPool(): Promise<PoolPhoto[]> {
  const uploads = await loadAdminUploads();
  return [...STATIC_POOL, ...uploads];
}

export function getStaticPool(): PoolPhoto[] {
  return STATIC_POOL;
}
