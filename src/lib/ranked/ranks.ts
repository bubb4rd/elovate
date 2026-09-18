export type DivisionId =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "crimson"
  | "iridescent"
  | "top250";

export type Tier = 1 | 2 | 3;

export type RankInfo = {
  division: DivisionId;
  divisionLabel: string;
  tier: Tier | null;
  label: string;
  minSr: number;
  nextTierSr: number | null;
  nextDivisionSr: number | null;
  floorSr: number;
  fee: number;
};

export const IRIDESCENT_SR = 10_000;

const ROMAN: Record<Tier, string> = { 1: "I", 2: "II", 3: "III" };

export const TIER_ROMAN = ROMAN;

export type DivisionTone = {
  fill: string;
  fill2: string;
  glow: string;
  text: string;
};

export const DIVISION_TONE: Record<DivisionId, DivisionTone> = {
  bronze: { fill: "#6b4220", fill2: "#c4894a", glow: "#c4894a", text: "#e8c39a" },
  silver: { fill: "#5c656e", fill2: "#c5ccd4", glow: "#c5ccd4", text: "#dce1e6" },
  gold: { fill: "#9c620c", fill2: "#f2c81d", glow: "#f2c81d", text: "#f7dd4d" },
  platinum: { fill: "#2f6d7d", fill2: "#8ed4e6", glow: "#7ecadf", text: "#bfeaf4" },
  diamond: { fill: "#155a88", fill2: "#5ec8f5", glow: "#4ab8ea", text: "#b8e8ff" },
  crimson: { fill: "#6e1224", fill2: "#e23a4a", glow: "#e23a4a", text: "#ff8a96" },
  // Matches the app's canonical pastel iridescent look (see IRIDESCENT_GRADIENT
  // in lib/profile/themes.ts) — the old #6a1b9a/#ff4fc4 saturated purple/pink
  // read as the unrelated "Nebula" theme instead.
  iridescent: { fill: "#CED9EF", fill2: "#E2C6EE", glow: "#F5C7E8", text: "#E2C6EE" },
  // Top 250 uses the same tone as Gold by design (was previously a
  // purple/gold blend via a different `fill`, mismatched with the rest).
  top250: { fill: "#9c620c", fill2: "#f2c81d", glow: "#f2c81d", text: "#f7dd4d" },
};

export type SrFeeTriplet = readonly [number, number, number];

export type SrDivisionSchedule = {
  id: Exclude<DivisionId, "top250">;
  label: string;
  minSr: number;
  nextSr: number | null;
  fees: SrFeeTriplet | null;
  tiers: 1 | 3;
  /**
   * Explicit tier-start SR values for this division under this schedule.
   * When omitted, tier starts are interpolated evenly across [minSr, nextSr)
   * via `tierStarts()`. Diamond/Crimson pin the official breakpoints here
   * (Crimson's even interpolation drifts to 8333/9167 instead of the real
   * 8300/9100). Bronze/Silver/Gold/Platinum breakpoints are unconfirmed by
   * any patch notes we have, so they keep the legacy interpolation.
   */
  tierStartsOverride?: SrFeeTriplet;
};

export type IridescentFeeStep = {
  readonly minSr: number;
  readonly fee: number;
};

export type SrSchedule = {
  id: string;
  divisions: readonly SrDivisionSchedule[];
  /** Ascending step table: fee in effect once SR reaches `minSr`, until the next step. */
  iridescentFees: readonly IridescentFeeStep[];
};

