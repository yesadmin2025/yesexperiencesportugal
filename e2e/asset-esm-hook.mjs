/**
 * ESM asset stub for Playwright's spec loader.
 *
 * Specs import real app modules (`src/data/signatureTours.ts`,
 * `src/components/studio-v3/curation.ts`) so pricing, stops and labels stay a
 * single source of truth. Those modules also `import hero from "*.jpg"`, which
 * Vite understands but Node does not — without this hook Node hands the JPEG
 * bytes to Babel and the whole spec file fails to load before a single test
 * runs.
 *
 * Here every non-code asset resolves to the URL string Vite would emit, which
 * is all any spec ever needs from an image.
 */
const ASSET_RE =
  /\.(jpe?g|png|webp|avif|gif|svg|ico|mp4|webm|mov|woff2?|ttf|otf|css)(\?[^/]*)?$/i;

export async function resolve(specifier, context, nextResolve) {
  const result = await nextResolve(specifier, context);
  if (ASSET_RE.test(result.url)) {
    return { ...result, format: "module", shortCircuit: true };
  }
  return result;
}

export async function load(url, context, nextLoad) {
  if (ASSET_RE.test(url)) {
    const name = decodeURIComponent(url.split("?")[0].split("/").pop() ?? "asset");
    return {
      format: "module",
      shortCircuit: true,
      source: `export default ${JSON.stringify(`/${name}`)};`,
    };
  }
  return nextLoad(url, context);
}
