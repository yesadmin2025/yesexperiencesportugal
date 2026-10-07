import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { organizationLd, websiteLd } from "@/lib/jsonld";

/** Owner rule: the official brand is "YES Experiences Portugal" — never "YES!". */
function walk(dir: string, out: string[] = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (f === "__tests__" || f === "generated") continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|json|txt|html)$/.test(f) && !/\.test\./.test(f)) out.push(p);
  }
  return out;
}

describe("brand spelling", () => {
  it("public source never spells the brand with an exclamation mark", () => {
    const hits = [...walk("src"), ...walk("public")].filter((p) =>
      /YES!\s*E(xperiences|XPERIENCES)/.test(readFileSync(p, "utf8")),
    );
    expect(hits).toEqual([]);
  });
  it("entity name is canonical", () => {
    expect(organizationLd().name).toBe("YES Experiences Portugal");
    expect(websiteLd().name).toBe("YES Experiences Portugal");
  });
});
