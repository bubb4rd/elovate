/**
 * elovate Pro — teammate breakdown analytics (PREM-01).
 *
 * Pure, client-safe. Computes per-teammate performance from the player's own
 * WZ climb history and answers "who should I queue with". See
 * `docs/PREMIUM-FEATURES-DRAFT.md` §3.1.
 *
 * Read surface: the player's own `climb_matches` / `climb_sessions` only —
 * nothing new. The server loader in `./history-queries` feeds this a
 * WZ-scoped `HistoryDocument`.
 */

import type {
  HistoryDocument,
  HistoryTeammate,
  WzHistoryMatch,
} from "@/lib/history";
import { teammateKey } from "@/lib/history";
import { WZ_PLACEMENTS, type WzPlacementId } from "@/lib/ranked";

/** Games with a teammate before they earn a best-duo / drop-queue callout. */
export const MIN_CALLOUT_GAMES = 3;

/**
 * When a teammate has a single match in a session there's no elapsed-time
 * signal, so SR/hour falls back to this nominal match length.
 */
export const NOMINAL_MATCH_MS = 20 * 60 * 1000;

/** Numeric proxy for a placement bucket — its worst finishing rank. */
const PLACEMENT_RANK: Record<WzPlacementId, number> = {
  first: 1,
  top4: 4,
  top6: 6,
  top8: 8,
  top10: 10,
  top13: 13,
  top15: 15,
};

export type TeammateStat = {
  teammate: HistoryTeammate;
  key: string;
  games: number;
  /** Games finished 1st. */
  wins: number;
  /** Share of games with net > 0, 0..1. */
  positiveNetRate: number;
  avgNet: number;
  totalNet: number;
  /** Net SR per hour of logged play, or null when there's no time signal. */
  srPerHour: number | null;
  /** Mean finishing rank (lower is better), e.g. 6.8 ≈ "T6". */
  avgPlacement: number;
  /** Your share of squad elims across games where squad elims were logged, or null. */
  yourElimShare: number | null;
};

export type TeammateBreakdown = {
  /** All teammates, most total SR gained first. */
  rows: TeammateStat[];
  /** Rows with at least {@link MIN_CALLOUT_GAMES} games. */
  qualified: TeammateStat[];
  /** Highest average net among qualified rows that are net-positive. */
  bestDuo: TeammateStat | null;
  /** Lowest average net among qualified rows, only when it's net-negative. */
  dropQueue: TeammateStat | null;
  /** Total WZ games that had at least one named teammate. */
  gamesWithTeammates: number;
  /** One computed sentence for the free teaser / section subhead. */
  insight: string | null;
};

function isWz(match: { mode: string }): match is WzHistoryMatch {
  return match.mode === "wz";
}

function signed(value: number): string {
  const r = Math.round(value);
  return r > 0 ? `+${r}` : `${r}`;
}

function placementLabel(avgRank: number): string {
  // Nearest bucket at or worse than the average rank.
  const bucket =
    [...WZ_PLACEMENTS].reverse().find((p) => PLACEMENT_RANK[p.id] <= avgRank) ??
    WZ_PLACEMENTS[0]!;
  return bucket.label;
}

type Accum = {
  teammate: HistoryTeammate;
  key: string;
  net: number[];
  wins: number;
  placementRanks: number[];
  yourElims: number;
  squadElims: number;
  /** Match timestamps (ms) grouped by session. */
  bySession: Map<string, number[]>;
};

function estimateHours(bySession: Map<string, number[]>): number {
  let ms = 0;
  for (const stamps of bySession.values()) {
    if (stamps.length <= 1) {
      ms += NOMINAL_MATCH_MS;
      continue;
    }
    const sorted = [...stamps].sort((a, b) => a - b);
    ms += Math.max(sorted.at(-1)! - sorted[0]!, NOMINAL_MATCH_MS);
  }
  return ms / 3_600_000;
}

