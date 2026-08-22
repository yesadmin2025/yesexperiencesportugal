import * as React from "react";
import { Text } from "@react-email/components";
import { AuthShell, text } from "./auth-shell";

interface RecoveryEmailProps {
  siteName: string;
  confirmationUrl: string;
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <AuthShell
    preview="Choose a new password for YES Experiences."
    eyebrow="YES Experiences · Password reset"
    heading="Let's get you back in."
    ctaLabel="Choose a new password"
    ctaHref={confirmationUrl}
    footnote="If you didn't request this, nothing has changed — your current password still works."
  >
    <Text style={text}>
      We received a request to reset the password on your account. The button below takes you to a
      secure page where you can set a new one. The link expires shortly.
    </Text>
  </AuthShell>
);

export default RecoveryEmail;
