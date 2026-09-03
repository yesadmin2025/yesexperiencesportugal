import { describe, it } from "vitest";
import { rebuildLiveCommercialAuthority } from "../liveCommercialAuthority";

describe("tmp cheese diag", () => {
  it("reports the unsafe reason for the observed cheese day", () => {
    for (const anchor of ["azeitao-cheese", "arrabida-wine-allinclusive"]) {
      const res = rebuildLiveCommercialAuthority({
        anchorTourId: anchor,
        moments: [
          { label: "Mercado do Livramento" },
          { label: "Long lunch in Azeitão" },
          { label: "Quinta Velha" },
        ],
        edited: true,
      });
      // eslint-disable-next-line no-console
      console.log(anchor, JSON.stringify({
        safe: res.safe,
        reason: res.unsafeReason,
        notes: res.notes,
        records: res.report?.records,
        disposition: res.ledger?.disposition,
        entries: res.ledger?.entries,
      }, null, 1));
    }
  });
});
