import { createServerFn } from "@tanstack/react-start";
import { runTourLinkAudit, type TourLinkAuditReport } from "./tourLinkAudit.server";

/**
 * Dev-only audit. We hard-gate on NODE_ENV inside the handler so a
 * production build that somehow exposed this route still refuses to scan.
 */
export const auditTourLinks = createServerFn({ method: "GET" }).handler(
  async (): Promise<TourLinkAuditReport> => {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Tour link audit is disabled in production builds.");
    }
    return runTourLinkAudit();
  },
);
