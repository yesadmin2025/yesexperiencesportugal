import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { HASH_ALIASES, performJump, resolveTarget, type CheckItem } from "@/lib/preview-check-jump";

// Re-export for backward compatibility / tests that import from the route.
// eslint-disable-next-line react-refresh/only-export-components
export { HASH_ALIASES, resolveTarget, performJump };
export type { CheckItem };

export const Route = createFileRoute("/preview-check")({
  head: () => ({
    meta: [
      { title: "Preview verification — YES experiences" },
      { name: "robots", content: "noindex,nofollow" },
      {
        name: "description",
        content: "Internal one-click visual QA checklist for key homepage sections.",
      },
    ],
  }),
  component: PreviewCheckPage,
});

const CHECKS: CheckItem[] = [
  {
    id: "hero",
    label: "Hero",
    description: "Headline, subheadline, eyebrow and primary CTAs are visible and on-brand.",
    src: "/",
    hash: "#top",
  },
  {
    id: "experiences",
    label: "Experiences list",
    description: "Signature experiences render with images, titles and links.",
    src: "/",
    hash: "#signatures-title",
  },
  {
    id: "builder",
    label: "Builder CTA",
    description: "The Studio / builder entry point loads and the primary CTA is visible.",
    src: "/",
    hash: "#studio-title",
  },
];

function PreviewCheckPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

  const toggle = (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const jumpTo = (item: CheckItem) => {
    performJump(iframeRefs.current[item.id], item);
  };

  const completed = CHECKS.filter((c) => checked[c.id]).length;

  const handleDropdownJump = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id) return;
    const item = CHECKS.find((c) => c.id === id);
    if (!item) return;
    // Scroll the page to the section card…
    document
      .getElementById(`check-${item.id}-title`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    // …and navigate the iframe to its anchor.
    jumpTo(item);
    e.target.value = "";
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-card/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Internal · Visual QA
            </p>
            <h1 className="text-2xl font-semibold mt-1">Preview verification</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {completed} / {CHECKS.length} sections confirmed
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="jump-section" className="sr-only">
              Jump to section
            </label>
            <select
              id="jump-section"
              defaultValue=""
              onChange={handleDropdownJump}
              className="text-sm rounded-md border border-border bg-background px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Jump to a preview section"
            >
              <option value="" disabled>
                Jump to section…
              </option>
              {CHECKS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} {c.hash ? `(${c.hash})` : ""}
                </option>
              ))}
            </select>
            <Link to="/" className="text-sm underline underline-offset-4 hover:text-primary">
              ← Back to site
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 space-y-10">
        {CHECKS.map((item) => (
          <section
            key={item.id}
            aria-labelledby={`check-${item.id}-title`}
            className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
          >
            <div className="flex items-start justify-between gap-4 p-4 border-b border-border/60">
              <div className="flex items-start gap-3">
                <input
                  id={`check-${item.id}`}
                  type="checkbox"
                  checked={!!checked[item.id]}
                  onChange={() => toggle(item.id)}
                  className="mt-1 h-5 w-5 accent-primary cursor-pointer"
                  aria-label={`Mark ${item.label} as verified`}
                />
                <div>
                  <h2 id={`check-${item.id}-title`} className="text-lg font-semibold">
                    {item.label}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-2">
                {item.hash && (
                  <button
                    type="button"
                    onClick={() => jumpTo(item)}
                    className="text-xs px-2 py-1 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                    aria-label={`Jump preview to ${item.label} section`}
                  >
                    Jump to {item.hash}
                  </button>
                )}
                <a
                  href={item.src + (item.hash ?? "")}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline underline-offset-4 text-muted-foreground hover:text-primary"
                >
                  Open ↗
                </a>
              </div>
            </div>

            <div className="bg-muted/30">
              <iframe
                ref={(el) => {
                  iframeRefs.current[item.id] = el;
                }}
                title={`${item.label} preview`}
                src={item.src + (item.hash ?? "")}
                loading="lazy"
                className="w-full h-[520px] border-0 block"
              />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
