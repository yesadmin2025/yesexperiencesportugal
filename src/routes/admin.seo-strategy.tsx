/**
 * /admin/seo-strategy — phone-readable rendering of the published
 * 12-month authority strategy. The document in docs/seo is the single
 * source of truth; this route only renders it.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import doc from "../../docs/seo/authority-strategy-2026.md?raw";

export const Route = createFileRoute("/admin/seo-strategy")({
  head: () => ({
    meta: [
      { title: "SEO authority strategy — YES Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SeoStrategyPage,
});

type Block =
  | { kind: "h1" | "h2" | "h3" | "p"; text: string }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "table"; header: string[]; rows: string[][] };

/** Minimal Markdown reader for this one document: headings, lists, tables. */
function parse(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  const isTableRow = (l: string) => l.trim().startsWith("|");
  const cells = (l: string) =>
    l
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim());

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      blocks.push({ kind: "h3", text: trimmed.slice(4) });
      i += 1;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push({ kind: "h2", text: trimmed.slice(3) });
      i += 1;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      blocks.push({ kind: "h1", text: trimmed.slice(2) });
      i += 1;
      continue;
    }
    if (isTableRow(trimmed)) {
      const header = cells(trimmed);
      i += 1;
      if ((lines[i] ?? "").includes("---")) i += 1;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i] ?? "")) {
        rows.push(cells(lines[i] ?? ""));
        i += 1;
      }
      blocks.push({ kind: "table", header, rows });
      continue;
    }
    if (/^[-*] /.test(trimmed) || /^\d+\. /.test(trimmed)) {
      const ordered = /^\d+\. /.test(trimmed);
      const items: string[] = [];
      while (i < lines.length) {
        const l = (lines[i] ?? "").trim();
        if (/^[-*] /.test(l)) items.push(l.slice(2));
        else if (/^\d+\. /.test(l)) items.push(l.replace(/^\d+\.\s*/, ""));
        else if (l && items.length > 0 && (lines[i] ?? "").startsWith("  "))
          items[items.length - 1] += ` ${l}`;
        else break;
        i += 1;
      }
      blocks.push({ kind: ordered ? "ol" : "ul", items });
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length) {
      const l = (lines[i] ?? "").trim();
      if (!l || l.startsWith("#") || isTableRow(l) || /^([-*] |\d+\. )/.test(l)) break;
      paragraph.push(l);
      i += 1;
    }
    blocks.push({ kind: "p", text: paragraph.join(" ") });
  }
  return blocks;
}

/** Bold spans only — the document uses no other inline syntax. */
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, idx) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={idx} className="font-medium text-[color:var(--charcoal)]">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={idx}>{part}</span>
    ),
  );
}

function SeoStrategyPage() {
  const blocks = parse(doc);

  return (
    <SiteLayout>
      <section className="pt-28 pb-24">
        <div className="container-x max-w-3xl">
          <Link
            to="/admin"
            className="text-xs uppercase tracking-[0.16em] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
          >
            ← Admin
          </Link>

          <article className="mt-6">
            {blocks.map((b, idx) => {
              if (b.kind === "h1")
                return (
                  <h1
                    key={idx}
                    className="mt-2 font-[family-name:var(--font-editorial)] text-3xl leading-tight text-[color:var(--charcoal)]"
                  >
                    {b.text}
                  </h1>
                );
              if (b.kind === "h2")
                return (
                  <h2
                    key={idx}
                    className="mt-10 font-[family-name:var(--font-editorial)] text-xl text-[color:var(--charcoal)]"
                  >
                    {b.text}
                  </h2>
                );
              if (b.kind === "h3")
                return (
                  <h3 key={idx} className="mt-6 text-base font-semibold text-[color:var(--charcoal)]">
                    {b.text}
                  </h3>
                );
              if (b.kind === "p")
                return (
                  <p
                    key={idx}
                    className="mt-4 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]"
                  >
                    {inline(b.text)}
                  </p>
                );
              if (b.kind === "ul" || b.kind === "ol") {
                const List = b.kind === "ol" ? "ol" : "ul";
                return (
                  <List
                    key={idx}
                    className={`mt-4 space-y-2 pl-5 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)] ${
                      b.kind === "ol" ? "list-decimal" : "list-disc"
                    }`}
                  >
                    {b.items.map((item, k) => (
                      <li key={k}>{inline(item)}</li>
                    ))}
                  </List>
                );
              }
              return (
                <div key={idx} className="mt-5 overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[color:var(--border)] text-left text-[10px] uppercase tracking-[0.16em] text-[color:var(--charcoal-soft)]">
                        {b.header.map((h, k) => (
                          <th key={k} scope="col" className="py-2 pr-4 font-normal">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {b.rows.map((row, r) => (
                        <tr key={r} className="border-b border-[color:var(--border)]">
                          {row.map((cell, c) => (
                            <td
                              key={c}
                              className="py-2 pr-4 align-top text-[color:var(--charcoal-soft)]"
                            >
                              {inline(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </article>
        </div>
      </section>
    </SiteLayout>
  );
}
