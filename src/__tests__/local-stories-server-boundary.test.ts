import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const routeSource = readFileSync(join(SRC_ROOT, "routes/local-stories.$slug.tsx"), "utf8");
const serverSource = readFileSync(join(SRC_ROOT, "lib/journalPublic.functions.ts"), "utf8");

describe("Local Stories database boundary", () => {
  it("keeps the browser Supabase client out of the article route", () => {
    expect(routeSource).not.toContain('@/integrations/supabase/client"');
    expect(routeSource).not.toContain("fetchPost(");
    expect(routeSource).toContain("getPublishedJournalPost");
  });

  it("performs the dynamic journal lookup through the server client only", () => {
    expect(serverSource).toContain('from "@tanstack/react-start"');
    expect(serverSource).toContain('from "@/integrations/supabase/client.server"');
    expect(serverSource).not.toContain('from "@/integrations/supabase/client"');
  });
});
