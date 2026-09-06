import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Performance boundary guard: static editorial Local Stories must never pull
 * the browser Supabase client into the route chunk. Dynamic DB-only slugs go
 * through the createServerFn boundary in journalPublic.functions.ts, which
 * uses the privileged server client inside its handler.
 */
describe("local stories server boundary", () => {
  const routeSource = readFileSync(
    resolve(__dirname, "../routes/local-stories.$slug.tsx"),
    "utf-8",
  );
  const serverFnSource = readFileSync(
    resolve(__dirname, "../lib/journalPublic.functions.ts"),
    "utf-8",
  );

  it("route does not import the browser Supabase client", () => {
    expect(routeSource).not.toContain("@/integrations/supabase/client\"");
    expect(routeSource).not.toContain("@/integrations/supabase/client'");
    // The server-only admin client must not be reachable from the route module.
    expect(routeSource).not.toContain("client.server");
  });

  it("route resolves dynamic slugs through the server-function boundary", () => {
    expect(routeSource).toContain("@/lib/journalPublic.functions");
    expect(routeSource).toContain("getPublishedJournalPost");
    // Static articles return before any DB lookup.
    expect(routeSource).toContain("if (article) return { dbPost: null };");
  });

  it("server function validates input and uses the privileged server client in the handler", () => {
    expect(serverFnSource).toContain('createServerFn({ method: "GET" })');
    expect(serverFnSource).toContain("z.object({ slug:");
    expect(serverFnSource).toContain('await import("@/integrations/supabase/client.server")');
    expect(serverFnSource).toContain('.eq("status", "published")');
  });
});
