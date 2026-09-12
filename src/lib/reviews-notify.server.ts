/**
 * Guest review → team inbox notification (server-only).
 *
 * Every guest testimonial submitted from /reviews, /pt/reviews or a tokenized
 * post-trip link is emailed to the YES team immediately, so a review can be
 * read and moderated without watching the admin dashboard. Delivery failures
 * are non-fatal: the review row is already saved.
 */
import { TEAM_NOTIFICATION_RECIPIENTS } from "@/lib/email/team-recipients";

export interface ReviewNotification {
  tourId: string | null;
  rating: number;
  title: string | null;
  body: string;
  reviewerName: string | null;
  reviewerCountry: string | null;
  language: string;
  channel: string;
}

export async function notifyTeamOfReview(review: ReviewNotification): Promise<void> {
  try {
    const { sendTransactionalInternal } = await import("@/lib/email/send-internal.server");
    const submittedAt = new Date().toISOString();
    const message = [
      `Rating: ${review.rating} / 5`,
      review.title ? `Headline: ${review.title}` : null,
      `Experience: ${review.tourId ?? "not specified"}`,
      review.reviewerCountry ? `Country: ${review.reviewerCountry}` : null,
      `Language: ${review.language}`,
      "",
      review.body,
      "",
      "Pending moderation — publish it from the admin reviews page.",
    ]
      .filter((line) => line !== null)
      .join("\n");

    const [firstName, ...restName] = (review.reviewerName ?? "Guest").split(" ");
    const key = `guest-review-${review.channel}-${submittedAt}`;

    await Promise.all(
      TEAM_NOTIFICATION_RECIPIENTS.map((recipient) =>
        sendTransactionalInternal({
          templateName: "internal-lead",
          recipientEmail: recipient,
          idempotencyKey: `${key}-${recipient}`,
          templateData: {
            firstName: firstName || "Guest",
            lastName: restName.join(" "),
            email: null,
            message,
            source: `guest-review:${review.channel}`,
            locale: review.language,
            userAgent: null,
            requestType: "guest_review",
            travelDate: null,
            place: review.tourId,
            submittedAt,
          },
        }),
      ),
    );
  } catch (e) {
    console.error("[reviews] team notification failed (non-fatal)", {
      error: e instanceof Error ? e.message : e,
    });
  }
}
