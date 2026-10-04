import { Link } from "@tanstack/react-router";
import { LISBON_REGIONS } from "@/content/lisbon-regions";
import { WINERIES } from "@/content/wineries";

/**
 * Quiet contextual links under a Signature tour page: its region hub, the
 * wineries it can visit, the wine-tour guide/hub for wine days, and Studio.
 * Every target comes from existing data — nothing is linked that does not exist.
 */
const WINE_TOUR_IDS = new Set(["arrabida-wine-allinclusive", "azeitao-cheese", "evora-alentejo"]);
const linkCls =
  "underline underline-offset-4 decoration-[color:var(--gold)] hover:text-[color:var(--charcoal)]";

export function TourContextLinks({ tourId }: { tourId: string }) {
  const regions = LISBON_REGIONS.filter((r) => r.tourIds.includes(tourId));
  const wineries = WINERIES.filter((w) => w.tours.some((t) => t.id === tourId));
  const isWine = WINE_TOUR_IDS.has(tourId);

  return (
    <section className="pb-10" data-testid="tour-context-links">
      <div className="container-x max-w-3xl space-y-3 text-[14px] leading-relaxed text-[color:var(--charcoal-soft)]">
        {isWine && (
          <p>
            Still comparing regions? Our guide to the{" "}
            <Link to="/local-stories/$slug" params={{ slug: "best-wine-tours-from-lisbon" }} className={linkCls}>
              best wine tours from Lisbon
            </Link>{" "}
            sets this day beside the other options, and every wine day is listed on{" "}
            <Link to="/lisbon-wine-tours" className={linkCls}>
              our Lisbon wine tours page
            </Link>
            .
          </p>
        )}
        {wineries.length > 0 && (
          <p>
            Wineries this day can visit:{" "}
            {wineries.map((w, i) => (
              <span key={w.slug}>
                <Link to="/wineries/$slug" params={{ slug: w.slug }} className={linkCls}>
                  {w.name}
                </Link>
                {i < wineries.length - 1 ? ", " : ""}
              </span>
            ))}
            {" — or see "}
            <a href="/wineries" className={linkCls}>
              all the wineries we visit
            </a>
            .
          </p>
        )}
        {regions.length > 0 && (
          <p>
            {"More private days in "}
            {regions.map((r, i) => (
              <span key={r.path}>
                <a href={r.path} className={linkCls}>
                  {r.name}
                </a>
                {i < regions.length - 1 ? " and " : ""}
              </span>
            ))}
            {", or "}
            <Link to="/studio" className={linkCls}>
              design your own private day in Studio
            </Link>
            .
          </p>
        )}
      </div>
    </section>
  );
}
