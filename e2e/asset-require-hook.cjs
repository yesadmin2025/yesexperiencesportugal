/**
 * Asset stub for Playwright's Node-side spec transform.
 *
 * Specs import real app modules (`src/data/signatureTours.ts`,
 * `src/components/studio-v3/curation.ts`) so pricing, stops and labels stay a
 * single source of truth. Those modules also `import hero from "*.jpg"`, which
 * Vite understands but Node does not — without this hook Node falls back to the
 * JavaScript loader and Babel tries to parse the JPEG bytes, so the whole spec
 * file fails to load before a single test runs.
 *
 * Here every non-code asset resolves to the URL string Vite would emit, which
 * is all any spec ever needs from an image.
 */
const path = require("node:path");

const ASSET_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".gif",
  ".svg",
  ".ico",
  ".mp4",
  ".webm",
  ".mov",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".css",
];

for (const ext of ASSET_EXTENSIONS) {
  require.extensions[ext] = (module, filename) => {
    module.exports = `/${path.basename(filename)}`;
    module.exports.default = module.exports;
  };
}
