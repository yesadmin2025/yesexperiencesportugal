import {
  Outlet,
  Link,
  Navigate,
  redirect,
  createRootRoute,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import appCss from "../styles.css?url";
import { installResetBlankCheckFilter } from "@/lib/silence-reset-blank-check";
import { installIframeFooterGuard } from "@/lib/iframe-footer-guard";
import { installClientErrorLogger } from "@/lib/client-error-logger";
import { installDevHardReload } from "@/lib/dev-hard-reload";
import { organizationLd, websiteLd, jsonLdScript } from "@/lib/jsonld";
import { WhatsAppSupportButton } from "@/components/support/WhatsAppSupportButton";
import { RouteFade } from "@/components/motion/RouteFade";
import { Scene } from "@/components/motion/Scene";
import { installAnalyticsAttrs } from "@/lib/analytics";
import { setAnalyticsLocale } from "@/lib/analytics-events";
import { captureUtmsFromLocation } from "@/lib/utm";
import { LocaleProvider } from "@/i18n/locale-context";
import { LOCALE_BCP47, parseLocaleFromPath } from "@/i18n/config";
import { Analytics } from "@vercel/analytics/react";

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
    // Motion gate: opts scoped reveal styles in. Content stays visible
    // by default; individual Scenes carry their own [data-scene-ready].
    // This attribute is future-proofing for CSS that wants to know the
    // React tree is live (e.g. gating hover-only choreography).
    document.documentElement.setAttribute("data-motion-ready", "1");
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
  const isPt = typeof window !== "undefined" && window.location.pathname.startsWith("/pt");
  const strings = isPt
    ? {
        title: "Página não encontrada",
        body: "A página que procura não existe ou foi movida.",
        cta: "Ir para o início",
      }
    : {
        title: "Page not found",
        body: "The page you're looking for doesn't exist or has been moved.",
        cta: "Go home",
      };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Scene className="max-w-md text-center">
        <h1 className="scene-title text-7xl font-bold text-foreground">404</h1>
        <h2 className="scene-title mt-4 text-xl font-semibold text-foreground">{strings.title}</h2>
        <p className="scene-body mt-2 text-sm text-muted-foreground">{strings.body}</p>
        <div className="scene-cta mt-6">
          <Link
            to={isPt ? "/pt" : "/"}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {strings.cta}
          </Link>
        </div>
      </Scene>
    </div>
  );
}

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    if (location.pathname.startsWith("/lovable/")) return;
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
        content: "osEeuJrBPxuoJix9iAIto7KYyWlQ5I_2Tqqfxk6ggCs",
      },
      {
        name: "google-site-verification",
        content: "Svpb5FhGi6Fku6J-X230o8nKyBH23ilH-5-0fKOMVQ4",
      },
      // Sitewide defaults only — page-specific title/description/og:* live
      // on leaf routes. Root keeps site_name, type, locale, twitter card/site,
      // geo, robots, verification. See head-meta rules.
      { name: "author", content: "YES experiences Portugal" },
      { name: "robots", content: "index,follow,max-image-preview:large" },
      { name: "geo.region", content: "PT" },
      { name: "geo.placename", content: "Sesimbra, Setúbal, Portugal" },
      { name: "geo.position", content: "38.4451;-9.1018" },
      { name: "ICBM", content: "38.4451, -9.1018" },
      { property: "og:site_name", content: "YES experiences Portugal" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_US" },
      { property: "og:locale:alternate", content: "en_GB" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@yesexperiencespt" },
    ],

    links: [
      // Favicons — multiple sizes so Google's image crawler can pick a
      // sharp variant for the SERP icon. A single .ico is often ignored
      // when there is no high-resolution PNG counterpart.
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/brand/svg/yes-experiences-portugal-centered-full.svg",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/icon-192.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "192x192",
        href: "/icon-192.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "512x512",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "apple-touch-icon",
        sizes: "512x512",
        href: "/apple-touch-icon.png",
      },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      // Perf: pruned to the two families actually rendered on-screen.
      // --font-serif (Georgia, "Cormorant Garamond", "Newsreader", serif)
      // resolves to Georgia (system) first, so the Google-hosted fallbacks
      // never render — safe to drop from the network request. Kaushan Script
      // (--font-script) is only referenced by the internal typography-audit
      // route and is not used in production surfaces. Weight ranges tightened
      // to the actually-used span (300–700) to shrink the variable-font WOFF2
      // payload without losing any visual weight the site renders.
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300..700;1,300..700&family=Inter:wght@300..700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      {
        // Google Consent Mode v2 — default denied, before GTM boots.
        // The cookie banner must call setAnalyticsConsent("granted") /
        // window.gtag('consent','update',{ analytics_storage:'granted', ... })
        // once the visitor accepts.
        children:
          "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=window.gtag||gtag;gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});",
      },
      {
        children:
          "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-M82SQS79');",
      },
      jsonLdScript(organizationLd()),
      jsonLdScript(websiteLd()),
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { locale } = parseLocaleFromPath(pathname);
  return (
    <html lang={LOCALE_BCP47[locale]}>
      <head>
        <HeadContent />
      </head>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-M82SQS79"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
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
  useEffect(() => installDevHardReload(), []);
  useEffect(() => installAnalyticsAttrs(), []);
  useEffect(() => {
    captureUtmsFromLocation();
  }, []);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { locale } = parseLocaleFromPath(pathname);
  useEffect(() => {
    setAnalyticsLocale(locale);
    // Re-check UTMs on client-side navigation (SPA route changes).
    captureUtmsFromLocation();
  }, [locale, pathname]);
  // Pause long Ken Burns / crossfade loops while they are offscreen.
  useEffect(() => pauseOffscreenLoops(), [pathname]);

  // Single QueryClient per browser session — keeps SignaturePriceCard and

  // any future useQuery hook resolvable without each route wiring its own.
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider locale={locale}>
        <TooltipProvider delayDuration={150}>
          <RouteFade>
            <Outlet />
          </RouteFade>
          <WhatsAppSupportButton />
          <Toaster position="bottom-left" richColors closeButton />
          <Analytics />
        </TooltipProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}
