import {
  Outlet,
  Link,
  Navigate,
  redirect,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { installResetBlankCheckFilter } from "@/lib/silence-reset-blank-check";
import { installIframeFooterGuard } from "@/lib/iframe-footer-guard";
import { installClientErrorLogger } from "@/lib/client-error-logger";
import { organizationLd, websiteLd, jsonLdScript } from "@/lib/jsonld";

/* ──────────────────────────────────────────────────────────────────
 * App readiness flag — sets `window.__APP_READY__ = true` and fires
 * a `app:ready` CustomEvent after the React tree mounts. Useful for:
 *   - external readiness probes (preview harness, Playwright, smoke
 *     scripts) that want to know when the SPA is interactive, not
 *     just when the SSR HTML was streamed,
 *   - in-page extensions/listeners that should defer until first
 *     paint is done.
 * Pure no-op on the server.
 * ────────────────────────────────────────────────────────────── */
declare global {
  interface Window {
    __APP_READY__?: boolean;
    __APP_READY_AT__?: number;
  }
}

// Best-effort POST to /api/health so the server-cached readiness
// stage tracks client progress. Fire-and-forget; failures are silent
// (it's diagnostic, not a source of truth).
function reportStage(stage: "hydrating" | "app-ready", detail?: string) {
  if (typeof window === "undefined") return;
  try {
    fetch("/api/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, detail }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* noop */
  }
}

function useAppReadyFlag() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // We're in the client effect → hydration has started.
    reportStage("hydrating");
    // Defer one frame so layout/styles settle before we signal ready.
    const raf = requestAnimationFrame(() => {
      window.__APP_READY__ = true;
      window.__APP_READY_AT__ = Date.now();
      window.dispatchEvent(new CustomEvent("app:ready"));
      reportStage("app-ready", `t+${(Date.now() - performance.timeOrigin) | 0}ms`);
    });
    return () => cancelAnimationFrame(raf);
  }, []);
}

/* ──────────────────────────────────────────────────────────────────
 * Preview-harness postMessage/console noise filter.
 * Thin React hook over `installResetBlankCheckFilter` (see
 * src/lib/silence-reset-blank-check.ts). The pure function lives in
 * its own module so it's unit-testable without rendering the router.
 * ────────────────────────────────────────────────────────────── */
function useSilenceResetBlankCheck() {
  useEffect(() => {
    const { dispose } = installResetBlankCheckFilter();
    return dispose;
  }, []);
}

function NotFoundComponent() {
  if (typeof window !== "undefined" && window.location.pathname === "/index") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/index") {
      throw redirect({ to: "/", replace: true });
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        name: "google-site-verification",
        content: "Svpb5FhGi6Fku6J-X230o8nKyBH23ilH-5-0fKOMVQ4",
      },
      { title: "YesExperiences Portugal" },
      {
        name: "description",
        content:
          "YES Experiences Portugal crafts personalized Portuguese journeys with an interactive builder and dynamic storytelling.",
      },
      { name: "author", content: "YES experiences Portugal" },
      { property: "og:site_name", content: "YES experiences Portugal" },
      { property: "og:title", content: "YesExperiences Portugal" },
      {
        property: "og:description",
        content:
          "YES Experiences Portugal crafts personalized Portuguese journeys with an interactive builder and dynamic storytelling.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@yesexperiencespt" },
      { name: "twitter:title", content: "YesExperiences Portugal" },
      {
        name: "twitter:description",
        content:
          "YES Experiences Portugal crafts personalized Portuguese journeys with an interactive builder and dynamic storytelling.",
      },
    ],

    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300..900;1,300..900&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&family=Inter:wght@100..900&family=Kaushan+Script&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function useIframeFooterGuard() {
  useEffect(() => {
    // Pure no-op outside an iframe; only installs listeners when
    // window.self !== window.top. Blocks programmatic "jump to footer"
    // scrolls that some host preview harnesses fire spuriously.
    return installIframeFooterGuard();
  }, []);
}

function RootComponent() {
  useSilenceResetBlankCheck();
  useAppReadyFlag();
  useIframeFooterGuard();
  useEffect(() => installClientErrorLogger(), []);
  // Single QueryClient per browser session — keeps SignaturePriceCard and
  // any future useQuery hook resolvable without each route wiring its own.
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="bottom-left" richColors closeButton />
    </QueryClientProvider>
  );
}
