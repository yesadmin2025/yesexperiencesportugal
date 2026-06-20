/**
 * Tests for the Builder Images ingestion pipeline.
 *
 * The Builder admin "uploads" Viator tour URLs; the server then *processes*
 * each page: scrapes the HTML, extracts real photo URLs, de-dupes, drops
 * thumbnails/icons, and persists rows to experience_images.
 *
 * These tests target the pure, deterministic part of that pipeline —
 * `extractImageUrlsFromHtml` — which is the only piece that can be tested
 * without mocking Firecrawl + Supabase end-to-end.
 *
 * What we cover:
 *  - matches Viator/TripAdvisor/CloudFront jpg/png/webp URLs
 *  - rejects unrelated domains and unsupported extensions
 *  - de-duplicates repeated URLs (case-sensitive — matches current contract)
 *  - drops thumbnails: small / thumb / icon / logo / sprite / avatar
 *  - decodes HTML-escaped &amp; into & in query strings
 *  - is robust against empty / whitespace / malformed HTML inputs
 *  - preserves source order (first occurrence wins after dedupe)
 *  - respects query strings on URLs (kept verbatim)
 */

import { describe, it, expect } from "vitest";
import { extractImageUrlsFromHtml } from "@/lib/builderImages.server";

describe("extractImageUrlsFromHtml — happy path", () => {
  it("extracts a single Viator jpg URL from minimal HTML", () => {
    const html = `<img src="https://cache.viator.com/tours/abc.jpg" />`;
    expect(extractImageUrlsFromHtml(html)).toEqual(["https://cache.viator.com/tours/abc.jpg"]);
  });

  it("extracts multiple distinct URLs preserving source order", () => {
    const html = `
      <img src="https://cache.viator.com/tours/a.jpg" />
      <img src="https://media.tacdn.com/tripadvisor/b.png" />
      <img src="https://d1234.cloudfront.net/c.webp" />
    `;
    expect(extractImageUrlsFromHtml(html)).toEqual([
      "https://cache.viator.com/tours/a.jpg",
      "https://media.tacdn.com/tripadvisor/b.png",
      "https://d1234.cloudfront.net/c.webp",
    ]);
  });

  it("accepts jpeg, jpg, png, and webp extensions", () => {
    const html = [
      `https://cache.viator.com/x1.jpg`,
      `https://cache.viator.com/x2.jpeg`,
      `https://cache.viator.com/x3.png`,
      `https://cache.viator.com/x4.webp`,
    ].join(" ");
    const urls = extractImageUrlsFromHtml(html);
    expect(urls).toHaveLength(4);
    expect(urls.every((u) => /\.(jpe?g|png|webp)/.test(u))).toBe(true);
  });

  it("preserves query strings on extracted URLs", () => {
    const html = `<img src="https://cache.viator.com/p.jpg?w=1200&q=80" />`;
    expect(extractImageUrlsFromHtml(html)).toEqual(["https://cache.viator.com/p.jpg?w=1200&q=80"]);
  });

  it("decodes HTML-escaped &amp; into & inside query strings", () => {
    const html = `<img src="https://cache.viator.com/p.jpg?w=1200&amp;q=80&amp;v=2" />`;
    expect(extractImageUrlsFromHtml(html)).toEqual([
      "https://cache.viator.com/p.jpg?w=1200&q=80&v=2",
    ]);
  });
});

