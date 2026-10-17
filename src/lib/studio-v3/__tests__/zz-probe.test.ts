import { it } from "vitest";
import { rebuildLiveCommercialAuthority } from "@/lib/studio-v3/liveCommercialAuthority";
import { TAILOR_BLUEPRINTS } from "@/data/tailorBlueprints";

it("probe", () => {
  const bp: any = (TAILOR_BLUEPRINTS as any)["arrabida-wine-allinclusive"] ?? (TAILOR_BLUEPRINTS as any[]).find?.((b: any) => b.tourId === "arrabida-wine-allinclusive");
  const core = bp.core.map((s: any) => ({ label: s.label, blueprintStopId: s.id }));
  const w = bp.choice.options.map((s: any) => ({ label: s.label, blueprintStopId: s.id }));
  const opt = bp.optional.map((s: any) => ({ label: s.label, blueprintStopId: s.id }));
  console.log("optional", opt.map((o: any) => o.label), "wineries", w.map((o: any) => o.label));
  const base = [...core, w[0], w[1]];
  const run = (name: string, m: any[]) => {
    const r = rebuildLiveCommercialAuthority({ anchorTourId: "arrabida-wine-allinclusive", moments: m, edited: true });
    console.log(name, r.safe, r.unsafeReason, r.notes?.join("|"));
  };
  run("base", base);
  const noMarket = base.filter((m: any) => m.blueprintStopId !== "livramento");
  run("noMarket", noMarket);
  for (const c of [...w.slice(2), ...opt]) run("sub " + c.label, [c, ...noMarket]);
});
