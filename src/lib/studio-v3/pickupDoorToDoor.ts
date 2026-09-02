/**
 * STUDIO V3 — PICKUP-AWARE DOOR-TO-DOOR WIRING (no new timing authority).
 *
 * This module owns NO arithmetic. It is the thin adapter that lets the live
 * Studio surfaces (logistics revalidation, Add/Swap admission after pickup is
 * known, and the Stripe seam) call the ONE canonical authority in
 * `doorToDoorAuthority.ts` with the CURRENT frozen route, the CURRENT selected
 * add-on minutes (counted exactly once) and the CURRENT pickup/drop-off truth.
 *
 * Rules encoded here:
 *  - The frozen day is NEVER mutated or recomposed by a pickup change; the
 *    caller passes the committed route and receives a verdict only.
 *  - Drop-off defaults to the pickup zone — the existing product assumption.
 *  - No geocoder, no invented coordinates. Until an approved exact-address
 *    resolution exists, the proven pickup ZONE centroid is the origin and the
 *    certification is explicitly NOT flagged as exact-address.
 *  - Unknown pickup ⇒ `not-evaluable`. That is a legitimate state BEFORE
 *    logistics (never a blocker for entering logistics) and a fail-closed
 *    state at the payment seam.
 */

import {
  certifyDoorToDoor,
  certifyDoorToDoorAdmission,
  doorToDoorAllowsCheckout,
  type DoorToDoorCertification,
  type LatLng,
} from "@/lib/studio-v3/doorToDoorAuthority";
import type { TimeAuthorityStop } from "@/lib/studio-v3/timeAuthority";
import type { Rhythm } from "@/components/studio-v3/types";

/** The shape every authored/frozen Studio route point already carries. */
export interface FrozenMomentLike {
  label: string;
  lat?: number | null;
  lng?: number | null;
  inventoryStopId?: string | null;
  blueprintStopId?: string | null;
  durationMinutes?: number | null;
  durationSource?: TimeAuthorityStop["durationSource"] | null;
}

/** Structural projection — identical to the one the time authority expects. */
export function toTimeAuthorityStops(
  points: ReadonlyArray<FrozenMomentLike>,
): TimeAuthorityStop[] {
  return points.map((p) => ({
    stopId: p.inventoryStopId ?? p.blueprintStopId ?? "",
    label: p.label,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    durationMinutes: p.durationMinutes ?? null,
    durationSource: p.durationSource ?? null,
  }));
}

export interface FrozenDayCertificationInput {
  /** The FROZEN committed route, in order. Never recomposed here. */
  points: ReadonlyArray<FrozenMomentLike>;
  /** Canonical pickup zone coordinate (`pickupOriginCoord`), or null. */
  pickupCoord: LatLng | null;
  /** Defaults to the pickup zone — the existing product assumption. */
  dropoffCoord?: LatLng | null;
  /** Minutes committed by the current add-on basket. Counted exactly once. */
  addOnsMinutes?: number;
  rhythm?: Rhythm | null;
}

/**
 * Recertify the frozen day door-to-door from the known pickup zone.
 * Returns `not-evaluable` (never a silent pass) when pickup is unknown.
 */
export function certifyFrozenDayFromPickup(
  input: FrozenDayCertificationInput,
): DoorToDoorCertification {
  return certifyDoorToDoor({
    stops: toTimeAuthorityStops(input.points),
    pickupCoord: input.pickupCoord,
    dropoffCoord: input.dropoffCoord ?? input.pickupCoord,
    ...(typeof input.addOnsMinutes === "number" ? { addOnsMinutes: input.addOnsMinutes } : {}),
    ...(input.rhythm ? { rhythm: input.rhythm } : {}),
    // No geocoder exists yet: the origin is a proven ZONE, never an exact address.
    originIsExactAddress: false,
  });
}

/**
 * Would admitting one more moment keep the frozen day inside 540 minutes
 * door-to-door, judged on the SAME clock once pickup is known?
 */
export function certifyFrozenDayAdmission(
  input: FrozenDayCertificationInput,
  candidate: FrozenMomentLike,
  options: { insertAt?: number; replaceAt?: number } = {},
): DoorToDoorCertification {
  return certifyDoorToDoorAdmission(
    {
      stops: toTimeAuthorityStops(input.points),
      pickupCoord: input.pickupCoord,
      dropoffCoord: input.dropoffCoord ?? input.pickupCoord,
      ...(typeof input.addOnsMinutes === "number" ? { addOnsMinutes: input.addOnsMinutes } : {}),
      ...(input.rhythm ? { rhythm: input.rhythm } : {}),
      originIsExactAddress: false,
    },
    toTimeAuthorityStops([candidate])[0]!,
    options,
  );
}

/**
 * Stripe seam gate. Re-exported so callers cannot invent a second rule:
 * only an evaluable certification inside the hard max may reach payment.
 */
export function frozenDayAllowsCheckout(cert: DoorToDoorCertification): boolean {
  return doorToDoorAllowsCheckout(cert);
}

/**
 * The single truthful line shown when the chosen pickup pushes the frozen day
 * past the 9-hour door-to-door limit. `null` when there is nothing to say
 * (fits, or not evaluable yet — a missing fact is asked for, never blamed).
 */
export function describePickupDoorToDoorConflict(
  cert: DoorToDoorCertification,
): string | null {
  if (!cert.evaluable) return null;
  if (cert.fitsHardMax) return null;
  return `${cert.reason} We won't quietly cut moments — a curator will confirm the trade-off with you.`;
}
