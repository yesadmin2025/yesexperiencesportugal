import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  auditJsonLd,
  type PageAudit,
  type ProductAudit,
  type JsonLdBlock,
} from "@/lib/jsonld-audit.functions";

export const Route = createFileRoute("/admin/seo-jsonld")({
  head: () => ({
    meta: [
      { title: "SEO JSON-LD Audit — YES Experiences" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SeoJsonLdPage,
});

function Dot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`}
    />
  );
}

function ProductBlock({ p }: { p: ProductAudit }) {
  const failing = p.checks.filter((c) => !c.ok).length;
  return (
    <div className="border border-[color:var(--sand)] bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-sm font-medium text-[color:var(--charcoal)] truncate">
          {p.productName}
        </div>
        <span
          className={`text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border ${
            failing === 0
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}
        >
          {failing === 0 ? "Pass" : `${failing} fail`}
        </span>
      </div>
      <ul className="space-y-1">
        {p.checks.map((c, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <span className="mt-1">
              <Dot ok={c.ok} />
            </span>
            <div className="flex-1">
              <code className="text-[color:var(--charcoal)]">{c.rule}</code>
              {c.detail ? (
                <div className="text-[11px] text-[color:var(--charcoal-soft)]">{c.detail}</div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RawBlock({ block }: { block: JsonLdBlock }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(block.raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="border border-[color:var(--sand)] bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
            Block #{block.index + 1}
          </span>
          <span className="text-xs text-[color:var(--charcoal)] truncate">
            {block.parseError ? "parse error" : block.types.join(", ") || "—"}
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--teal)]">
          {open ? "Hide" : "View JSON"}
        </span>
      </button>
      {open ? (
        <div className="border-t border-[color:var(--sand)]">
          {block.parseError ? (
            <div className="text-xs text-rose-700 bg-rose-50 px-3 py-2">{block.parseError}</div>
          ) : null}
          <div className="flex justify-end px-2 pt-2">
            <button
              type="button"
              onClick={copy}
              className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--teal)]"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="text-[11px] leading-snug text-[color:var(--charcoal)] px-3 pb-3 pt-1 overflow-auto max-h-[420px]">
            {block.raw}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function PageCard({ page }: { page: PageAudit }) {
  const [showRaw, setShowRaw] = useState(false);
  const failing = page.products.flatMap((p) =>
    p.checks
      .filter((c) => !c.ok)
      .map((c) => ({ productName: p.productName, rule: c.rule, detail: c.detail })),
  );
  return (
    <section className="border border-[color:var(--sand)] bg-[color:var(--ivory)] p-4">
      <header className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Dot ok={page.pass} />
            <code className="text-sm text-[color:var(--charcoal)] truncate">{page.path}</code>
          </div>
          <a
            href={page.url}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-[color:var(--teal)] underline"
          >
            {page.url}
          </a>
        </div>
        <div className="text-right text-[11px] text-[color:var(--charcoal-soft)] shrink-0">
          <div>HTTP {page.status ?? "—"}</div>
          <div>{page.jsonLdBlocks} JSON-LD block(s)</div>
        </div>
      </header>
      {page.error ? (
        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2">
          {page.error}
        </div>
      ) : (
        <>
          {failing.length > 0 ? (
            <div className="mb-3 border border-rose-200 bg-rose-50 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-rose-700 mb-1">
                {failing.length} failing rule{failing.length === 1 ? "" : "s"}
              </div>
              <ul className="space-y-1">
                {failing.map((f, i) => (
                  <li key={i} className="text-xs text-rose-800">
                    <span className="text-[color:var(--charcoal-soft)]">{f.productName} · </span>
                    <code>{f.rule}</code>
                    {f.detail ? <span className="text-rose-700"> — {f.detail}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {page.products.length === 0 ? (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 mb-3">
              No Product JSON-LD detected on this page.
            </div>
          ) : (
            <div className="grid gap-3 mb-3">
              {page.products.map((p, i) => (
                <ProductBlock key={i} p={p} />
              ))}
            </div>
          )}
          {page.blocks.length > 0 ? (
            <div>
              <button
                type="button"
                onClick={() => setShowRaw((s) => !s)}
                className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--teal)]"
              >
                {showRaw ? "Hide" : "Show"} extracted JSON-LD ({page.blocks.length})
              </button>
              {showRaw ? (
                <div className="grid gap-2 mt-2">
                  {page.blocks.map((b) => (
                    <RawBlock key={b.index} block={b} />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function SeoJsonLdPage() {
  const run = useServerFn(auditJsonLd);
  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["seo-jsonld-audit"],
    queryFn: () => run(),
    staleTime: 60_000,
  });

  const passCount = data?.pages.filter((p) => p.pass).length ?? 0;
  const total = data?.pages.length ?? 0;

  return (
    <div className="min-h-screen bg-[color:var(--sand)]/40">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <header className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-semibold text-[color:var(--charcoal)]">
              SEO JSON-LD Audit
            </h1>
            <p className="text-sm text-[color:var(--charcoal-soft)] mt-1">
              Re-validates the Rich Results / Merchant listings rules on every affected landing
              route.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[color:var(--charcoal-soft)]">
              {total > 0 ? `${passCount}/${total} passing` : ""}
            </span>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-xs uppercase tracking-[0.18em] border border-[color:var(--charcoal)] px-3 py-2 hover:bg-[color:var(--charcoal)] hover:text-[color:var(--ivory)] transition-colors disabled:opacity-50"
            >
              {isFetching ? "Checking…" : "Re-check"}
            </button>
          </div>
        </header>

        {error ? (
          <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 px-4 py-3 mb-4">
            {(error as Error).message}
          </div>
        ) : null}

        {data ? (
          <>
            <div className="text-[11px] text-[color:var(--charcoal-soft)] mb-4">
              Checked {new Date(data.checkedAt).toLocaleString()} · Origin{" "}
              <code>{data.origin}</code>
            </div>
            <div className="grid gap-4">
              {data.pages.map((page) => (
                <PageCard key={page.path} page={page} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-sm text-[color:var(--charcoal-soft)]">Running first audit…</div>
        )}
      </div>
    </div>
  );
}
