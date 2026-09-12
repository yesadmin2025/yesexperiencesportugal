import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

/**
 * Review-request follow-up.
 *
 * Sent once, a set number of days after an enquiry (proposals, celebrations,
 * corporate days, private groups) reached the inbox. It thanks the guest and
 * links to /reviews#leave-a-review — the same first-party review form whose
 * submissions are emailed to the team and stay unpublished until approved.
 */
export interface ReviewRequestProps {
  firstName?: string | null;
  occasionLabel?: string | null;
  reviewUrl?: string | null;
}

const TEAL = "#295B61";
const GOLD = "#C9A96A";
const CHARCOAL = "#2E2E2E";

const main = {
  backgroundColor: "#ffffff",
  fontFamily: 'Georgia, "Times New Roman", serif',
} as const;
const container = { maxWidth: 560, margin: "0 auto", padding: "32px 28px" } as const;
const eyebrow = {
  color: GOLD,
  fontSize: 11,
  letterSpacing: "0.22em",
  textTransform: "uppercase" as const,
  fontFamily: "Arial, Helvetica, sans-serif",
  margin: "0 0 16px",
};
const h1 = { color: TEAL, fontSize: 26, lineHeight: 1.25, margin: "0 0 20px", fontWeight: 400 };
const body = { color: CHARCOAL, fontSize: 15, lineHeight: 1.65, margin: "0 0 14px" };
const button = {
  backgroundColor: TEAL,
  color: "#FAF8F3",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: 12,
  letterSpacing: "0.16em",
  textTransform: "uppercase" as const,
  textDecoration: "none",
  padding: "14px 22px",
  display: "inline-block",
  margin: "8px 0 4px",
};
const hr = { borderColor: "#eee", margin: "28px 0" };
const signoff = { color: TEAL, fontSize: 14, margin: "20px 0 0", fontStyle: "italic" as const };

const ReviewRequest: React.FC<ReviewRequestProps> = ({ firstName, occasionLabel, reviewUrl }) => (
  <Html lang="en">
    <Head />
    <Preview>Would you share a few words about your time with us?</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>YES Experiences · Portugal</Text>
        <Heading style={h1}>{firstName ? `${firstName}, one small favour.` : "One small favour."}</Heading>
        <Text style={body}>
          Thank you again for trusting us with{" "}
          {occasionLabel ? occasionLabel.toLowerCase() : "your plans in Portugal"}. If we shaped
          something you enjoyed, a few honest words help other travellers decide — and they help our
          local hosts more than anything else we can do.
        </Text>
        <Button style={button} href={reviewUrl ?? "https://yesexperiencesportugal.com/reviews#leave-a-review"}>
          Write a review
        </Button>
        <Text style={{ ...body, marginTop: 18 }}>
          It takes about a minute, and you can stay anonymous if you prefer. If anything fell short
          instead, reply to this email — it reaches a person, not a queue.
        </Text>
        <Hr style={hr} />
        <Text style={body}>With gratitude,</Text>
        <Text style={signoff}>— The YES team</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: ReviewRequest,
  subject: (data: Record<string, unknown>) => {
    const name = typeof data.firstName === "string" ? data.firstName : null;
    return name ? `${name}, would you share a few words?` : "Would you share a few words?";
  },
  displayName: "Enquiry follow-up — review request",
  previewData: {
    firstName: "Sofia",
    occasionLabel: "A marriage proposal",
    reviewUrl: "https://yesexperiencesportugal.com/reviews#leave-a-review",
  },
} satisfies TemplateEntry;
