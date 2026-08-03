/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LivingAtlasPreview } from "../LivingAtlasPreview";

afterEach(() => cleanup());

function enterDiscovery(): void {
  render(<LivingAtlasPreview />);
  fireEvent.click(screen.getByRole("button", { name: /Help me find my day/i }));
}

describe("LivingAtlasPreview", () => {
  it("starts with a choice between discovery and a fixed destination", () => {
    render(<LivingAtlasPreview />);
    expect(screen.getByText(/There is more than one Portugal/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Help me find my day/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /I know where I want to go/i })).toBeTruthy();
  });

  it("allows at most three selected dimensions", () => {
    enterDiscovery();

    fireEvent.click(screen.getByRole("button", { name: /Faith & reflection/i }));
    fireEvent.click(screen.getByRole("button", { name: /History & heritage/i }));
    fireEvent.click(screen.getByRole("button", { name: /Wine & the Portuguese table/i }));

    expect(screen.getByText(/3 of 3 selected/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /The Atlantic/i })).toBeDisabled();
  });

  it("uses a Precision Fork instead of silently choosing between Évora and Roman Talha", () => {
    enterDiscovery();

    fireEvent.click(screen.getByRole("button", { name: /History & heritage/i }));
    fireEvent.click(screen.getByRole("button", { name: /Wine & the Portuguese table/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Continue/i }));

    fireEvent.click(screen.getByRole("button", { name: /History & heritage/i }));
    fireEvent.click(screen.getByRole("button", { name: /Wine & the Portuguese table/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Continue/i }));

    expect(screen.getByText(/Two directions fit you beautifully/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Évora & Alentejo Wine/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Roman Heritage Wine/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Évora & Alentejo Wine/i }));
    expect(screen.getByText(/Your Portugal is beginning to take shape/i)).toBeTruthy();
    expect(screen.getByText(/Évora & Alentejo Wine Private Tour/i)).toBeTruthy();
  });

  it("keeps an explicitly chosen Fátima destination as a hard boundary", () => {
    render(<LivingAtlasPreview />);
    fireEvent.click(screen.getByRole("button", { name: /I know where I want to go/i }));
    fireEvent.click(screen.getByRole("button", { name: /Fátima, Nazaré & Óbidos/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Continue/i }));

    fireEvent.click(screen.getByRole("button", { name: /Faith & reflection/i }));
    fireEvent.click(screen.getByRole("button", { name: /The Atlantic/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Continue/i }));

    fireEvent.click(screen.getByRole("button", { name: /Faith & reflection/i }));
    fireEvent.click(screen.getByRole("button", { name: /The Atlantic/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Continue/i }));

    expect(screen.getByText(/Fátima, Nazaré & Óbidos Private Tour/i)).toBeTruthy();
    expect(screen.getByText(/Destination fixed as a hard boundary/i)).toBeTruthy();
  });
});