describe("extractImageUrlsFromHtml — filtering & dedupe", () => {
  it("de-duplicates identical URLs, keeping the first occurrence", () => {
    const html = `
      <img src="https://cache.viator.com/dup.jpg" />
      <a href="https://cache.viator.com/dup.jpg">link</a>
      <img src="https://cache.viator.com/dup.jpg" />
    `;
    expect(extractImageUrlsFromHtml(html)).toEqual(["https://cache.viator.com/dup.jpg"]);
  });

  it("drops thumbnail/small/icon/logo/sprite/avatar variants", () => {
    const html = `
      https://cache.viator.com/__small/hero.jpg
      https://cache.viator.com/__thumb/hero.jpg
      https://cache.viator.com/icons/star.png
      https://cache.viator.com/logo-header.png
      https://cache.viator.com/sprite-buttons.png
      https://cache.viator.com/avatar-guide.jpg
      https://cache.viator.com/full/hero.jpg
    `;
    expect(extractImageUrlsFromHtml(html)).toEqual(["https://cache.viator.com/full/hero.jpg"]);
  });

  it("filter is case-insensitive (THUMB, Logo, ICON all dropped)", () => {
    const html = `
      https://cache.viator.com/THUMB/x.jpg
      https://cache.viator.com/Logo.png
      https://cache.viator.com/ICON-set.webp
      https://cache.viator.com/keep.jpg
    `;
    expect(extractImageUrlsFromHtml(html)).toEqual(["https://cache.viator.com/keep.jpg"]);
  });

  it("ignores non-allowed domains entirely", () => {
    const html = `
      <img src="https://example.com/photo.jpg" />
      <img src="https://images.unsplash.com/x.jpg" />
      <img src="https://cache.viator.com/keep.jpg" />
    `;
    expect(extractImageUrlsFromHtml(html)).toEqual(["https://cache.viator.com/keep.jpg"]);
  });

  it("ignores unsupported extensions (gif, svg, bmp, mp4)", () => {
    const html = `
      https://cache.viator.com/anim.gif
      https://cache.viator.com/icon.svg
      https://cache.viator.com/old.bmp
      https://cache.viator.com/video.mp4
      https://cache.viator.com/real.jpg
    `;
    expect(extractImageUrlsFromHtml(html)).toEqual(["https://cache.viator.com/real.jpg"]);
  });

  it("dedupe is case-sensitive: differently-cased URLs are kept as separate entries", () => {
    // Documents current behaviour; if we ever lowercase before dedupe,
    // update this test deliberately.
    const html = `
      https://cache.viator.com/Photo.jpg
      https://cache.viator.com/photo.jpg
    `;
    const urls = extractImageUrlsFromHtml(html);
    expect(urls).toHaveLength(2);
    expect(urls).toContain("https://cache.viator.com/Photo.jpg");
    expect(urls).toContain("https://cache.viator.com/photo.jpg");
  });
});

describe("extractImageUrlsFromHtml — robustness", () => {
  it("returns [] for empty string", () => {
    expect(extractImageUrlsFromHtml("")).toEqual([]);
  });

  it("returns [] for whitespace-only HTML", () => {
    expect(extractImageUrlsFromHtml("   \n\t  ")).toEqual([]);
  });

  it("returns [] when no image URLs are present", () => {
    const html = `<html><body><p>No images here.</p></body></html>`;
    expect(extractImageUrlsFromHtml(html)).toEqual([]);
  });

  it("does not throw on malformed / unbalanced HTML", () => {
    const html = `<img src="https://cache.viator.com/x.jpg" <<< broken>`;
    expect(() => extractImageUrlsFromHtml(html)).not.toThrow();
    expect(extractImageUrlsFromHtml(html)).toContain("https://cache.viator.com/x.jpg");
  });

  it("handles a large batch (50 URLs) and de-dupes correctly", () => {
    const parts: string[] = [];
    for (let i = 0; i < 25; i++) {
      parts.push(`https://cache.viator.com/full/p${i}.jpg`);
      // Add a duplicate of every URL — final length must be 25.
      parts.push(`https://cache.viator.com/full/p${i}.jpg`);
    }
    const urls = extractImageUrlsFromHtml(parts.join("\n"));
    expect(urls).toHaveLength(25);
    // Order preserved: p0 first, p24 last.
    expect(urls[0]).toBe("https://cache.viator.com/full/p0.jpg");
    expect(urls[24]).toBe("https://cache.viator.com/full/p24.jpg");
  });

  it("matches URLs that appear inline in JSON blobs / inline scripts", () => {
    const html = `
      <script>window.__DATA__ = {"hero":"https://cache.viator.com/hero.jpg","alt":"https://d1.cloudfront.net/b.webp"}</script>
    `;
    const urls = extractImageUrlsFromHtml(html);
    expect(urls).toContain("https://cache.viator.com/hero.jpg");
    expect(urls).toContain("https://d1.cloudfront.net/b.webp");
  });
});
