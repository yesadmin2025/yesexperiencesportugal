/**
 * Unit tests for i18n primitives.
 *
 * Locks the contracts that A2 + B + C will depend on:
 *  - locale parsing from URL,
 *  - hreflang/canonical generation,
 *  - dictionary fallback to EN.
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_LOCALE,
  buildLocaleUrl,
  parseLocaleFromPath,
  localePrefix,
} from "@/i18n/config";
import { buildI18nHead } from "@/i18n/seo";
import { getDictionary, translate } from "@/i18n/dictionaries";

describe("i18n / config", () => {
  it("parses locale from /es and /pt paths", () => {
    expect(parseLocaleFromPath("/es/about")).toEqual({ locale: "es", path: "/about" });
    expect(parseLocaleFromPath("/pt/tours/sintra")).toEqual({
      locale: "pt",
      path: "/tours/sintra",
    });
    expect(parseLocaleFromPath("/es")).toEqual({ locale: "es", path: "/" });
  });

  it("treats unprefixed paths as EN", () => {
    expect(parseLocaleFromPath("/")).toEqual({ locale: "en", path: "/" });
    expect(parseLocaleFromPath("/about")).toEqual({ locale: "en", path: "/about" });
  });

  it("emits no prefix for EN, /es or /pt otherwise", () => {
    expect(localePrefix("en")).toBe("");
    expect(localePrefix("es")).toBe("/es");
    expect(localePrefix("pt")).toBe("/pt");
  });

  it("builds locale-aware absolute URLs", () => {
    expect(buildLocaleUrl("/about", "en")).toBe(
      "https://yesexperiencesportugal.com/about",
    );
    expect(buildLocaleUrl("/about", "es")).toBe(
      "https://yesexperiencesportugal.com/es/about",
    );
    expect(buildLocaleUrl("/", "pt")).toBe("https://yesexperiencesportugal.com/pt");
  });
});

describe("i18n / seo", () => {
  it("emits self-canonical + all hreflang alternates + x-default", () => {
    const out = buildI18nHead({ path: "/about", locale: "es" });
    const canonical = out.links.find((l) => l.rel === "canonical");
    expect(canonical?.href).toBe("https://yesexperiencesportugal.com/es/about");

    const alternates = out.links.filter((l) => l.rel === "alternate");
    // 3 locales + x-default = 4
    expect(alternates).toHaveLength(4);
    expect(alternates.map((a) => a.hrefLang).sort()).toEqual(
      ["en", "es-ES", "pt-PT", "x-default"].sort(),
    );

    const enAlt = alternates.find((a) => a.hrefLang === "en");
    expect(enAlt?.href).toBe("https://yesexperiencesportugal.com/about");
  });

  it("emits og:locale + og:locale:alternate for siblings", () => {
    const { meta } = buildI18nHead({ path: "/", locale: "pt" });
    expect(meta.find((m) => m.property === "og:locale")?.content).toBe("pt_PT");
    const alts = meta.filter((m) => m.property === "og:locale:alternate").map((m) => m.content);
    expect(alts.sort()).toEqual(["en_US", "es_ES"]);
  });
});

describe("i18n / dictionaries", () => {
  it("falls back to EN when locale key missing", () => {
    const es = getDictionary("es");
    // Until copy is supplied, ES dict mirrors EN — both should return the EN value.
    expect(translate(es, "nav.studio")).toBe("Studio");
  });

  it("returns the key itself when no translation exists", () => {
    const en = getDictionary(DEFAULT_LOCALE);
    expect(translate(en, "nonexistent.key.zzz")).toBe("nonexistent.key.zzz");
  });

  it("interpolates {placeholder} variables", () => {
    const en = { greeting: "Hello {name}, you have {count} bookings" };
    expect(translate(en, "greeting", { name: "Ana", count: 3 })).toBe(
      "Hello Ana, you have 3 bookings",
    );
  });
});
