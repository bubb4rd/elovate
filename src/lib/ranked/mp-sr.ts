import { clampSr, gamesToTarget } from "./ranks";

export const DEFAULT_SR_PER_WIN = 50;
export const DEFAULT_SR_PER_LOSS = 35;

export function mpGamesToTarget(args: {
  currentSr: number;
  targetSr: number;
  srPerWin: number;
}): { net: number; games: number | null; remaining: number } {
  const currentSr = clampSr(args.currentSr);
  const remaining = Math.max(0, Math.floor(args.targetSr) - currentSr);
  const net = Math.max(0, Math.floor(args.srPerWin));
  return {
    net,
    games: gamesToTarget(remaining, net),
    remaining,
  };
}

export function mpLossSr(srPerLoss: number): number {
  return Math.max(0, Math.floor(srPerLoss));
}
