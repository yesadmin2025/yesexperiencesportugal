import * as React from "react";
import { Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { AuthShell, text } from "./auth-shell";

export const GUIDE_APP_URL = "https://yesexperiencesportugal.com/guide";

interface GuideAppInviteProps {
  guideName?: string;
  guideEmail?: string;
  appUrl?: string;
}

const step = { ...text, margin: "0 0 10px" } as const;

const GuideAppInvite = ({ guideName, guideEmail, appUrl }: GuideAppInviteProps) => {
  const first = guideName ? guideName.trim().split(/\s+/)[0] : null;
  return (
    <AuthShell
      preview="Your tours, pickups and alerts — all in the YES Guide App."
      eyebrow="YES Experiences · Guide App"
      heading={first ? `${first}, your Guide App is ready.` : "Your Guide App is ready."}
      ctaLabel="Open the Guide App"
      ctaHref={appUrl || GUIDE_APP_URL}
      footnote="No prices or financial information are shown in the Guide App."
    >
      <Text style={text}>
        Your tours, pickup details, guest contacts, itinerary, alerts and availability — in one
        place on your phone.
      </Text>
      <Text style={step}>1. Open the link below on your phone.</Text>
      <Text style={step}>
        2. Sign in or create an account with{" "}
        {guideEmail ? <strong>{guideEmail}</strong> : "the email the office has registered for you"}.
      </Text>
      <Text style={step}>3. Once inside, tap “Install Guide App”.</Text>
      <Text style={{ ...step, margin: "0 0 24px" }}>
        4. On iPhone: while on the Guide App page in Safari, tap Share, then Add to Home Screen. Add it from the Guide App page, not the main website.
      </Text>
    </AuthShell>
  );
};

export const template = {
  component: GuideAppInvite,
  subject: "Your YES Guide App",
  displayName: "Guide App invitation",
  previewData: { guideName: "Margarida Silva", guideEmail: "guide@example.com" },
} satisfies TemplateEntry;
