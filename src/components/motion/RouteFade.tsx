import { useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";

/**
 * RouteFade — a tiny presentational wrapper that keys its child on the
 * current pathname and re-triggers a 160ms opacity fade-in on route
 * change via the `[data-route-fade]` CSS animation.
 *
 * Rules:
 *  • Never blocks render — content mounts immediately.
 *  • Never adds a loader.
 *  • Disabled on Studio, Builder, Tailor, Checkout, Admin, Auth, API
 *    and internal Lovable/MCP/QA paths — see EXCLUDE regex below.
 *  • Disabled under reduced motion (CSS handles the override).
 *  • Scroll restoration and focus are handled by the router — this
 *    wrapper is presentational only.
 */
const EXCLUDE_PATTERNS: RegExp[] = [
  /^\/studio-v2(\/|$)/,
  /^\/experience-studio(\/|$)/,
  /^\/studio-v3(\/|$)/,
  /^\/studio-drift(\/|$)/,
  /^\/builder(\/|$)/,
  /^\/checkout(\/|$)/,
  /^\/tours\/[^/]+\/tailor(\/|$)/,
  /^\/admin(\/|$)/,
  /^\/auth(\/|$)/,
  /^\/api(\/|$)/,
  /^\/lovable(\/|$)/,
  /^\/\.lovable(\/|$)/,
  /^\/mcp(\/|$)/,
  /^\/e2e\./,
  /^\/qa\./,
  /^\/hero-verify(\/|$)/,
  /^\/preview-check(\/|$)/,
  /^\/typography-audit(\/|$)/,
];

function isExcluded(pathname: string): boolean {
  return EXCLUDE_PATTERNS.some((re) => re.test(pathname));
}

export function RouteFade({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const excluded = isExcluded(pathname);

  if (excluded) {
    return <>{children}</>;
  }

  return (
    <div key={pathname} data-route-fade="" style={{ display: "contents" }}>
      {children}
    </div>
  );
}
