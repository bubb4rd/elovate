import { clampSr, deploymentFee, gamesToTarget } from "./ranks";

export const WZ_ELIM_CAP = 150;
export const WZ_SQUAD_ELIM_SR = 5;
export const WZ_PLAYER_ELIM_SR = 3.5;
export const WZ_SQUAD_SIZE = 4;
export const WZ_PLACEMENT_MAX = 125;

export type WzPlacementId = "first" | "top4" | "top6" | "top8" | "top10" | "top13" | "top15";

export type WzPlacement = {
  id: WzPlacementId;
  label: string;
  placementSr: number;
  elimSr: number;
  highlight: boolean;
};

export const WZ_PLACEMENTS: readonly WzPlacement[] = [
  { id: "first", label: "1st", placementSr: 125, elimSr: 5, highlight: true },
  { id: "top4", label: "Top 4", placementSr: 100, elimSr: 4, highlight: true },
  { id: "top6", label: "Top 6", placementSr: 50, elimSr: 4, highlight: false },
  { id: "top8", label: "Top 8", placementSr: 30, elimSr: 3, highlight: false },
  { id: "top10", label: "Top 10", placementSr: 20, elimSr: 3, highlight: false },
  { id: "top13", label: "Top 13", placementSr: 10, elimSr: 2, highlight: false },
  { id: "top15", label: "Top 15", placementSr: 0, elimSr: 2, highlight: false },
] as const;

export type ResultPreset = {
  id: WzPlacementId;
  label: string;
  elims: number;
};

export const RESULT_PRESETS: readonly ResultPreset[] = [
  { id: "first", label: "Max win", elims: 8 },
  { id: "top4", label: "Top 4", elims: 6 },
  { id: "top6", label: "Top 6", elims: 5 },
  { id: "top8", label: "Top 8", elims: 4 },
];

const RANK_DELTA_BONUS = [1, 1, 2, 3, 3, 4, 5] as const;

export type RankDelta = -3 | -2 | -1 | 0 | 1 | 2 | 3;

export function rankDeltaBonus(delta: number): number {
  const i = Math.min(6, Math.max(0, Math.round(delta) + 3));
  return RANK_DELTA_BONUS[i]!;
}

export function squadElimBaseline(squadElims: number): number {
  const squad = Math.max(0, Math.floor(squadElims));
  return squad / WZ_SQUAD_SIZE;
}

export function elimSrPerKill(placement: WzPlacement, rankDelta: number): number {
  return placement.elimSr + rankDeltaBonus(rankDelta);
}

export function elimSrBreakdown(
  squadElims: number,
  yourElims: number,
): { yourSr: number; squadSr: number; elimSr: number; capped: boolean } {
  const squad = Math.max(0, Math.floor(squadElims));
  const yours = Math.max(0, Math.floor(yourElims));
  const squadRaw = squad * WZ_SQUAD_ELIM_SR;
  const yourRaw = Math.ceil(yours * WZ_PLAYER_ELIM_SR);
  const raw = squadRaw + yourRaw;
  if (raw <= WZ_ELIM_CAP) {
    return { yourSr: yourRaw, squadSr: squadRaw, elimSr: raw, capped: false };
  }
  const yourSr = Math.min(WZ_ELIM_CAP, Math.ceil((yourRaw / raw) * WZ_ELIM_CAP));
  const squadSr = WZ_ELIM_CAP - yourSr;
  return { yourSr, squadSr, elimSr: WZ_ELIM_CAP, capped: true };
}

export function elimSrTotal(
  _placement: WzPlacement,
  squadElims: number,
  yourElims: number,
  _rankDelta: number,
): number {
  return elimSrBreakdown(squadElims, yourElims).elimSr;
}

export function wzNetSr(args: {
  sr: number;
  placement: WzPlacement;
  squadElims: number;
  yourElims: number;
  rankDelta: number;
  cutoffSr?: number | null;
}): { net: number; placementSr: number; elimSr: number; fee: number } {
  const fee = deploymentFee(args.sr, args.cutoffSr);
  const placementSr = args.placement.placementSr;
  const elim = elimSrTotal(args.placement, args.squadElims, args.yourElims, args.rankDelta);
  return {
    net: placementSr + elim - fee,
    placementSr,
    elimSr: elim,
    fee,
  };
}

export function breakEvenElims(args: {
  sr: number;
  placement: WzPlacement;
  yourElims: number;
  rankDelta: number;
  cutoffSr?: number | null;
}): number | null {
  const fee = deploymentFee(args.sr, args.cutoffSr);
  if (args.placement.placementSr - fee > 0) return 0;
  const yours = Math.max(0, Math.floor(args.yourElims));
  const needFromElims = fee - args.placement.placementSr + 1;
  const coveredByPlayer = Math.ceil(yours * WZ_PLAYER_ELIM_SR);
  if (coveredByPlayer >= needFromElims) return 0;
  const needFromSquad = needFromElims - coveredByPlayer;
  const squadNeeded = Math.ceil(needFromSquad / WZ_SQUAD_ELIM_SR);
  if (squadNeeded * WZ_SQUAD_ELIM_SR + coveredByPlayer > WZ_ELIM_CAP) return null;
  return squadNeeded;
}

export function wzGamesToTarget(args: {
  currentSr: number;
  targetSr: number;
  placement: WzPlacement;
  squadElims: number;
  yourElims: number;
  rankDelta: number;
  cutoffSr?: number | null;
}): { net: number; games: number | null; remaining: number; breakEvenElims: number | null } {
  const currentSr = clampSr(args.currentSr);
  const remaining = Math.max(0, Math.floor(args.targetSr) - currentSr);
  const { net } = wzNetSr({
    sr: currentSr,
    placement: args.placement,
    squadElims: args.squadElims,
    yourElims: args.yourElims,
    rankDelta: args.rankDelta,
    cutoffSr: args.cutoffSr,
  });
  return {
    net,
    games: gamesToTarget(remaining, net),
    remaining,
    breakEvenElims:
      net > 0
        ? null
        : breakEvenElims({
            sr: currentSr,
            placement: args.placement,
            yourElims: args.yourElims,
            rankDelta: args.rankDelta,
            cutoffSr: args.cutoffSr,
          }),
  };
}
