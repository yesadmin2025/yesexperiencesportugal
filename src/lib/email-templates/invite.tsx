import * as React from "react";
import { Link, Text } from "@react-email/components";
import { AuthShell, link, text } from "./auth-shell";

interface InviteEmailProps {
  siteName: string;
  siteUrl: string;
  confirmationUrl: string;
}

export const InviteEmail = ({ siteUrl, confirmationUrl }: InviteEmailProps) => (
  <AuthShell
    preview="You've been invited to YES Experiences Portugal."
    eyebrow="YES Experiences · Invitation"
    heading="You've been invited."
    ctaLabel="Accept the invitation"
    ctaHref={confirmationUrl}
    footnote="If you weren't expecting this invitation, you can safely ignore this email."
  >
    <Text style={text}>
      Someone at{" "}
      <Link href={siteUrl} style={link}>
        YES Experiences Portugal
      </Link>{" "}
      has invited you to join. Accepting creates your account and gives you access to the private
      days designed for you.
    </Text>
  </AuthShell>
);

export default InviteEmail;
