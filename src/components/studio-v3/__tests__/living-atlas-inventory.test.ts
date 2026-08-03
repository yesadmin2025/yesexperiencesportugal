import { describe, expect, it } from "vitest";

import {
  deriveLivingAtlasDimensions,
  signatureBuilderRegion,
} from "../livingAtlasInventory";

describe("Living Atlas inventory evidence", () => {
  it("corrects the legacy regional drift for Tomar and Fátima", () => {
    expect(signatureBuilderRegion("tomar-coimbra")).toBe("centro-tomar-coimbra");
    expect(signatureBuilderRegion("fatima-nazare-obidos")).toBe(
      "centro-fatima-nazare-obidos",
    );
  });

  it("recognises Fátima as faith and heritage without inventing wine", () => {
    const dimensions = deriveLivingAtlasDimensions({
      label: "Fátima Sanctuary",
      intentionTags: ["heritage", "wellness"],
    });
    expect(dimensions).toContain("faith-reflection");
    expect(dimensions).toContain("history-heritage");
    expect(dimensions).not.toContain("wine-table");
  });

  it("recognises the Convento de Cristo as sacred history", () => {
    const dimensions = deriveLivingAtlasDimensions({
      label: "Convento de Cristo",
      intentionTags: ["heritage", "wonder"],
    });
    expect(dimensions).toContain("faith-reflection");
    expect(dimensions).toContain("history-heritage");
  });

  it("recognises a tile workshop as hands-on heritage", () => {
    const dimensions = deriveLivingAtlasDimensions({
      label: "Portuguese azulejo painting workshop",
      intentionTags: ["heritage"],
    });
    expect(dimensions).toContain("hands-on-traditions");
    expect(dimensions).toContain("history-heritage");
  });

  it("recognises a winery and regional lunch as wine and table", () => {
    const dimensions = deriveLivingAtlasDimensions({
      label: "Family winery and regional lunch",
      tag: "wine",
      intentionTags: ["wine", "gastronomy"],
    });
    expect(dimensions).toContain("wine-table");
    expect(dimensions).toContain("local-life");
  });

  it("recognises a coastal boat stop as Atlantic and nature", () => {
    const dimensions = deriveLivingAtlasDimensions({
      label: "Sesimbra coastal boat and hidden coves",
      intentionTags: ["coast", "nature"],
    });
    expect(dimensions).toContain("atlantic-coast");
    expect(dimensions).toContain("nature-landscapes");
  });
});
