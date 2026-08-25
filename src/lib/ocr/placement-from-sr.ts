import { WZ_PLACEMENTS, type WzPlacementId } from "@/lib/ranked";

const PLACEMENT_SR_VALUES = new Set(WZ_PLACEMENTS.map((p) => p.placementSr));

export function isValidPlacementSr(value: number): boolean {
  return PLACEMENT_SR_VALUES.has(value);
}

export function placementIdFromSr(placementSr: number): WzPlacementId | undefined {
  return WZ_PLACEMENTS.find((p) => p.placementSr === placementSr)?.id;
}
