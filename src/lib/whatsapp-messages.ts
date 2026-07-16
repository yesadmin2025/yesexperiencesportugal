/**
 * Canonical WhatsApp prefill messages (English, page-specific).
 *
 * Every wa.me link on the site should route through one of these builders
 * so incoming WhatsApp threads identify the source page/journey.
 * Keep copy centralized here for future audits and translation.
 */

export function waGeneric(): string {
  return "Hi YES — I'd like a hand planning my day in Portugal.";
}

export function waSignature(tourName?: string): string {
  const name = tourName?.trim();
  return name
    ? `Hi YES — I'm interested in the ${name} and have a question.`
    : "Hi YES — I'm interested in a Signature experience and have a question.";
}

export function waSignatureTailor(tourName?: string): string {
  const name = tourName?.trim();
  return name
    ? `Hi YES — I'm interested in the ${name} and would like to tailor it.`
    : "Hi YES — I'd like to tailor a Signature experience.";
}

export function waTalkToLocal(tourName?: string): string {
  const name = tourName?.trim();
  return name
    ? `Hi YES — I'd like to talk to a local about the ${name}.`
    : "Hi YES — I'd like to talk to a local about a Signature experience.";
}

export function waStudioV3(): string {
  return "Hi YES — I'm designing my day in the Studio and would like a suggestion.";
}

export function waMultiDay(): string {
  return "Hi YES — I'd like to plan a multi-day Portugal journey.";
}

export function waCorporate(): string {
  return "Hi YES — I'd like to plan a group/corporate day.";
}

export function waStudioV2Refine(opts?: { name?: string; region?: string }): string {
  const name = opts?.name?.trim();
  const region = opts?.region?.trim();
  const where = region ? `a day in ${region}` : "a day in Portugal";
  return name
    ? `Hi YES — I'm ${name}. I just designed ${where} in the Studio and would like to refine it with a local designer.`
    : `Hi YES — I just designed ${where} in the Studio and would like to refine it with a local designer.`;
}

export function waStudioV2Handoff(opts?: { name?: string }): string {
  const name = opts?.name?.trim();
  return name
    ? `Hi YES — I'm ${name}. I just designed my experience in the Studio and would like to talk to a local designer before booking.`
    : "Hi YES — I just designed my experience in the Studio and would like to talk to a local designer before booking.";
}
