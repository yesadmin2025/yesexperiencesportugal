import { describe, it, expect } from "vitest";
import { buildCacheKey, pickAcceptVariant, ALLOWED_EXT, ALLOWED_HOSTS } from "@/routes/api/img";

const u = (path = "/wp-content/uploads/photo.jpg") => new URL(`https://yesexperiences.pt${path}`);

describe("pickAcceptVariant", () => {
  it("picks avif when supported", () => {
    expect(pickAcceptVariant("image/avif,image/webp,*/*")).toBe("avif");
  });
  it("picks webp when avif missing", () => {
    expect(pickAcceptVariant("image/webp,image/*,*/*;q=0.8")).toBe("webp");
  });
  it("falls back to jpeg", () => {
    expect(pickAcceptVariant("image/*,*/*;q=0.8")).toBe("jpeg");
    expect(pickAcceptVariant(null)).toBe("jpeg");
    expect(pickAcceptVariant(undefined)).toBe("jpeg");
  });
});

describe("buildCacheKey", () => {
  it("differs across Accept variants for the same URL/width", () => {
    const a = buildCacheKey({ upstream: u(), width: 800, accept: "image/avif" });
    const w = buildCacheKey({ upstream: u(), width: 800, accept: "image/webp" });
    const j = buildCacheKey({ upstream: u(), width: 800, accept: "image/*" });
    expect(new Set([a, w, j]).size).toBe(3);
    expect(a).toContain("v=avif");
    expect(w).toContain("v=webp");
    expect(j).toContain("v=jpeg");
  });

  it("quantises width so near-identical sizes share a key", () => {
    const a = buildCacheKey({ upstream: u(), width: 401, accept: "image/avif" });
    const b = buildCacheKey({ upstream: u(), width: 412, accept: "image/avif" });
    const c = buildCacheKey({ upstream: u(), width: 480, accept: "image/avif" });
    expect(a).toBe(b);
    expect(a).toBe(c);
    expect(a).toContain("w=480");
  });

  it("quantises quality to allowed buckets", () => {
    const k1 = buildCacheKey({ upstream: u(), quality: 70, accept: "image/avif" });
    const k2 = buildCacheKey({ upstream: u(), quality: 75, accept: "image/avif" });
    const k3 = buildCacheKey({ upstream: u(), quality: 90, accept: "image/avif" });
    expect(k1).toBe(k2);
    expect(k1).toContain("q=75");
    expect(k3).toContain("q=85");
  });

  it("differs across widths above the bucket boundary", () => {
    const small = buildCacheKey({ upstream: u(), width: 320, accept: "image/avif" });
    const big = buildCacheKey({ upstream: u(), width: 1200, accept: "image/avif" });
    expect(small).not.toBe(big);
  });

  it("normalises hostname casing", () => {
    const lower = buildCacheKey({
      upstream: new URL("https://yesexperiences.pt/a.jpg"),
      width: 800,
      accept: "image/avif",
    });
    const upper = buildCacheKey({
      upstream: new URL("https://YESEXPERIENCES.PT/a.jpg"),
      width: 800,
      accept: "image/avif",
    });
    expect(lower).toBe(upper);
  });

  it("treats missing width/quality as 0 in the key", () => {
    const k = buildCacheKey({ upstream: u(), accept: "image/avif" });
    expect(k).toContain("w=0");
    expect(k).toContain("q=0");
  });

  it("preserves path differences across keys", () => {
    const k1 = buildCacheKey({ upstream: u("/a.jpg"), accept: "image/avif" });
    const k2 = buildCacheKey({ upstream: u("/b.jpg"), accept: "image/avif" });
    expect(k1).not.toBe(k2);
  });
});

describe("allowlists", () => {
  it("allows expected hosts only", () => {
    expect(ALLOWED_HOSTS.has("yesexperiences.pt")).toBe(true);
    expect(ALLOWED_HOSTS.has("evil.example.com")).toBe(false);
  });
  it("allows expected image extensions", () => {
    for (const ext of [".jpg", ".jpeg", ".png", ".webp", ".avif"]) {
      expect(ALLOWED_EXT.test(`/path/file${ext}`)).toBe(true);
    }
    expect(ALLOWED_EXT.test("/path/file.svg")).toBe(false);
    expect(ALLOWED_EXT.test("/path/file.gif")).toBe(false);
  });
});
