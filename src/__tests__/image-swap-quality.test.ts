import { describe, expect, it } from "vitest";
import { estimateQuality } from "@/lib/image-swap/quality";
import type { PoolPhoto } from "@/lib/image-swap/pool";

const base: PoolPhoto = {
  id: "x",
  src: "x",
  source: "admin-upload",
  name: "photo.jpg",
  tags: [],
};

describe("estimateQuality", () => {
  it("returns alta for >=1600px on the longest side", () => {
    expect(estimateQuality({ ...base, width: 1920, height: 1200 })).toBe("alta");
    expect(estimateQuality({ ...base, width: 800, height: 1600 })).toBe("alta");
  });
  it("returns media for 1000-1599", () => {
    expect(estimateQuality({ ...base, width: 1200, height: 900 })).toBe("media");
  });
  it("returns baixa for known but small", () => {
    expect(estimateQuality({ ...base, width: 640, height: 480 })).toBe("baixa");
  });
  it("returns desconhecida when dimensions are missing", () => {
    expect(estimateQuality(base)).toBe("desconhecida");
  });
});
