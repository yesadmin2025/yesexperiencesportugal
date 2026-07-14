import { describe, expect, it } from "vitest";
import { render as rtlRender, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AtmosphereBeat, MapBeat } from "../CreationBeat";

// MapBeat pulls route-leg estimates via a TanStack Query hook — every
// render needs a QueryClientProvider or the hook throws "No QueryClient set".
function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: makeWrapper() });

describe("YES voice mark — transition beats", () => {
  it("renders YES — <eyebrow> on AtmosphereBeat", () => {
    render(<AtmosphereBeat imageSrc="" eyebrow="The feeling" line="A test line" />);
    const marks = screen.getAllByTestId("studio-v3-voice-mark");
    expect(marks.length).toBeGreaterThan(0);
    const mark = marks[0];
    expect(mark.textContent).toMatch(/YES/);
    expect(mark.textContent).toMatch(/The feeling/);
  });

  it("renders YES — <eyebrow> on MapBeat", () => {
    render(
      <MapBeat
        mode="origin"
        originLabel="Lisbon"
        routeLabels={[]}
        rhythm={null}
        eyebrow="The beginning"
        line="A test line"
      />,
    );
    const mark = screen.getByTestId("studio-v3-voice-mark");
    expect(mark.textContent).toMatch(/YES/);
    expect(mark.textContent).toMatch(/The beginning/);
  });
});
