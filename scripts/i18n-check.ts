/**
 * i18n drift check — flags missing or orphaned keys between locales.
 *
 * Usage:  bun run scripts/i18n-check.ts
 *
 * Exit code 0 always (warnings, not errors) so it never blocks a deploy.
 * Use in CI for visibility, not as a gate.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "src/content/i18n");
const LOCALES = ["en", "es", "pt"] as const;

function loadLocale(locale: string): Record<string, Record<string, string>> {
  const dir = join(ROOT, locale);
  const out: Record<string, Record<string, string>> = {};
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const ns = file.replace(/\.json$/, "");
    out[ns] = JSON.parse(readFileSync(join(dir, file), "utf8"));
  }
  return out;
}

function main() {
  const data = Object.fromEntries(LOCALES.map((l) => [l, loadLocale(l)]));
  const en = data.en;
  let warnings = 0;

  for (const locale of LOCALES) {
    if (locale === "en") continue;
    const dict = data[locale];
    for (const ns of Object.keys(en)) {
      const enKeys = Object.keys(en[ns]);
      const locKeys = new Set(Object.keys(dict[ns] ?? {}));
      const missing = enKeys.filter((k) => !locKeys.has(k));
      const orphan = [...locKeys].filter((k) => !enKeys.includes(k));
      if (missing.length) {
        console.warn(`[i18n] ${locale}/${ns}: ${missing.length} missing key(s):`, missing);
        warnings += missing.length;
      }
      if (orphan.length) {
        console.warn(`[i18n] ${locale}/${ns}: ${orphan.length} orphan key(s):`, orphan);
        warnings += orphan.length;
      }
    }
  }
  if (warnings === 0) {
    console.log("[i18n] OK — all locales aligned.");
  } else {
    console.log(`[i18n] ${warnings} warning(s). Site falls back to EN for missing keys.`);
  }
}

main();
