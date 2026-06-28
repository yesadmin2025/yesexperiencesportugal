import { createServerFn } from "@tanstack/react-start";

export type SeoAuditIssue = {
  level: "critical" | "warn";
  message: string;
};

export type SeoAuditResult = {
  url: string;
  ok: boolean;
  status?: number;
  title?: string;
  titleLength?: number;
  description?: string;
  descriptionLength?: number;
  canonical?: string;
  h1Count?: number;
  jsonLdBlocks?: number;
  robotsMeta?: string;
  ogTitle?: string;
  ogImage?: string;
  issues: SeoAuditIssue[];
  error?: string;
};

function pick(html: string, re: RegExp): string | undefined {
  const m = html.match(re);
  return m ? m[1].trim() : undefined;
}

function auditHtml(url: string, status: number, html: string): SeoAuditResult {
  const title = pick(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = pick(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
  );
  const canonical = pick(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);
  const robotsMeta = pick(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i);
  const ogTitle = pick(
    html,
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i,
  );
  const ogImage = pick(
    html,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i,
  );
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  const jsonLdBlocks = (html.match(/<script[^>]+type=["']application\/ld\+json["']/gi) || [])
    .length;

  const issues: SeoAuditIssue[] = [];
  if (status >= 400) issues.push({ level: "critical", message: `HTTP ${status}` });
  if (!title) issues.push({ level: "critical", message: "Sem <title>" });
  else if (title.length < 15 || title.length > 65)
    issues.push({ level: "warn", message: `Título com ${title.length} chars (ideal 30–60)` });
  if (!description) issues.push({ level: "critical", message: "Sem meta description" });
  else if (description.length < 70 || description.length > 170)
    issues.push({
      level: "warn",
      message: `Description com ${description.length} chars (ideal 120–160)`,
    });
  if (!canonical) issues.push({ level: "critical", message: "Sem canonical" });
  if (h1Count === 0) issues.push({ level: "critical", message: "Sem H1" });
  else if (h1Count > 1) issues.push({ level: "warn", message: `${h1Count} H1s na página` });
  if (jsonLdBlocks === 0) issues.push({ level: "warn", message: "Sem JSON-LD" });
  if (robotsMeta && /noindex/i.test(robotsMeta))
    issues.push({ level: "critical", message: `robots: ${robotsMeta}` });
  if (!ogTitle) issues.push({ level: "warn", message: "Sem og:title" });
  if (!ogImage) issues.push({ level: "warn", message: "Sem og:image" });

  return {
    url,
    ok: true,
    status,
    title,
    titleLength: title?.length,
    description,
    descriptionLength: description?.length,
    canonical,
    h1Count,
    jsonLdBlocks,
    robotsMeta,
    ogTitle,
    ogImage,
    issues,
  };
}

async function auditOne(url: string): Promise<SeoAuditResult> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "YESExperiencesSEOAuditBot/1.0" },
      redirect: "follow",
    });
    const html = await res.text();
    return auditHtml(url, res.status, html);
  } catch (e) {
    return {
      url,
      ok: false,
      issues: [{ level: "critical", message: "Fetch falhou" }],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export const auditSeoUrls = createServerFn({ method: "POST" })
  .inputValidator((input: { urls: string[] }) => {
    if (!input || !Array.isArray(input.urls)) throw new Error("urls must be an array");
    const urls = input.urls
      .filter((u) => typeof u === "string" && /^https?:\/\//i.test(u))
      .slice(0, 25);
    return { urls };
  })
  .handler(async ({ data }): Promise<{ results: SeoAuditResult[] }> => {
    const results = await Promise.all(data.urls.map(auditOne));
    return { results };
  });
