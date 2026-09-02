import { createFileRoute } from "@tanstack/react-router";
import { ProposalInPortugalPage } from "./proposal-in-portugal";
import { breadcrumbLd, jsonLdScript } from "@/lib/jsonld";
import ogSocialImg from "@/assets/cat-proposals.jpg";

/**
 * /proposals renders the same page as /proposal-in-portugal so the short
 * URL works as a live page (no 301 hop). /proposal-in-portugal remains
 * the SEO-canonical URL — the <link rel="canonical"> on this route
 * points there so search engines consolidate signals on the keyword URL.
 */
const CANONICAL = "https://yesexperiencesportugal.com/proposal-in-portugal";
const TITLE = "Proposal in Portugal — Private Moments, Planned Discreetly";
const DESCRIPTION =
  "Plan a proposal in Portugal — Sintra cliffs, Arrábida coves, Lisbon rooftops. A private moment shaped end to end by a local team.";

export const Route = createFileRoute("/proposals")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: CANONICAL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: `https://yesexperiencesportugal.com${ogSocialImg}` },
      { name: "twitter:image", content: `https://yesexperiencesportugal.com${ogSocialImg}` },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Proposal in Portugal", path: "/proposal-in-portugal" },
        ]),
      ),
    ],
  }),
  component: ProposalInPortugalPage,
});
