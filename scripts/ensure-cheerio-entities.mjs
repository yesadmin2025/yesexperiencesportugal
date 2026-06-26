#!/usr/bin/env node
// Ensures cheerio's nested htmlparser2 has its own entities@7 copy.
// Required because the workspace-wide `entities` override pins v4.5.0 (for
// React Email's htmlparser2), but cheerio's htmlparser2 expects v7's
// `./decode` and `./escape` subpath exports. Without this, vite config
// fails to load at build time.
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const target = path.resolve(
  "node_modules/cheerio/node_modules/htmlparser2/node_modules/entities",
);

if (existsSync(path.join(target, "decode.js"))) {
  process.exit(0);
}

try {
  mkdirSync(target, { recursive: true });
  const tmp = path.resolve("node_modules/.tmp-entities");
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  execSync("npm pack entities@7.0.1 --silent", { cwd: tmp, stdio: "inherit" });
  execSync(
    `tar -xzf ${path.join(tmp, "entities-7.0.1.tgz")} --strip-components=1 -C ${target}`,
    { stdio: "inherit" },
  );
  rmSync(tmp, { recursive: true, force: true });
  console.log("[ensure-cheerio-entities] installed entities@7 into cheerio/htmlparser2");
} catch (err) {
  console.warn("[ensure-cheerio-entities] skipped:", err?.message ?? err);
}
