// Server-owned Studio V3 add-on catalogue.
//
// Client `src/data/signatureAddOns.ts` is presentation-only; this file is the
// authority for priceUnit, unitEur and routeIntegration. The quote resolver
// consumes ONLY this catalogue when computing line items.

export type AddOnPriceUnit = "per_person" | "per_group" | "per_vehicle" | "fixed";
export type AddOnRouteIntegration = "validated" | "pending-review" | "unavailable";

export interface ServerAddOn {
  id: string;
  label: string;
  priceUnit: AddOnPriceUnit;
  unitEur: number;
  routeIntegration: AddOnRouteIntegration;
  /** Optional stable inclusion IDs contributed to the resolved journey. */
  inclusionIds?: string[];
}

const CATALOGUE: Record<string, ServerAddOn> = {
  "coastal-boat-sesimbra": {
    id: "coastal-boat-sesimbra",
    label: "Coastal boat ride from Sesimbra",
    priceUnit: "per_person",
    unitEur: 30,
    routeIntegration: "pending-review",
    inclusionIds: ["boat-sesimbra"],
  },
};

export function getServerAddOn(id: string): ServerAddOn | null {
  return CATALOGUE[id] ?? null;
}

export function listServerAddOnIds(): string[] {
  return Object.keys(CATALOGUE);
}

export interface AddOnLineItem {
  id: string;
  label: string;
  priceUnit: AddOnPriceUnit;
  unitEur: number;
  quantity: number;
  lineSubtotalEur: number;
  routeIntegration: AddOnRouteIntegration;
  inclusionIds: string[];
}

export function resolveAddOnLine(
  serverAddOn: ServerAddOn,
  guests: number,
  requestedQuantity = 1,
): AddOnLineItem {
  const qty = (() => {
    switch (serverAddOn.priceUnit) {
      case "per_person":
        return guests;
      case "per_vehicle":
        return Math.max(1, Math.ceil(guests / 4)) * Math.max(1, requestedQuantity);
      case "per_group":
      case "fixed":
        return Math.max(1, requestedQuantity);
    }
  })();
  return {
    id: serverAddOn.id,
    label: serverAddOn.label,
    priceUnit: serverAddOn.priceUnit,
    unitEur: serverAddOn.unitEur,
    quantity: qty,
    lineSubtotalEur: serverAddOn.unitEur * qty,
    routeIntegration: serverAddOn.routeIntegration,
    inclusionIds: serverAddOn.inclusionIds ?? [],
  };
}
