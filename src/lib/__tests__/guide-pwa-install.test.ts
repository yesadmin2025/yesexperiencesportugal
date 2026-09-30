import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Guide PWA installation isolation", () => {
  it("launches and stays within the Guide App", () => {
    const manifest = JSON.parse(read("public/guide.webmanifest")) as Record<string, unknown>;
    expect(manifest.id).toBe("/guide");
    expect(manifest.start_url).toBe("/guide");
    expect(manifest.scope).toBe("/guide");
    expect(manifest.display).toBe("standalone");
  });

  it("keeps the public website manifest separate", () => {
    const manifest = JSON.parse(read("public/site.webmanifest")) as Record<string, unknown>;
    expect(manifest.id).toBe("/");
    expect(manifest.start_url).toBe("/?source=pwa");
    expect(manifest.scope).toBe("/");
  });

  it("emits only the Guide manifest and installer on Guide routes", () => {
    const root = read("src/routes/__root.tsx");
    const guide = read("src/routes/guide.tsx");
    expect(root).toContain('m.routeId.startsWith("/guide")');
    expect(root).toContain("!isGuideApp ? <InstallAppPrompt /> : null");
    expect(guide).toContain('{ rel: "manifest", href: "/guide.webmanifest" }');
    expect(guide).toContain('{ name: "application-name", content: "YES Guide" }');
    expect(guide).not.toContain("querySelector<HTMLLinkElement>");
  });

  it("does not let the public installer capture prompts on Guide routes", () => {
    const installer = read("src/components/InstallAppPrompt.tsx");
    expect(installer).toContain("const GUIDE_PATH = /^\\/guide(?:\\/|$)/");
    expect(installer).toContain("if (GUIDE_PATH.test(pathname))");
  });

  it("does not redirect Guide navigation through the service worker", () => {
    const worker = read("public/sw.js");
    expect(worker).toContain('if (request.mode === "navigate")');
    expect(worker).toContain("event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))");
    expect(worker).not.toMatch(/redirect\s*\([^)]*["']\/["']/);
  });

  it("clearly distinguishes an existing guide profile from first-time app access", () => {
    const guide = read("src/routes/guide.tsx");
    expect(guide).toContain("Create Guide App access");
    expect(guide).toContain("use the same email registered by the office");
    expect(guide).toContain("Your existing guide profile is not yet a sign-in account");
    expect(guide).toContain("Returning guide: use the email registered by the office");
  });
});