import { composeHybridDay } from "../src/components/studio-v3/studioHybridComposition";
import { resolveCompositionIdentities } from "../src/lib/studio-v3/compositionIdentity";
import { buildCommercialLedger } from "../src/lib/studio-v3/commercialLedger";
const authored = [
  { index:0, label:"Baía de Setúbal", story:"", lat:null, lng:null },
  { index:1, label:"Roman Ruins of Troia", story:"", lat:null, lng:null },
  { index:2, label:"Marina de Tróia", story:"", lat:null, lng:null },
  { index:3, label:"Cais Palafítico do Porto da Carrasqueira", story:"", lat:null, lng:null },
  { index:4, label:"Comporta", story:"", lat:null, lng:null },
] as any;
const r:any = composeHybridDay(authored, { skeletonTourId:"troia-comporta", feeling:"coastal", interests:["gastronomy","local-life"], rhythm:"balanced", wineIntent:null, dateExact:null, mandatoryOperationalLabels:[], internalTransitMinutes:0, unverifiedConnectorLabels:[], mobilityConcern:false, pickupCoord:null, commercialContainment:true } as any);
const kept = resolveCompositionIdentities({ anchorTourId:"troia-comporta", moments:r.composition.moments.map((m:any)=>({label:m.label,inventoryStopId:m.stopId})) });
const om = resolveCompositionIdentities({ anchorTourId:"troia-comporta", moments:r.omitted.filter((m:any)=>m.stopId).map((m:any)=>({label:m.label,inventoryStopId:m.stopId})) });
const led = buildCommercialLedger({ anchorTourId:"troia-comporta", kept:kept.records, omitted:om.records });
console.log("omitted raw", JSON.stringify(r.omitted));
console.log(JSON.stringify({disp:led.disposition, notes:led.notes, entries:led.entries.map((e:any)=>[e.kind,e.inventoryStopId,e.blueprintStopId,e.classification,e.priceAction,e.structuralNote])},null,1));
