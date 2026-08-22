import * as React from "react";
import { Link, Text } from "@react-email/components";
import { AuthShell, link, text } from "./auth-shell";

interface EmailChangeEmailProps {
  siteName: string;
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string;
  email: string;
  newEmail: string;
  confirmationUrl: string;
}

export const EmailChangeEmail = ({ oldEmail, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <AuthShell
    preview="Confirm your new email address for YES Experiences."
    eyebrow="YES Experiences · Email change"
    heading="Confirm your new address."
    ctaLabel="Confirm the change"
    ctaHref={confirmationUrl}
    footnote="If you didn't request this change, please secure your account immediately and reply to this email."
  >
    <Text style={text}>
      You asked to move your account from{" "}
      <Link href={`mailto:${oldEmail}`} style={link}>
        {oldEmail}
      </Link>{" "}
      to{" "}
      <Link href={`mailto:${newEmail}`} style={link}>
        {newEmail}
      </Link>
      . Confirming below keeps every itinerary and confirmation arriving in the right inbox.
    </Text>
  </AuthShell>
);

export default EmailChangeEmail;
