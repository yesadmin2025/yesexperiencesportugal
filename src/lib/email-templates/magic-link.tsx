import * as React from "react";
import { Text } from "@react-email/components";
import { AuthShell, text } from "./auth-shell";

interface MagicLinkEmailProps {
  siteName: string;
  confirmationUrl: string;
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <AuthShell
    preview="Your private link back into YES Experiences."
    eyebrow="YES Experiences · Sign in"
    heading="Your way back in."
    ctaLabel="Sign in securely"
    ctaHref={confirmationUrl}
    footnote="This link expires shortly and can only be used once. If you didn't ask for it, simply ignore this email."
  >
    <Text style={text}>
      No password needed. The button below signs you straight back into your account, where the
      days you designed are waiting exactly as you left them.
    </Text>
  </AuthShell>
);

export default MagicLinkEmail;
