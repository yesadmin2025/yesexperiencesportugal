import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { WHATSAPP_NUMBER, whatsappUrl } from "@/config/business-nap";
import { waGeneric } from "@/lib/whatsapp-messages";
import { whatsappHref } from "@/components/WhatsAppFab";

const OFFICIAL = "351911889992";
const CANONICAL = /^https:\/\/wa\.me\/351911889992(\?text=[^\s]+)?$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (!/__tests__|admin/.test(name)) walk(p, out);
    } else if (/\.(tsx?|json)$/.test(name) && !/admin|guide-brief/.test(p)) out.push(p);
  }
  return out;
}

describe("public WhatsApp links", () => {
  it("official number is canonical digits only", () => {
    expect(WHATSAPP_NUMBER).toBe(OFFICIAL);
  });

  it("builders produce non-empty canonical wa.me URLs", () => {
    for (const url of [whatsappUrl(), whatsappUrl("Hi YES"), whatsappHref(waGeneric())]) {
      expect(url).toMatch(CANONICAL);
    }
  });

  it("no hard-coded public wa.me / whatsapp link uses another number or malformed form", () => {
    const bad: string[] = [];
    for (const file of walk(join(process.cwd(), "src"))) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?([^"'`?\s)}$]*)/g)) {
        const target = m[1];
        if (target && target !== OFFICIAL) bad.push(`${file}: ${m[0]}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
