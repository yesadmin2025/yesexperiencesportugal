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

/**
 * Shared brand shell for the six Supabase auth emails.
 * Mirrors the editorial language of the booking templates:
 * gold eyebrow, serif headline, Arial body, teal signoff.
 * Body background stays #ffffff for email-client compatibility.
 */

export const TEAL = "#295B61";
export const GOLD = "#C9A96A";
export const CHARCOAL = "#2E2E2E";
export const SAND = "#F4EEE2";

export const SUPPORT_EMAIL = "info@yesexperiencesportugal.com";

interface AuthShellProps {
  preview: string;
  eyebrow: string;
  heading: string;
  children: React.ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
  footnote?: string;
}

export const AuthShell = ({
  preview,
  eyebrow,
  heading,
  children,
  ctaLabel,
  ctaHref,
  footnote,
}: AuthShellProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrowStyle}>{eyebrow}</Text>
        <Heading style={h1}>{heading}</Heading>
        {children}
        {ctaLabel && ctaHref ? (
          <Button style={button} href={ctaHref}>
            {ctaLabel}
          </Button>
        ) : null}
        <Hr style={hr} />
        {footnote ? <Text style={footer}>{footnote}</Text> : null}
        <Text style={footer}>
          Questions? Simply reply to this email — it reaches a real person at {SUPPORT_EMAIL}.
        </Text>
        <Text style={signoff}>— YES Experiences Portugal</Text>
      </Container>
    </Body>
  </Html>
);

export const main = {
  backgroundColor: "#ffffff",
  fontFamily: 'Georgia, "Times New Roman", serif',
} as const;

export const container = { padding: "32px 28px", maxWidth: "560px" } as const;

export const eyebrowStyle = {
  fontFamily: "Arial, sans-serif",
  fontSize: "11px",
  letterSpacing: "0.22em",
  textTransform: "uppercase" as const,
  color: GOLD,
  fontWeight: 700 as const,
  margin: "0 0 18px",
} as const;

export const h1 = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: "26px",
  lineHeight: 1.18,
  color: CHARCOAL,
  fontWeight: 700 as const,
  margin: "0 0 16px",
} as const;

export const text = {
  fontFamily: "Arial, sans-serif",
  fontSize: "15px",
  lineHeight: 1.65,
  color: CHARCOAL,
  margin: "0 0 20px",
} as const;

export const link = { color: TEAL, textDecoration: "underline" } as const;

export const button = {
  backgroundColor: TEAL,
  color: "#ffffff",
  fontFamily: "Arial, sans-serif",
  fontSize: "13px",
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  fontWeight: 700 as const,
  borderRadius: "2px",
  padding: "14px 26px",
  textDecoration: "none",
  display: "inline-block",
} as const;

export const codeBox = {
  backgroundColor: SAND,
  padding: "18px 22px",
  borderRadius: "2px",
  margin: "0 0 24px",
} as const;

export const codeText = {
  fontFamily: "Courier, monospace",
  fontSize: "28px",
  letterSpacing: "0.32em",
  fontWeight: 700 as const,
  color: TEAL,
  margin: 0,
} as const;

export const hr = {
  border: "none",
  borderTop: `1px solid ${GOLD}40`,
  margin: "32px 0 20px",
} as const;

export const footer = {
  fontFamily: "Arial, sans-serif",
  fontSize: "13px",
  lineHeight: 1.55,
  color: `${CHARCOAL}cc`,
  margin: "0 0 12px",
} as const;

export const signoff = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: "14px",
  fontStyle: "italic" as const,
  color: TEAL,
  margin: 0,
} as const;
