import { composeHybridDay } from "../src/components/studio-v3/studioHybridComposition";
const authored = [
  { index:0, label:"Baía de Setúbal", story:"", lat:null, lng:null },
  { index:1, label:"Roman Ruins of Troia", story:"", lat:null, lng:null },
  { index:2, label:"Marina de Tróia", story:"", lat:null, lng:null },
  { index:3, label:"Cais Palafítico do Porto da Carrasqueira", story:"", lat:null, lng:null },
  { index:4, label:"Comporta", story:"", lat:null, lng:null },
] as any;
const r = composeHybridDay(authored, {
  skeletonTourId: "troia-comporta",
  feeling: "coastal",
  interests: ["gastronomy","local-life"],
  rhythm: "balanced",
  wineIntent: null,
  dateExact: null,
  mandatoryOperationalLabels: [],
  internalTransitMinutes: 0,
  unverifiedConnectorLabels: [],
  mobilityConcern: false,
  pickupCoord: null,
  commercialContainment: true,
} as any);
console.log(JSON.stringify({
  passthrough: r.passthrough, reason: r.passthroughReason,
  status: r.composition?.status,
  missingDimensions: r.composition?.missingDimensions,
  missingRequiredTypes: r.composition?.missingRequiredTypes,
  moments: r.composition?.moments.map((m:any)=>[m.stopId,m.type,m.durationMin]), rejected: (r.composition as any)?.rejected ?? (r.composition as any)?.rejections,
}, null, 2));
const r2:any = (globalThis as any);
