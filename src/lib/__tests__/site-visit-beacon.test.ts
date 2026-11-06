// @vitest-environment-options { "url": "https://yesexperiencesportugal.com/experiences" }
import { beforeEach, describe, expect, it, vi } from "vitest";
import { classifyCta, installCtaTracking } from "../site-visit-beacon";

const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

describe("CTA classification", () => {
  it.each([
    ["Arrábida Wine", "/tours/arrabida-wine-allinclusive", "signature"],
    ["Arrábida Wine", "/tours/arrabida-wine-allinclusive/tailor", "tailor"],
    ["", "https://yesexperiencesportugal.com/tours/arrabida-wine-allinclusive?source=card", "signature"],
    ["Tailor this day", "", "tailor"],
    ["Refine this day", "", "tailor"],
    ["Design your day", "", "studio"],
    ["Love this day · Reserve it", "", "studio"],
    ["Reserve this day", "", "signature"],
    ["Explore Signature Experiences", "", "signature"],
    ["See dates & reserve", "", "signature"],
    ["", "/studio", "studio"],
    ["", "/experiences/arrabida", "signature"],
    ["Contact", "/contact", null],
  ])("%s %s → %s", (text, href, expected) => {
    expect(classifyCta(text, href)).toBe(expected);
  });
});

describe("one beacon per physical click", () => {
  it.each([
    ["Arrábida Wine", "/tours/arrabida-wine-allinclusive", "signature"],
    ["Tailor this day", "/tours/arrabida-wine-allinclusive/tailor", "tailor"],
    ["See dates & reserve", "/tours/arrabida-wine-allinclusive", "signature"],
    ["Design your day", "/studio", "studio"],
    ["Refine this day", "#details", "tailor"],
    ["Love this day · Reserve it", "#reserve", "studio"],
    ["Reserve this day", "#reserve", "signature"],
    ["Explore Signature Experiences", "/experiences", "signature"],
  ])("%s counts once as %s", (text, href, expected) => {
    installCtaTracking();
    installCtaTracking();
    const link = document.createElement("a");
    link.href = href;
    const child = document.createElement("span");
    child.textContent = text;
    link.append(child);
    link.addEventListener("click", (event) => event.preventDefault());
    document.body.append(link);
    child.click();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1].body);
    expect(body.event).toBe("cta_click");
    expect(body.cta).toBe(expected);
    expect(body.path).toBe("/experiences");
  });
});