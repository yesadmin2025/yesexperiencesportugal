import * as React from "react";
import { Link, Text } from "@react-email/components";
import { AuthShell, link, text } from "./auth-shell";

interface SignupEmailProps {
  siteName: string;
  siteUrl: string;
  recipient: string;
  confirmationUrl: string;
}

export const SignupEmail = ({ siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <AuthShell
    preview="Confirm your email — Portugal, felt from the inside."
    eyebrow="YES Experiences · Confirm your email"
    heading="One small step, and Portugal opens up."
    ctaLabel="Confirm my email"
    ctaHref={confirmationUrl}
    footnote="If you didn't create an account with us, you can safely ignore this email."
  >
    <Text style={text}>
      Welcome. Confirming{" "}
      <Link href={`mailto:${recipient}`} style={link}>
        {recipient}
      </Link>{" "}
      lets us save the days you design and send you the itinerary the moment it's ready.
    </Text>
    <Text style={text}>
      Once confirmed, you can pick up exactly where you left off at{" "}
      <Link href={siteUrl} style={link}>
        yesexperiencesportugal.com
      </Link>
      .
    </Text>
  </AuthShell>
);

export default SignupEmail;
