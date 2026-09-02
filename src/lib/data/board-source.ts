import type { StoredCutoff } from "./cutoff-window";
import { getLatestStoredCutoff } from "./live-history";
import { isLiveWzBoard, overlayLiveMetrics } from "./queries";
import type { BoardMetrics, LiveWzBoard, Mode } from "./types";

/**
 * Where the "current" cutoff on a board actually comes from:
 * - `live`   — the CODMunity Top 250 response
 * - `stored` — the newest row in `snapshots` (live API down; WZ-12)
 * - `none`   — no live board and no stored snapshot yet
 *
 * `generate.ts` seed data is never one of these for the active WZ season.
 */
export type CutoffSource = "live" | "stored" | "none";

export type ResolvedCutoff = {
  source: CutoffSource;
  cutoffSr: number | null;
  rank1Sr: number | null;
  capturedAt: string | null;
  live: LiveWzBoard | null;
  stored: StoredCutoff | null;
};

type HistoryAvgs = {
  change24h: number | null;
  avgPerDaySeason: number | null;
  avgPerDay7d: number | null;
};

/**
 * WZ-12 rule 1: the board roster to render. The live roster wins; for the
 * active WZ season a missing live board renders nothing (never the `db()` seed
 * roster); archived seasons and MP keep their seed rows.
 */
export function resolveBoardRows<T>(
  liveRows: T[] | undefined,
  seedRows: T[] | undefined,
  isLiveBoard: boolean,
): T[] | null {
  if (liveRows) return liveRows;
  if (isLiveBoard) return null;
  return seedRows ?? null;
}

/** Pure live → stored → none precedence. Injected/known inputs only. */
export function resolveCutoff(
  live: LiveWzBoard | null,
  stored: StoredCutoff | null,
): ResolvedCutoff {
  if (live) {
    return {
      source: "live",
      cutoffSr: live.cutoffSr,
      rank1Sr: live.rank1Sr,
      capturedAt: live.fetchedAt,
      live,
      stored,
    };
  }
  if (stored) {
    return {
      source: "stored",
      cutoffSr: stored.cutoffSr,
      rank1Sr: stored.rank1Sr,
      capturedAt: stored.capturedAt,
      live: null,
      stored,
    };
  }
  return {
    source: "none",
    cutoffSr: null,
    rank1Sr: null,
    capturedAt: null,
    live: null,
    stored: null,
  };
}

/**
 * The `BoardMetrics` to render for the cutoff numeral / heading.
 *
 * Rule (WZ-12): for the active WZ season we render live or stored metrics, or
 * nothing — never the seed numeral. Archived seasons and MP keep their seed
 * snapshots, which are real recorded history.
 */
export function currentCutoffMetrics(params: {
  seed: BoardMetrics | null;
  resolved: ResolvedCutoff;
  isLiveBoard: boolean;
  history?: HistoryAvgs;
}): BoardMetrics | null {
  const { seed, resolved, isLiveBoard, history } = params;

  if (!isLiveBoard) return seed;

  if (resolved.source === "live" && resolved.live && seed) {
    return overlayLiveMetrics(seed, resolved.live, history?.change24h ?? null, {
      avgPerDaySeason: history?.avgPerDaySeason ?? null,
      avgPerDay7d: history?.avgPerDay7d ?? null,
    });
  }

  if (resolved.source === "stored" && resolved.stored) {
    return {
      cutoffSr: resolved.stored.cutoffSr,
      change24h: null,
      avgPerDaySeason: null,
      avgPerDay7d: null,
      playersSampled: seed?.playersSampled ?? 250,
      capturedAt: resolved.stored.capturedAt,
    };
  }

  return null;
}

/**
 * Single entry point for a page: given the already-fetched live board and seed
 * metrics, resolve the real cutoff source and the metrics to render. Only hits
 * the DB for a stored snapshot when the live board is down and the season is the
 * active WZ one.
 */
export async function getBoardCutoff(params: {
  mode: Mode;
  seasonId: string;
  live: LiveWzBoard | null;
  seed: BoardMetrics | null;
  history?: HistoryAvgs;
  fetchStored?: (mode: Mode, seasonId: string) => Promise<StoredCutoff | null>;
}): Promise<{ resolved: ResolvedCutoff; metrics: BoardMetrics | null }> {
  const { mode, seasonId, live, seed, history } = params;
  const fetchStored = params.fetchStored ?? getLatestStoredCutoff;
  const isLiveBoard = isLiveWzBoard(mode, seasonId);

  const stored =
    !live && isLiveBoard ? await fetchStored(mode, seasonId) : null;
  const resolved = resolveCutoff(live, stored);
  const metrics = currentCutoffMetrics({ seed, resolved, isLiveBoard, history });

  return { resolved, metrics };
}
