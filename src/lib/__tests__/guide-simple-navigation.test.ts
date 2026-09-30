import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("Guide App simple information architecture", () => {
  it("uses only Tours, Availability and Profile in the bottom navigation", () => {
    const shell = read("src/routes/guide.tsx");
    const tabs = shell.slice(shell.indexOf("const TABS"), shell.indexOf("function GuideLayout"));
    expect(tabs).toContain('label: "Tours"');
    expect(tabs).toContain('label: "Availability"');
    expect(tabs).toContain('label: "Profile"');
    expect(tabs).not.toMatch(/label: "(?:Calendar|Schedule|More|Alerts|All my tours)"/);
    expect(shell).toContain("grid-cols-3");
  });

  it("puts Today, Upcoming, alerts and concrete tour rows on My Tours", () => {
    const home = read("src/routes/guide.index.tsx");
    const card = read("src/components/guide/TourCard.tsx");
    expect(home).toContain(">My Tours<");
    expect(home).toContain(">Today<");
    expect(home).toContain(">Upcoming<");
    expect(home).toContain("No tours today.");
    expect(home).toContain("No upcoming tours assigned.");
    expect(home).toContain('from("ops_notifications")');
    expect(card).toContain("View details");
    expect(card).toContain("Pickup not added yet");
    expect(card).not.toContain("<GuestActions t={t}");
  });

  it("keeps removed destinations out of navigation by redirecting them home", () => {
    for (const file of [
      "src/routes/guide.calendar.tsx",
      "src/routes/guide.tours.index.tsx",
      "src/routes/guide.notifications.tsx",
    ]) {
      expect(read(file)).toContain('redirect({ to: "/guide" })');
    }
  });
});