export function computeTeammateBreakdown(
  doc: HistoryDocument,
): TeammateBreakdown {
  const wz = doc.matches.filter(isWz);
  const accums = new Map<string, Accum>();
  let gamesWithTeammates = 0;

  for (const match of wz) {
    if (match.teammates.length > 0) gamesWithTeammates += 1;
    const ts = Date.parse(match.createdAt);
    for (const teammate of match.teammates) {
      const key = teammateKey(teammate);
      let accum = accums.get(key);
      if (!accum) {
        accum = {
          teammate,
          key,
          net: [],
          wins: 0,
          placementRanks: [],
          yourElims: 0,
          squadElims: 0,
          bySession: new Map(),
        };
        accums.set(key, accum);
      }
      accum.net.push(match.net);
      if (match.placement === "first") accum.wins += 1;
      accum.placementRanks.push(PLACEMENT_RANK[match.placement]);
      if (match.squadElims > 0) {
        accum.yourElims += match.yourElims;
        accum.squadElims += match.squadElims;
      }
      if (!Number.isNaN(ts)) {
        const stamps = accum.bySession.get(match.sessionId) ?? [];
        stamps.push(ts);
        accum.bySession.set(match.sessionId, stamps);
      }
    }
  }

  const rows: TeammateStat[] = [...accums.values()]
    .map((accum) => {
      const games = accum.net.length;
      const totalNet = accum.net.reduce((sum, n) => sum + n, 0);
      const positives = accum.net.filter((n) => n > 0).length;
      const hours = estimateHours(accum.bySession);
      return {
        teammate: accum.teammate,
        key: accum.key,
        games,
        wins: accum.wins,
        positiveNetRate: games === 0 ? 0 : positives / games,
        avgNet: games === 0 ? 0 : totalNet / games,
        totalNet,
        srPerHour: hours > 0 ? totalNet / hours : null,
        avgPlacement:
          accum.placementRanks.reduce((sum, r) => sum + r, 0) /
          Math.max(accum.placementRanks.length, 1),
        yourElimShare:
          accum.squadElims > 0 ? accum.yourElims / accum.squadElims : null,
      };
    })
    .sort((a, b) => b.totalNet - a.totalNet);

  const qualified = rows.filter((row) => row.games >= MIN_CALLOUT_GAMES);

  const bestDuo =
    qualified
      .filter((row) => row.avgNet > 0)
      .sort((a, b) => b.avgNet - a.avgNet)[0] ?? null;

  const worst = [...qualified].sort((a, b) => a.avgNet - b.avgNet)[0] ?? null;
  const dropQueue = worst && worst.avgNet < 0 ? worst : null;

  return {
    rows,
    qualified,
    bestDuo,
    dropQueue,
    gamesWithTeammates,
    insight: buildInsight({ rows, qualified, bestDuo, dropQueue }),
  };
}

function buildInsight(
  b: Pick<TeammateBreakdown, "rows" | "qualified" | "bestDuo" | "dropQueue">,
): string | null {
  const name = (row: TeammateStat) => row.teammate.displayName;

  if (b.bestDuo && b.dropQueue && b.bestDuo.key !== b.dropQueue.key) {
    return `You're ${signed(b.bestDuo.avgNet)} SR/game with ${name(b.bestDuo)} and ${signed(
      b.dropQueue.avgNet,
    )} with ${name(b.dropQueue)} — full breakdown inside.`;
  }
  if (b.bestDuo) {
    return `Your best queue is ${name(b.bestDuo)} at ${signed(b.bestDuo.avgNet)} SR/game across ${b.bestDuo.games} games.`;
  }
  if (b.dropQueue) {
    return `${name(b.dropQueue)} is costing you ${signed(b.dropQueue.avgNet)} SR/game over ${b.dropQueue.games} games.`;
  }
  const mostPlayed = [...b.rows].sort((a, z) => z.games - a.games)[0];
  if (mostPlayed) {
    return `${name(mostPlayed)} is your most-played duo at ${signed(mostPlayed.avgNet)} SR/game — Pro ranks every teammate.`;
  }
  return null;
}

/** Human label for an average placement, e.g. `avgPlacementLabel(6.8) === "T6"`. */
export function avgPlacementLabel(avgRank: number): string {
  return placementLabel(avgRank);
}
