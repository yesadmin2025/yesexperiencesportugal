/**
 * Server-only helpers that walk the project source tree and extract every
 * reference to /tours/$tourId, then validate the captured ids against the
 * live catalog. Used by the dev-only `/admin/tour-link-audit` page.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { signatureTours } from "@/data/signatureTours";

export type TourLinkHit = {
  /** Repo-relative path, forward slashes. */
  file: string;
  /** 1-indexed line number. */
  line: number;
  /** The tour id captured at this site. */
  tourId: string;
  /** Why we matched this site (for debugging). */
  source:
    | "params-prop" // params={{ tourId: "..." }}
    | "url-literal" // "/tours/<id>" or '/tours/<id>'
    | "params-fn"; // params={(prev) => ({ ...prev, tourId: "..." })}
  /** The matched line, trimmed for display. */
  snippet: string;
};

export type TourLinkAuditReport = {
  scannedAt: string;
  scannedFiles: number;
  catalogIds: string[];
  totalReferences: number;
  validReferences: number;
  invalidReferences: TourLinkHit[];
  /** Catalog ids that no source file references (informational). */
  unreferencedCatalogIds: string[];
  /** Soft warnings — files we couldn't read, etc. */
  warnings: string[];
};

const SCAN_ROOTS = ["src"];
const SCAN_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mdx"]);
const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".vite",
  ".cache",
  "routeTree.gen.ts", // safety, though it's a file
]);
// Files whose tour-id literals are catalog definitions, not link references.
const SELF_DEFINING_FILES = new Set([
  "src/data/signatureTours.ts",
  "src/server/tourLinkAudit.server.ts",
]);

/** Walk a directory and yield candidate source files. */
async function* walk(dir: string): AsyncGenerator<string> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (SCAN_EXTS.has(ext)) yield full;
    }
  }
}

const PARAMS_PROP_RE = /tourId\s*:\s*["'`]([a-z0-9][a-z0-9-]*)["'`]/g;
const URL_LITERAL_RE = /["'`]\/tours\/([a-z0-9][a-z0-9-]+)(?:["'`/?#])/g;

function relPath(p: string): string {
  return path.relative(process.cwd(), p).split(path.sep).join("/");
}

export async function runTourLinkAudit(): Promise<TourLinkAuditReport> {
  const cwd = process.cwd();
  const catalogIds = signatureTours.map((t) => t.id);
  const catalogSet = new Set(catalogIds);
  const referenced = new Set<string>();
  const invalidReferences: TourLinkHit[] = [];
  const warnings: string[] = [];

  let totalReferences = 0;
  let validReferences = 0;
  let scannedFiles = 0;

  for (const root of SCAN_ROOTS) {
    const rootAbs = path.join(cwd, root);
    for await (const filePath of walk(rootAbs)) {
      scannedFiles++;
      const rel = relPath(filePath);
      if (SELF_DEFINING_FILES.has(rel)) continue;

      let text: string;
      try {
        text = await fs.readFile(filePath, "utf8");
      } catch (err) {
        warnings.push(`Could not read ${rel}: ${(err as Error).message}`);
        continue;
      }

      const lines = text.split("\n");

      const recordHit = (
        match: RegExpExecArray,
        source: TourLinkHit["source"],
      ) => {
        const id = match[1];
        // Compute 1-based line number from match index
        const upTo = text.slice(0, match.index);
        const line = upTo.split("\n").length;
        totalReferences++;
        referenced.add(id);
        if (catalogSet.has(id)) {
          validReferences++;
          return;
        }
        invalidReferences.push({
          file: rel,
          line,
          tourId: id,
          source,
          snippet: (lines[line - 1] ?? "").trim().slice(0, 200),
        });
      };

      // Reset lastIndex per file (regexes are top-level + global).
      PARAMS_PROP_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = PARAMS_PROP_RE.exec(text)) !== null) {
        recordHit(m, "params-prop");
      }

      URL_LITERAL_RE.lastIndex = 0;
      while ((m = URL_LITERAL_RE.exec(text)) !== null) {
        recordHit(m, "url-literal");
      }
    }
  }

  const unreferencedCatalogIds = catalogIds.filter((id) => !referenced.has(id));

  return {
    scannedAt: new Date().toISOString(),
    scannedFiles,
    catalogIds,
    totalReferences,
    validReferences,
    invalidReferences,
    unreferencedCatalogIds,
    warnings,
  };
}
