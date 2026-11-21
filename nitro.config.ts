import { defineConfig } from "nitro";

// Enable zero-overhead Brotli/Gzip compression for built static assets.
// The audit's uncompressed 471KB global CSS was accounting for most of
// the initial render-blocking transfer under mobile throttling.
// Cloudflare/Lovable deployment adapter and SSR routing remain unchanged.
export default defineConfig({
  compressPublicAssets: {
    gzip: true,
    brotli: true,
    zstd: false,
  },
});
