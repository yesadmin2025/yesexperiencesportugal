/**
 * /search — the real, public site search.
 *
 * Exists so the schema.org SearchAction advertised in websiteLd() points at
 * a working endpoint: /search?q={search_term_string}.
 *
 * Query state lives in the URL (validated search param), so results are
 * shareable, server-rendered and crawl-safe. The page itself is
 * `noindex, follow` — standard practice for search result pages — while
 * every result links to an indexable canonical page.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Search as SearchIcon, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SITE_URL } from "@/lib/seo";
import {
  MAX_QUERY_LENGTH,
  SEARCH_KIND_LABEL,
  searchSite,
  type SearchResult,
} from "@/lib/site-search";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(searchSchema),
  component: SearchPage,
  head: () => ({
    meta: [
      { title: "Search — YES experiences Portugal" },
      {
        name: "description",
        content:
          "Search private experiences, multi-day journeys and local stories across Portugal by YES experiences.",
      },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "Search — YES experiences Portugal" },
      {
        property: "og:description",
        content:
          "Search private experiences, multi-day journeys and local stories across Portugal.",
      },
      { property: "og:url", content: `${SITE_URL}/search` },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/search` }],
  }),
});

const SUGGESTIONS = ["wine tour lisbon", "arrábida", "sintra", "boat", "proposal", "multi-day"];

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const [draft, setDraft] = useState(q);

  // Keep the input in sync when the URL changes (back/forward, suggestion).
  useEffect(() => {
    setDraft(q);
  }, [q]);

  const query = q.slice(0, MAX_QUERY_LENGTH).trim();
  const results: SearchResult[] = query ? searchSite(query) : [];

  function submit(value: string) {
    navigate({
      search: { q: value.slice(0, MAX_QUERY_LENGTH) },
      replace: true,
    });
  }

  return (
    <SiteLayout>
      <main className="bg-[color:var(--ivory)] pb-24 pt-28 md:pt-36">
        <div className="mx-auto w-full max-w-3xl px-5 md:px-8">
          <Eyebrow>Search</Eyebrow>
          <SectionTitle as="h1" size="anchor" className="mt-3">
            Find your <SectionTitle.Em>Portugal</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
            Search Signature experiences, multi-day journeys and local stories.
          </p>

          <form
            role="search"
            className="mt-8"
            onSubmit={(event) => {
              event.preventDefault();
              submit(draft);
            }}
          >
            <label htmlFor="site-search-input" className="sr-only">
              Search YES experiences Portugal
            </label>
            <div className="flex items-center gap-2 rounded-full border border-[color:var(--sand)] bg-white px-5 py-1.5 shadow-[0_1px_2px_rgba(46,46,46,0.06)] focus-within:border-[color:var(--teal)]">
              <SearchIcon
                aria-hidden="true"
                className="h-[18px] w-[18px] shrink-0 text-[color:var(--charcoal-soft)]"
              />
              <input
                id="site-search-input"
                type="search"
                name="q"
                value={draft}
                maxLength={MAX_QUERY_LENGTH}
                autoComplete="off"
                placeholder="Wine tour, Sintra, proposal…"
                onChange={(event) => setDraft(event.target.value)}
                className="min-h-[44px] w-full bg-transparent text-[16px] text-[color:var(--charcoal)] outline-none placeholder:text-[color:var(--charcoal-soft)]"
              />
              <button
                type="submit"
                className="min-h-[44px] shrink-0 rounded-full px-4 text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--teal)] transition-colors hover:text-[color:var(--charcoal)]"
              >
                Search
              </button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap gap-2" aria-label="Suggested searches">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                className="rounded-full border border-[color:var(--sand)] px-3 py-2 text-[12px] text-[color:var(--charcoal-soft)] transition-colors hover:border-[color:var(--teal)] hover:text-[color:var(--charcoal)]"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="mt-12" aria-live="polite">
            {!query ? (
              <p className="text-[15px] text-[color:var(--charcoal-soft)]">
                Type a place, a mood or an occasion to begin.
              </p>
            ) : results.length === 0 ? (
              <div>
                <p className="text-[15px] text-[color:var(--charcoal)]">
                  No matches for <strong className="font-medium">“{query}”</strong>.
                </p>
                <p className="mt-2 text-[15px] text-[color:var(--charcoal-soft)]">
                  Browse the{" "}
                  <Link to="/experiences" className="underline underline-offset-4">
                    Signature collection
                  </Link>{" "}
                  or{" "}
                  <Link
                    to="/contact"
                    search={{ type: undefined }}
                    className="underline underline-offset-4"
                  >
                    tell us what you have in mind
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
                  {results.length} result{results.length === 1 ? "" : "s"}
                </p>
                <ul className="mt-6 divide-y divide-[color:var(--sand)] border-t border-[color:var(--sand)]">
                  {results.map((r) => (
                    <li key={r.id}>
                      <Link
                        to={r.path}
                        className="group flex min-h-[44px] flex-col gap-1.5 py-6 transition-opacity hover:opacity-90"
                      >
                        <span className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-[color:var(--gold-ink)]">
                          {SEARCH_KIND_LABEL[r.kind]}
                          {r.meta ? ` · ${r.meta}` : ""}
                        </span>
                        <span className="serif text-[1.35rem] leading-tight text-[color:var(--charcoal)]">
                          {r.title}
                        </span>
                        <span className="text-[14.5px] leading-relaxed text-[color:var(--charcoal-soft)]">
                          {r.summary}
                        </span>
                        <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--teal)]">
                          View
                          <ArrowRight
                            aria-hidden="true"
                            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                          />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </main>
    </SiteLayout>
  );
}
