/**
 * Signature Story — cinematic narrative email sent when the traveller
 * enters their email in Guest Details. Story only. NO price, NO booking
 * confirmation copy (booking-confirmation.tsx owns that). No
 * "to be confirmed" language — everything shown is already confirmed.
 */
import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

const TEAL = "#295B61";
const GOLD = "#C9A96A";
const CHARCOAL = "#2E2E2E";
const SAND = "#F4EEE2";

export interface SignatureStoryEmailProps {
  title?: string;
  dateLabel?: string | null;
  guests?: number;
  pickupLabel?: string;
  chapters?: Array<{ title: string; body: string }>;
  inclusions?: string[];
}

const SignatureStory = ({
  title = "Your story in Portugal",
  dateLabel,
  guests = 2,
  pickupLabel = "Pickup shared with your host",
  chapters = [],
  inclusions = [],
}: SignatureStoryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your story in Portugal — ${chapters.length} chapters, held for you.`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>YES Experiences · Signature Story</Text>
        <Heading style={h1}>{title}</Heading>

        <Text style={lede}>
          A day shaped around the two of you — private, unhurried, and already yours.
        </Text>

        <Section style={metaRow}>
          {dateLabel ? (
            <Text style={metaLine}>
              <span style={metaLabel}>Date · </span>
              {dateLabel}
            </Text>
          ) : null}
          <Text style={metaLine}>
            <span style={metaLabel}>Guests · </span>
            {`${guests} ${guests === 1 ? "guest" : "guests"}`}
          </Text>
          <Text style={metaLine}>
            <span style={metaLabel}>Pickup · </span>
            {pickupLabel}
          </Text>
        </Section>

        <Hr style={hr} />

        {chapters.length > 0 ? (
          <>
            <Text style={sectionTitle}>Your day, chapter by chapter</Text>
            <Section>
              {chapters.map((c, i) => (
                <Section key={i} style={chapterRow}>
                  <Text style={chapterIndex}>{`Chapter ${String(i + 1).padStart(2, "0")}`}</Text>
                  <Text style={chapterTitle}>{c.title}</Text>
                  <Text style={chapterBody}>{c.body}</Text>
                </Section>
              ))}
            </Section>
          </>
        ) : null}

        {inclusions.length > 0 ? (
          <>
            <Hr style={hr} />
            <Text style={sectionTitle}>What's included</Text>
            <Section style={inclusionsBox}>
              {inclusions.map((item, i) => (
                <Text key={i} style={inclusionLine}>· {item}</Text>
              ))}
            </Section>
          </>
        ) : null}

        <Hr style={{ ...hr, margin: "28px 0 18px" }} />
        <Text style={footer}>
          When you're ready, return to your summary to reserve. The story stays yours —
          reply to this email any time and a real person will answer.
        </Text>
        <Text style={signoff}>— YES Experiences Portugal</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: SignatureStory,
  subject: (data: Record<string, unknown>) => {
    const t = typeof data.title === "string" ? data.title : null;
    return t ? `Your story in Portugal · ${t}` : "Your story in Portugal";
  },
  displayName: "Signature Story",
  previewData: {
    title: "Arrábida Private Wine Day",
    dateLabel: "Friday, 14 August 2026",
    guests: 2,
    pickupLabel: "Lisbon",
    chapters: [
      { title: "Setúbal harbour", body: "A quiet beginning by the boats before the road turns south." },
      { title: "Arrábida vineyards", body: "Long tastings under the pines, a private cellar just for you." },
      { title: "Sesimbra cliffs", body: "The Atlantic wide open before a slow return." },
    ],
    inclusions: ["Private guide", "Private transport", "Wine tasting", "Lunch at a family adega"],
  } satisfies SignatureStoryEmailProps,
} satisfies TemplateEntry;

export default SignatureStory;

const main = { backgroundColor: "#ffffff", fontFamily: 'Georgia, "Times New Roman", serif' } as const;
const container = { padding: "32px 28px", maxWidth: "560px" } as const;
const eyebrow = {
  fontFamily: "Arial, sans-serif",
  fontSize: "11px",
  letterSpacing: "0.22em",
  textTransform: "uppercase" as const,
  color: GOLD,
  fontWeight: 700 as const,
  margin: "0 0 18px",
} as const;
const h1 = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: "28px",
  lineHeight: 1.15,
  color: CHARCOAL,
  fontWeight: 700 as const,
  margin: "0 0 14px",
} as const;
const lede = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: "15.5px",
  lineHeight: 1.6,
  fontStyle: "italic" as const,
  color: `${CHARCOAL}dd`,
  margin: "0 0 22px",
} as const;
const metaRow = { margin: "0 0 8px" } as const;
const metaLine = {
  fontFamily: "Arial, sans-serif",
  fontSize: "13px",
  color: CHARCOAL,
  margin: "0 0 4px",
} as const;
const metaLabel = {
  fontFamily: "Arial, sans-serif",
  fontSize: "10.5px",
  letterSpacing: "0.24em",
  textTransform: "uppercase" as const,
  color: TEAL,
  fontWeight: 700 as const,
} as const;
const hr = { border: "none", borderTop: `1px solid ${GOLD}40`, margin: "22px 0" } as const;
const sectionTitle = {
  fontFamily: "Arial, sans-serif",
  fontSize: "11px",
  letterSpacing: "0.24em",
  textTransform: "uppercase" as const,
  color: TEAL,
  fontWeight: 700 as const,
  margin: "4px 0 14px",
} as const;
const chapterRow = { padding: "10px 0 14px", borderBottom: `1px solid ${GOLD}33` } as const;
const chapterIndex = {
  fontFamily: "Arial, sans-serif",
  fontSize: "10.5px",
  letterSpacing: "0.22em",
  color: GOLD,
  fontWeight: 700 as const,
  margin: "0 0 4px",
} as const;
const chapterTitle = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: "17px",
  color: CHARCOAL,
  fontWeight: 700 as const,
  margin: "0 0 6px",
} as const;
const chapterBody = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: "14.5px",
  lineHeight: 1.55,
  color: `${CHARCOAL}cc`,
  fontStyle: "italic" as const,
  margin: 0,
} as const;
const inclusionsBox = { backgroundColor: SAND, padding: "14px 16px", borderRadius: "2px" } as const;
const inclusionLine = {
  fontFamily: "Arial, sans-serif",
  fontSize: "13.5px",
  color: CHARCOAL,
  margin: "0 0 4px",
} as const;
const footer = {
  fontFamily: "Arial, sans-serif",
  fontSize: "13px",
  lineHeight: 1.55,
  color: `${CHARCOAL}cc`,
  margin: "0 0 12px",
} as const;
const signoff = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: "14px",
  fontStyle: "italic" as const,
  color: TEAL,
  margin: 0,
} as const;
