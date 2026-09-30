import { describe, expect, it } from "vitest";
import * as React from "react";
import { render } from "react-email";
import { TEMPLATES } from "@/lib/email-templates/registry";
import { GUIDE_APP_URL } from "@/lib/email-templates/guide-app-invite";

describe("guide-app-invite email", () => {
  it("is registered with the exact subject", () => {
    expect(TEMPLATES["guide-app-invite"]?.subject).toBe("Your YES Guide App");
  });

  it("renders the Guide App link, install steps and no-finance note", async () => {
    const t = TEMPLATES["guide-app-invite"]!;
    const html = await render(
      React.createElement(t.component, { guideName: "Margarida Silva", guideEmail: "m@example.com" }),
    );
    expect(GUIDE_APP_URL).toBe("https://yesexperiencesportugal.com/guide");
    expect(html).toContain(GUIDE_APP_URL);
    expect(html).toContain("Margarida");
    expect(html).toContain("m@example.com");
    expect(html).toContain("Add to Home Screen");
    expect(html).toContain("Install Guide App");
    expect(html).toContain("Your guide profile is not yet a sign-in account");
    expect(html).toMatch(/No prices or financial information/);
  });
});
