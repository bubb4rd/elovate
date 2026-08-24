import { clampSr, rankFromSr } from "./ranks";

export const RANK_UP_PROTECTION_GAMES = 3;

export type ProtectionInput = {
  remaining: number;
  dailyForgive: boolean;
};

export function clampProtectionRemaining(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(RANK_UP_PROTECTION_GAMES, Math.max(0, Math.floor(value)));
}

export function forgivenLossCount(input: ProtectionInput): number {
  return clampProtectionRemaining(input.remaining) + (input.dailyForgive ? 1 : 0);
}

export function protectedFloorSr(sr: number, cutoffSr?: number | null): number {
  return rankFromSr(sr, cutoffSr).floorSr;
}

export function postPromoClimb(args: {
  targetSr: number;
  netAtTarget: number;
  games?: number;
}): { srAfter: number; gained: number } {
  const games = args.games ?? RANK_UP_PROTECTION_GAMES;
  const gained = Math.max(0, args.netAtTarget) * games;
  return {
    gained,
    srAfter: clampSr(args.targetSr) + gained,
  };
}
