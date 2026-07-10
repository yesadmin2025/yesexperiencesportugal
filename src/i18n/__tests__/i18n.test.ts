/**
 * Unit tests for i18n primitives.
 *
 * Phase 2: LOCALES trimmed to en + pt. Spanish removed as a website
 * locale (still permitted as an optional tour language).
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALES,
  buildLocaleUrl,
  parseLocaleFromPath,
  localePrefix,
} from "@/i18n/config";
import { buildI18nHead } from "@/i18n/seo";
import { getDictionary, translate } from "@/i18n/dictionaries";

describe("i18n / config", () => {
  it("only ships en + pt", () => {
    expect([...LOCALES].sort()).toEqual(["en", "pt"]);
  });

  it("parses locale from /pt paths", () => {
    expect(parseLocaleFromPath("/pt/tours/sintra")).toEqual({
      locale: "pt",
      path: "/tours/sintra",
    });
    expect(parseLocaleFromPath("/pt")).toEqual({ locale: "pt", path: "/" });
  });

  it("treats unprefixed and unknown-prefix paths as EN", () => {
    expect(parseLocaleFromPath("/")).toEqual({ locale: "en", path: "/" });
    expect(parseLocaleFromPath("/about")).toEqual({ locale: "en", path: "/about" });
    // /es is no longer a website locale — must resolve as EN /es/about.
    expect(parseLocaleFromPath("/es/about")).toEqual({ locale: "en", path: "/es/about" });
  });

  it("emits no prefix for EN, /pt for PT", () => {
    expect(localePrefix("en")).toBe("");
    expect(localePrefix("pt")).toBe("/pt");
  });

  it("builds locale-aware absolute URLs", () => {
    expect(buildLocaleUrl("/about", "en")).toBe("https://yesexperiencesportugal.com/about");
    expect(buildLocaleUrl("/about", "pt")).toBe("https://yesexperiencesportugal.com/pt/about");
    expect(buildLocaleUrl("/", "pt")).toBe("https://yesexperiencesportugal.com/pt");
  });
});

describe("i18n / seo", () => {
  it("emits self-canonical + all hreflang alternates + x-default", () => {
    const out = buildI18nHead({ path: "/about", locale: "pt" });
    const canonical = out.links.find((l) => l.rel === "canonical");
    expect(canonical?.href).toBe("https://yesexperiencesportugal.com/pt/about");

    const alternates = out.links.filter((l) => l.rel === "alternate");
    // 2 locales + x-default = 3
    expect(alternates).toHaveLength(3);
    expect(alternates.map((a) => a.hrefLang).sort()).toEqual(["en", "pt-PT", "x-default"].sort());

    const enAlt = alternates.find((a) => a.hrefLang === "en");
    expect(enAlt?.href).toBe("https://yesexperiencesportugal.com/about");
  });

  it("emits og:locale + og:locale:alternate for siblings", () => {
    const { meta } = buildI18nHead({ path: "/", locale: "pt" });
    expect(meta.find((m) => m.property === "og:locale")?.content).toBe("pt_PT");
    const alts = meta.filter((m) => m.property === "og:locale:alternate").map((m) => m.content);
    expect(alts).toEqual(["en_US"]);
  });
});

describe("i18n / dictionaries", () => {
  it("falls back to EN when locale key missing", () => {
    const pt = getDictionary("pt");
    // Until copy is supplied per key, PT falls back to EN silently.
    expect(translate(pt, "nav.studio")).toBe("Studio");
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