/** Legacy / pre-Season 6 fee schedule. Kept verbatim so historical replay of old seasons stays reproducible. */
export const SCHEDULE_PRE_S06: SrSchedule = {
  id: "pre_s06",
  divisions: [
    { id: "bronze", label: "Bronze", minSr: 0, nextSr: 900, fees: [0, 0, 0], tiers: 3 },
    { id: "silver", label: "Silver", minSr: 900, nextSr: 2100, fees: [20, 25, 30], tiers: 3 },
    { id: "gold", label: "Gold", minSr: 2100, nextSr: 3600, fees: [35, 40, 45], tiers: 3 },
    { id: "platinum", label: "Platinum", minSr: 3600, nextSr: 5400, fees: [50, 55, 60], tiers: 3 },
    {
      id: "diamond",
      label: "Diamond",
      minSr: 5400,
      nextSr: 7500,
      fees: [65, 70, 75],
      tiers: 3,
      tierStartsOverride: [5400, 6100, 6800],
    },
    {
      id: "crimson",
      label: "Crimson",
      minSr: 7500,
      nextSr: IRIDESCENT_SR,
      fees: [85, 95, 110],
      tiers: 3,
      tierStartsOverride: [7500, 8300, 9100],
    },
    { id: "iridescent", label: "Iridescent", minSr: IRIDESCENT_SR, nextSr: null, fees: null, tiers: 1 },
  ],
  iridescentFees: [
    { minSr: 10_000, fee: 120 },
    { minSr: 10_500, fee: 130 },
    { minSr: 11_000, fee: 140 },
    { minSr: 11_500, fee: 150 },
    { minSr: 12_000, fee: 160 },
    { minSr: 12_500, fee: 170 },
    { minSr: 13_000, fee: 180 },
    { minSr: 13_500, fee: 190 },
    { minSr: 14_000, fee: 200 },
    { minSr: 14_500, fee: 210 },
    { minSr: 15_000, fee: 220 },
  ],
};

/**
 * Season 6 fee schedule. Deployment fees increase in Diamond and above,
 * compressing max-earnable SR per match (275 - fee). SR division breakpoints
 * are unchanged from prior seasons. SR Challenges are removed entirely in
 * S06 — this codebase never modeled that feature, so there's nothing to change.
 */
export const SCHEDULE_S06: SrSchedule = {
  id: "s06",
  divisions: [
    { id: "bronze", label: "Bronze", minSr: 0, nextSr: 900, fees: [0, 0, 0], tiers: 3 },
    { id: "silver", label: "Silver", minSr: 900, nextSr: 2100, fees: [20, 25, 30], tiers: 3 },
    { id: "gold", label: "Gold", minSr: 2100, nextSr: 3600, fees: [35, 40, 45], tiers: 3 },
    { id: "platinum", label: "Platinum", minSr: 3600, nextSr: 5400, fees: [50, 55, 60], tiers: 3 },
    {
      id: "diamond",
      label: "Diamond",
      minSr: 5400,
      nextSr: 7500,
      fees: [75, 85, 95],
      tiers: 3,
      tierStartsOverride: [5400, 6100, 6800],
    },
    {
      id: "crimson",
      label: "Crimson",
      minSr: 7500,
      nextSr: IRIDESCENT_SR,
      fees: [130, 135, 140],
      tiers: 3,
      tierStartsOverride: [7500, 8300, 9100],
    },
    { id: "iridescent", label: "Iridescent", minSr: IRIDESCENT_SR, nextSr: null, fees: null, tiers: 1 },
  ],
  iridescentFees: [
    { minSr: 10_000, fee: 170 },
    { minSr: 10_500, fee: 190 },
    { minSr: 11_000, fee: 200 },
    { minSr: 11_500, fee: 210 },
    { minSr: 12_000, fee: 220 },
    { minSr: 12_500, fee: 230 },
    { minSr: 13_000, fee: 240 },
    { minSr: 13_500, fee: 255 },
    { minSr: 14_000, fee: 260 },
    { minSr: 14_500, fee: 265 },
    { minSr: 15_000, fee: 270 },
  ],
};

/** Season currently live. Update this when rolling over to a new SR economy. */
export const ACTIVE_SCHEDULE: SrSchedule = SCHEDULE_S06;

