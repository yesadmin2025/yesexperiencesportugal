import * as React from "react";
import type { StudioProposal } from "@/lib/studio-v3/studioProposal";
import { whatsappUrl } from "@/config/business-nap";

function eur(n: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

const labelCls = "text-[11px] uppercase tracking-[0.22em] font-semibold";
const labelStyle = { color: "var(--gold-deep, var(--gold))" } as const;
const valueStyle = { color: "var(--charcoal)" } as const;

export function StudioProposalCard({
  proposal,
  tourTitle,
}: {
  proposal: StudioProposal;
  tourTitle: string;
}) {
  const [showAll, setShowAll] = React.useState(false);
  return (
    <section
      aria-label="Your proposal"
      data-testid="studio-v3-proposal-card"
      className="mx-auto mt-8 w-full max-w-[54ch] border-y py-6 text-left"
      style={{ borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)" }}
    >
      <p className={labelCls} style={labelStyle}>
        Your proposal
      </p>
      <dl className="mt-4 grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-6">
        {proposal.duration ? (
          <div>
            <dt className={labelCls} style={labelStyle}>Duration</dt>
            <dd className="mt-1 text-[15px]" style={valueStyle}>{proposal.duration}</dd>
          </div>
        ) : null}
        <div>
          <dt className={labelCls} style={labelStyle}>Pickup</dt>
          <dd className="mt-1 text-[15px]" style={valueStyle}>{proposal.pickup}</dd>
        </div>
        {proposal.perPaxEur != null ? (
          <div>
            <dt className={labelCls} style={labelStyle}>Price</dt>
            <dd className="mt-1 text-[15px]" style={valueStyle}>
              {eur(proposal.perPaxEur)} per adult
              <span
                className="mt-0.5 block text-[11px]"
                style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
              >
                Exact price for your party · full total and price details below.
              </span>
            </dd>
          </div>
        ) : null}
        {proposal.included.length > 0 ? (
          <div className="sm:col-span-2">
            <dt className={labelCls} style={labelStyle}>Included</dt>
            <dd className="mt-1">
              <ul className="space-y-1 text-[14px] leading-[1.5]" style={valueStyle}>
                {(showAll ? proposal.allIncluded : proposal.included).map((i) => (
                  <li key={i}>· {i}</li>
                ))}
              </ul>
              {proposal.moreIncluded > 0 && !showAll ? (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="mt-2 min-h-[44px] text-[12px] uppercase tracking-[0.18em] underline underline-offset-4"
                  style={{ color: "var(--teal)" }}
                >
                  See everything included
                </button>
              ) : null}
            </dd>
          </div>
        ) : null}
      </dl>
      <a
        href={whatsappUrl(`Hello, I'd like to talk about "${tourTitle}" from Studio.`)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex min-h-[44px] items-center text-[12px] uppercase tracking-[0.18em] underline underline-offset-4"
        style={{ color: "var(--teal)" }}
      >
        Talk to a local
      </a>
    </section>
  );
}
