import * as React from "react";
import { Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { AuthShell, text } from "./auth-shell";

interface Props {
  guideName?: string;
}

const GuideAppDeclined = ({ guideName }: Props) => {
  const first = guideName ? guideName.trim().split(/\s+/)[0] : null;
  return (
    <AuthShell
      preview="An update on your YES Guide App request."
      eyebrow="YES Experiences · Guide App"
      heading={first ? `${first}, thank you for your interest.` : "Thank you for your interest."}
      ctaLabel="Contact the office"
      ctaHref="https://yesexperiencesportugal.com/contact"
      footnote="If you think this is a mistake, reply to the office and we will look again."
    >
      <Text style={text}>
        We are not able to give you Guide App access at the moment. The office has reviewed your
        request, and your account will stay without access to tours.
      </Text>
    </AuthShell>
  );
};

export const template = {
  component: GuideAppDeclined,
  subject: "Your YES Guide App request",
  displayName: "Guide App request declined",
  previewData: { guideName: "Margarida Silva" },
} satisfies TemplateEntry;
