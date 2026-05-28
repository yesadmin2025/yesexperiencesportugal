import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";

export type RouteFileCheckResult = {
  filePath: string;
  exists: boolean;
  hasLiteralCreateFileRoute: boolean;
  literalPath: string | null;
  expectedPath: string;
  matches: boolean;
  cacheDirs: { path: string; exists: boolean }[];
  routeTreeExists: boolean;
  routeTreeContainsExpected: boolean;
};

/**
 * Dev-only diagnostic. Reads a project file by relative path to verify the
 * createFileRoute literal matches the expected path.
 *
 * Hard-gated against production AND against path traversal: the resolved
 * absolute path must remain inside process.cwd().
 */
export const checkRouteFile = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        relativeFilePath: z
          .string()
          .min(1)
          .max(300)
          .refine((p) => !p.includes("\0"), "invalid path")
          .refine(
            (p) => !p.split(/[\\/]/).includes(".."),
            "path traversal not allowed",
          ),
        expectedRoutePath: z.string().min(1).max(300),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<RouteFileCheckResult> => {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Route file check is disabled in production builds.");
    }
    const root = process.cwd();
    const abs = path.resolve(root, data.relativeFilePath);
    if (!abs.startsWith(root + path.sep) && abs !== root) {
      throw new Error("Resolved path escapes project root.");
    }
    let source = "";
    let exists = false;
    try {
      source = await fs.readFile(abs, "utf8");
      exists = true;
    } catch {
      exists = false;
    }

    // Match createFileRoute("...") with a plain string literal (single or double quotes).
    const literalMatch = source.match(
      /createFileRoute\(\s*(["'])([^"'`)]+)\1\s*\)/,
    );
    const literalPath = literalMatch ? literalMatch[2] : null;

    const cacheCandidates = [
      "node_modules/.vite",
      ".tanstack",
      "dist",
    ];
    const cacheDirs = await Promise.all(
      cacheCandidates.map(async (p) => {
        try {
          await fs.stat(path.join(root, p));
          return { path: p, exists: true };
        } catch {
          return { path: p, exists: false };
        }
      }),
    );

    let routeTreeExists = false;
    let routeTreeContainsExpected = false;
    try {
      const tree = await fs.readFile(
        path.join(root, "src/routeTree.gen.ts"),
        "utf8",
      );
      routeTreeExists = true;
      routeTreeContainsExpected = tree.includes(`'${data.expectedRoutePath}'`)
        || tree.includes(`"${data.expectedRoutePath}"`);
    } catch {
      routeTreeExists = false;
    }

    return {
      filePath: data.relativeFilePath,
      exists,
      hasLiteralCreateFileRoute: !!literalMatch,
      literalPath,
      expectedPath: data.expectedRoutePath,
      matches: literalPath === data.expectedRoutePath,
      cacheDirs,
      routeTreeExists,
      routeTreeContainsExpected,
    };
  });
