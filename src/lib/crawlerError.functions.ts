import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { promises as fs } from "fs";

export type CrawlerErrorInfo = {
  found: boolean;
  message: string | null;
  file: string | null;
  line: number | null;
  column: number | null;
  source: string | null;
  capturedAt: string;
  raw: string | null;
};

const LOG_PATHS = [
  "/tmp/dev-server-logs/dev-server.log",
];

// Strip ANSI color codes so regex matching is reliable.
function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

async function readLogTail(): Promise<string | null> {
  for (const p of LOG_PATHS) {
    try {
      const buf = await fs.readFile(p, "utf8");
      // Keep only the tail to avoid huge payloads.
      const tail = buf.length > 200_000 ? buf.slice(-200_000) : buf;
      return stripAnsi(tail);
    } catch {
      /* try next */
    }
  }
  return null;
}

export type CrawlerErrorStrategy = "root-cause" | "last-error";

export const getLastCrawlerError = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { strategy?: CrawlerErrorStrategy; _ts?: number } | undefined) => ({
      strategy: (data?.strategy ?? "root-cause") as CrawlerErrorStrategy,
    }),
  )
  .handler(async ({ data }): Promise<CrawlerErrorInfo> => {
    // Production guard: this endpoint reads server log tails and is for
    // local dev / preview debugging only. Match the guard used by sibling
    // dev-only server functions (checkRouteFile, auditTourLinks).
    if (process.env.NODE_ENV === "production") {
      throw new Error("Disabled in production.");
    }
    // Disable any caching so reloads always re-scan the log.
    setResponseHeaders(
      new Headers({
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      }),
    );
    const { strategy } = data;
    const log = await readLogTail();
    if (!log) {
      return {
        found: false,
        message: null,
        file: null,
        line: null,
        column: null,
        source: null,
        capturedAt: new Date().toISOString(),
        raw: null,
      };
    }

    const lines = log.split("\n");

    // Patterns that indicate a TanStack route crawler / Vite build error.
    // Ordered by usefulness so root-cause build errors beat follow-on overlay noise.
    const rootCauseMarkers = [
      /Error transforming route file/i,
      /expected route id to be a string literal/i,
      /@import must precede all other statements/i,
    ];
    const errorMarkers = [
      ...rootCauseMarkers,
      /router-generator-plugin/i,
      /start-router-plugin/i,
      /\[tanstack[^\]]*\]/i,
      /Crawling result not available/i,
      /Failed to (?:resolve|parse|crawl)/i,
      /Transform failed/i,
      /Pre-transform error/i,
      /\bSyntaxError\b/,
      /\berror TS\d+/,
      /\[plugin:[^\]]+\]/i,
    ];

    // File:line:col pattern (absolute or relative path ending in source ext).
    const fileLineRe =
      /([\/\\w.\-@]+\.(?:tsx?|jsx?|mts|cts|mjs|cjs))(?::(\d+))(?::(\d+))?/;

    let lastIdx = -1;
    let matchedSource: string | null = null;
    const findLast = (markers: RegExp[]) => {
      for (let i = lines.length - 1; i >= 0; i--) {
        const ln = lines[i];
        for (const re of markers) {
          if (re.test(ln)) return { index: i, source: re.source };
        }
      }
      return null;
    };
    const rootCause = findLast(rootCauseMarkers);
    const lastErr = findLast(errorMarkers);
    const match = strategy === "last-error" ? (lastErr ?? rootCause) : (rootCause ?? lastErr);
    if (match) {
      lastIdx = match.index;
      matchedSource = match.source;
    }

    if (lastIdx === -1) {
      return {
        found: false,
        message: null,
        file: null,
        line: null,
        column: null,
        source: null,
        capturedAt: new Date().toISOString(),
        raw: null,
      };
    }

    // Capture the error block: a few lines before for context, up to 25 after.
    const start = Math.max(0, lastIdx - 2);
    const end = Math.min(lines.length, lastIdx + 25);
    const block = lines.slice(start, end).join("\n").trim();

    // Search the block for first file:line[:col] reference.
    let file: string | null = null;
    let line: number | null = null;
    let column: number | null = null;
    const fileMatch = block.match(fileLineRe);
    if (fileMatch) {
      file = fileMatch[1];
      line = fileMatch[2] ? Number(fileMatch[2]) : null;
      column = fileMatch[3] ? Number(fileMatch[3]) : null;
      if (file.startsWith("/dev-server/")) {
        file = file.slice("/dev-server/".length);
      }
    }

    const message = lines[lastIdx].trim();

    return {
      found: true,
      message,
      file,
      line,
      column,
      source: matchedSource,
      capturedAt: new Date().toISOString(),
      raw: block,
    };
  });