function seasonNumber(seasonId: string): number | null {
  const match = /^s(\d+)$/i.exec(seasonId.trim());
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

/** Resolve the fee schedule that applied for a given season id (e.g. "s5", "s6"). Defaults to the active schedule. */
export function srScheduleForSeason(seasonId?: string | null): SrSchedule {
  if (seasonId) {
    const n = seasonNumber(seasonId);
    if (n != null && n < 6) return SCHEDULE_PRE_S06;
  }
  return ACTIVE_SCHEDULE;
}

/** Back-compat view over the active schedule's divisions, in the shape older call sites expect. */
export const DIVISIONS: readonly SrDivisionSchedule[] = ACTIVE_SCHEDULE.divisions;

export function clampSr(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function iridescentFee(sr: number, schedule: SrSchedule = ACTIVE_SCHEDULE): number {
  const value = clampSr(sr);
  const steps = schedule.iridescentFees;
  let fee = steps[0]?.fee ?? 0;
  for (const step of steps) {
    if (value >= step.minSr) fee = step.fee;
    else break;
  }
  return fee;
}

export function tierStarts(minSr: number, nextSr: number, tiers: number): number[] {
  return Array.from({ length: tiers }, (_, i) => minSr + Math.round(((nextSr - minSr) * i) / tiers));
}

function divisionTierStarts(div: SrDivisionSchedule): readonly number[] {
  if (div.tierStartsOverride) return div.tierStartsOverride;
  if (div.tiers === 3 && div.nextSr != null) return tierStarts(div.minSr, div.nextSr, 3);
  return [div.minSr];
}

function divisionById(id: Exclude<DivisionId, "top250">, schedule: SrSchedule): SrDivisionSchedule {
  const found = schedule.divisions.find((d) => d.id === id);
  if (!found) throw new Error(`Unknown division ${id}`);
  return found;
}

function tierIndex(starts: readonly number[], sr: number): number {
  for (let i = starts.length - 1; i >= 0; i--) {
    if (sr >= starts[i]!) return i;
  }
  return 0;
}

function formatRankLabel(divisionLabel: string, tier: Tier | null): string {
  if (tier == null) return divisionLabel;
  return `${divisionLabel} ${ROMAN[tier]}`;
}

export type RankThreshold = {
  sr: number;
  label: string;
  division: DivisionId;
  tier: Tier | null;
};

export function rankThresholds(cutoffSr?: number | null, schedule: SrSchedule = ACTIVE_SCHEDULE): RankThreshold[] {
  const out: RankThreshold[] = [];
  for (const div of schedule.divisions) {
    if (div.tiers === 3 && div.nextSr != null) {
      const starts = divisionTierStarts(div);
      starts.forEach((sr, i) => {
        const tier = (i + 1) as Tier;
        out.push({
          sr,
          label: formatRankLabel(div.label, tier),
          division: div.id,
          tier,
        });
      });
    } else {
      out.push({
        sr: div.minSr,
        label: div.label,
        division: div.id,
        tier: null,
      });
    }
  }
  if (cutoffSr != null && cutoffSr > IRIDESCENT_SR) {
    out.push({
      sr: cutoffSr,
      label: "Top 250",
      division: "top250",
      tier: null,
    });
  }
  return out;
}

export function rankFromSr(
  sr: number,
  cutoffSr?: number | null,
  schedule: SrSchedule = ACTIVE_SCHEDULE,
): RankInfo {
  const value = clampSr(sr);
  const cutoff =
    cutoffSr != null && Number.isFinite(cutoffSr) ? Math.max(IRIDESCENT_SR, Math.floor(cutoffSr)) : null;

  if (cutoff != null && value >= cutoff) {
    return {
      division: "top250",
      divisionLabel: "Top 250",
      tier: null,
      label: "Top 250",
      minSr: cutoff,
      nextTierSr: null,
      nextDivisionSr: null,
      floorSr: cutoff,
      fee: iridescentFee(value, schedule),
    };
  }

  if (value >= IRIDESCENT_SR) {
    const iri = divisionById("iridescent", schedule);
    return {
      division: "iridescent",
      divisionLabel: iri.label,
      tier: null,
      label: iri.label,
      minSr: IRIDESCENT_SR,
      nextTierSr: cutoff != null && cutoff > value ? cutoff : null,
      nextDivisionSr: cutoff != null && cutoff > value ? cutoff : null,
      floorSr: IRIDESCENT_SR,
      fee: iridescentFee(value, schedule),
    };
  }

  let div = schedule.divisions[0]!;
  for (const candidate of schedule.divisions) {
    if (value >= candidate.minSr) div = candidate;
  }

  const nextDivisionSr = div.nextSr;
  if (div.tiers === 3 && div.nextSr != null && div.fees) {
    const starts = divisionTierStarts(div);
    const index = tierIndex(starts, value);
    const tier = (index + 1) as Tier;
    const nextTierSr = index < 2 ? starts[index + 1]! : div.nextSr;
    return {
      division: div.id,
      divisionLabel: div.label,
      tier,
      label: formatRankLabel(div.label, tier),
      minSr: starts[index]!,
      nextTierSr,
      nextDivisionSr,
      floorSr: div.minSr,
      fee: div.fees[index]!,
    };
  }

  return {
    division: div.id,
    divisionLabel: div.label,
    tier: null,
    label: div.label,
    minSr: div.minSr,
    nextTierSr: nextDivisionSr,
    nextDivisionSr,
    floorSr: div.minSr,
    fee: 0,
  };
}

export function deploymentFee(
  sr: number,
  cutoffSr?: number | null,
  schedule: SrSchedule = ACTIVE_SCHEDULE,
): number {
  return rankFromSr(sr, cutoffSr, schedule).fee;
}

export function gamesToTarget(remaining: number, net: number): number | null {
  if (remaining <= 0) return 0;
  if (net <= 0) return null;
  return Math.ceil(remaining / net);
}

export type ClimbTarget = "nextTier" | "nextDivision" | "iridescent" | "top250";

export type BoardRung = {
  rank: number;
  sr: number;
};

function sortedLadder(ladder: readonly BoardRung[]): BoardRung[] {
  return [...ladder].sort((a, b) => a.rank - b.rank);
}

export function estimatedBoardRank(sr: number, ladder: readonly BoardRung[]): number | null {
  if (ladder.length === 0) return null;
  const value = clampSr(sr);
  const sorted = sortedLadder(ladder);
  const cutoff = sorted[sorted.length - 1];
  if (!cutoff || value < cutoff.sr) return null;
  const better = sorted.filter((rung) => rung.sr > value).length;
  return better + 1;
}

export function boardRankLabel(rank: number): string {
  return `#${rank}`;
}

export function nextBoardTarget(
  sr: number,
  ladder: readonly BoardRung[],
): { rank: number; sr: number; label: string; reached: boolean } | null {
  if (ladder.length === 0) return null;
  const value = clampSr(sr);
  const sorted = sortedLadder(ladder);
  const cutoff = sorted[sorted.length - 1];
  if (!cutoff || value < cutoff.sr) return null;

  const better = sorted.filter((rung) => rung.sr > value);
  if (better.length === 0) {
    const top = sorted[0]!;
    return { rank: top.rank, sr: top.sr, label: boardRankLabel(top.rank), reached: true };
  }

  const next = better[better.length - 1]!;
  return { rank: next.rank, sr: next.sr, label: boardRankLabel(next.rank), reached: false };
}

export function resolveTarget(
  sr: number,
  target: ClimbTarget,
  cutoffSr?: number | null,
): { sr: number; label: string; reached: boolean } {
  const value = clampSr(sr);
  const rank = rankFromSr(value, cutoffSr);
  const cutoff =
    cutoffSr != null && Number.isFinite(cutoffSr) ? Math.max(IRIDESCENT_SR, Math.floor(cutoffSr)) : null;

  if (target === "iridescent") {
    return { sr: IRIDESCENT_SR, label: "Iridescent", reached: value >= IRIDESCENT_SR };
  }
  if (target === "top250") {
    const line = cutoff ?? IRIDESCENT_SR;
    return { sr: line, label: "Top 250", reached: value >= line };
  }
  if (target === "nextDivision") {
    const next = rank.nextDivisionSr;
    if (next == null) {
      return { sr: value, label: rank.label, reached: true };
    }
    const nextRank = rankFromSr(next, cutoffSr);
    return { sr: next, label: nextRank.label, reached: value >= next };
  }
  const next = rank.nextTierSr;
  if (next == null) {
    return { sr: value, label: rank.label, reached: true };
  }
  const nextRank = rankFromSr(next, cutoffSr);
  return { sr: next, label: nextRank.label, reached: value >= next };
}
