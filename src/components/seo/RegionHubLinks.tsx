import { LISBON_REGIONS } from "@/content/lisbon-regions";

/**
 * One quiet line of region-hub links for listing pages. Targets come from
 * LISBON_REGIONS so a link never points at a page that does not exist.
 */
export function RegionHubLinks() {
  return (
    <section className="pb-16" data-testid="region-hub-links">
      <div className="container-x max-w-4xl">
        <p className="text-[14px] leading-relaxed text-[color:var(--charcoal-soft)]">
          {"Browse private days by region: "}
          {LISBON_REGIONS.map((r, i) => (
            <span key={r.path}>
              <a
                href={r.path}
                className="underline underline-offset-4 decoration-[color:var(--gold)] hover:text-[color:var(--charcoal)]"
              >
                {r.name}
              </a>
              {i < LISBON_REGIONS.length - 1 ? " · " : ""}
            </span>
          ))}
          {" — or meet "}
          <a
            href="/wineries"
            className="underline underline-offset-4 decoration-[color:var(--gold)] hover:text-[color:var(--charcoal)]"
          >
            the wineries we visit
          </a>
          .
        </p>
      </div>
    </section>
  );
}
