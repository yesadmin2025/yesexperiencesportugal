import * as React from "react";
import { Section, Text } from "@react-email/components";
import { AuthShell, codeBox, codeText, text } from "./auth-shell";

interface ReauthenticationEmailProps {
  token: string;
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <AuthShell
    preview="Your YES Experiences verification code."
    eyebrow="YES Experiences · Verification"
    heading="Confirm it's you."
    footnote="This code expires shortly. If you didn't request it, you can safely ignore this email."
  >
    <Text style={text}>Use the code below to confirm your identity:</Text>
    <Section style={codeBox}>
      <Text style={codeText}>{token}</Text>
    </Section>
  </AuthShell>
);

export default ReauthenticationEmail;
