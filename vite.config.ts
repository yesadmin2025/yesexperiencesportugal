// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { imagetools } from "vite-imagetools";
import { loadEnv } from "vite";
import path from "node:path";

// Load non-VITE_ env vars (e.g. SUPABASE_SERVICE_ROLE_KEY, LOVABLE_API_KEY) into
// process.env so server routes (email webhook/queue) can read them. Do NOT
// add these to envDefine — keep them server-only.
const serverEnv = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
Object.assign(process.env, serverEnv);

export default defineConfig({
  vite: {
    // In GitHub Actions, the Vite dev HMR socket can trigger a document
    // reload while Playwright is asserting SSR content. A recorded trace
    // showed a second GET / without a click mid-test. Disable HMR only for
    // automated CI; local Lovable previews and production are untouched.
    server: { hmr: process.env.CI === "true" ? false : undefined },
    // Playwright's cold CI Vite server served React optimizations with
    // three different ?v= hashes within one page load. This splits the
    // React dispatcher and causes "Invalid hook call" in TooltipProvider.
    // In CI only, use a single deterministic optimizer pass for the
    // CommonJS React entries and the providers loaded on the root shell.
    // All real application and production builds keep the default behavior.
    optimizeDeps: process.env.CI === "true"
      ? {
          noDiscovery: true,
          include: [
            "react",
            "react/jsx-runtime",
            "react/jsx-dev-runtime",
            "react-dom",
            "react-dom/client",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-slot",
            "@tanstack/react-query",
            "@tanstack/react-router",
            "lucide-react",
            "sonner",
            "react-hook-form",
            "react-day-picker",
            "leaflet",
            "leaflet.markercluster",
            "browser-image-compression",
          ],
        }
      : undefined,
    // `imagetools` only acts on imports carrying an explicit `?w=`/`?format=`
    // query (see src/content/tour-card-images.ts). Plain image imports are
    // untouched, so existing asset pipelines keep working.
    plugins: [
      mcpPlugin(),
      // Scoped to imports that explicitly ask for a srcset, so every other
      // image import keeps Vite's normal asset pipeline untouched.
      imagetools({ include: /[?&]as=srcset/ }),
    ],
  },
});
