import { daysBetween } from "@/lib/format";
import { db } from "./generate";
import type {
  BoardMetrics,
  BoardRow,
  BoardRung,
  CutoffPoint,
  LiveWzBoard,
  Mode,
  Player,
  Season,
  Snapshot,
} from "./types";

export { getLiveWzBoard } from "./codmunity";

export function listSeasons(): Season[] {
  return [...db().seasons].sort((a, b) => (a.startsAt < b.startsAt ? 1 : -1));
}

export function getActiveSeason(): Season {
  const active = db().seasons.find((s) => s.isActive);
  if (!active) throw new Error("No active season");
  return active;
}

export function getSeason(id: string): Season | undefined {
  return db().seasons.find((s) => s.id === id);
}

export function getPlayerById(id: string): Player | undefined {
  return db().players.find((p) => p.id === id);
}

function snapshotsFor(mode: Mode, seasonId: string): Snapshot[] {
  return db()
    .snapshots.filter((s) => s.mode === mode && s.seasonId === seasonId)
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}

export function getLatestSnapshot(mode: Mode, seasonId: string): Snapshot | undefined {
  const all = snapshotsFor(mode, seasonId);
  return all[all.length - 1];
}

export function getCutoffSeries(mode: Mode, seasonId: string): CutoffPoint[] {
  const all = snapshotsFor(mode, seasonId);
  return all.map((snap, i) => {
    const prev = all[i - 1];
    return {
      capturedAt: snap.capturedAt,
      cutoffSr: snap.cutoffSr,
      rank1Sr: snap.rank1Sr,
      deltaCutoff: prev ? snap.cutoffSr - prev.cutoffSr : null,
    };
  });
}

function nearestAtLeastHoursAgo(all: Snapshot[], latest: Snapshot, hours: number): Snapshot | undefined {
  const target = Date.parse(latest.capturedAt) - hours * 3_600_000;
  const older = all.filter((s) => Date.parse(s.capturedAt) <= target);
  return older[older.length - 1];
}

export function getBoardMetrics(mode: Mode, seasonId: string): BoardMetrics | null {
  const all = snapshotsFor(mode, seasonId);
  const latest = all[all.length - 1];
  if (!latest) return null;
  const first = all[0];
  const dayAgo = nearestAtLeastHoursAgo(all, latest, 24);
  const weekAgo = nearestAtLeastHoursAgo(all, latest, 24 * 7);

  const seasonDays = daysBetween(first.capturedAt, latest.capturedAt);
  const weekDays = weekAgo ? daysBetween(weekAgo.capturedAt, latest.capturedAt) : seasonDays;

  return {
    cutoffSr: latest.cutoffSr,
    change24h: dayAgo ? latest.cutoffSr - dayAgo.cutoffSr : null,
    avgPerDaySeason: (latest.cutoffSr - first.cutoffSr) / seasonDays,
    avgPerDay7d: weekAgo
      ? (latest.cutoffSr - weekAgo.cutoffSr) / weekDays
      : (latest.cutoffSr - first.cutoffSr) / seasonDays,
    playersSampled: 250,
    capturedAt: latest.capturedAt,
  };
}

export function getBoard(mode: Mode, seasonId: string): {
  snapshot: Snapshot;
  previous: Snapshot | undefined;
  rows: BoardRow[];
} | null {
  const all = snapshotsFor(mode, seasonId);
  const snapshot = all[all.length - 1];
  if (!snapshot) return null;
  const previous = all[all.length - 2];
  const currentRows = db().rows.filter((r) => r.snapshotId === snapshot.id);
  const prevByPlayer = new Map(
    previous
      ? db().rows.filter((r) => r.snapshotId === previous.id).map((r) => [r.playerId, r])
      : [],
  );

  const rows: BoardRow[] = currentRows
    .map((r) => {
      const player = getPlayerById(r.playerId);
      if (!player) return null;
      const prev = prevByPlayer.get(r.playerId);
      return {
        rank: r.rank,
        player,
        sr: r.sr,
        deltaSr: prev ? r.sr - prev.sr : null,
        deltaRank: prev ? prev.rank - r.rank : null,
        lastSeen: snapshot.capturedAt,
        isCutoff: r.rank === 250,
      } satisfies BoardRow;
    })
    .filter((r): r is BoardRow => r !== null)
    .sort((a, b) => a.rank - b.rank);

  return { snapshot, previous, rows };
}

export function getBoardLadder(mode: Mode, seasonId: string): BoardRung[] {
  const snapshot = getLatestSnapshot(mode, seasonId);
  if (!snapshot) return [];
  return db()
    .rows.filter((r) => r.snapshotId === snapshot.id)
    .map((r) => ({ rank: r.rank, sr: r.sr }))
    .sort((a, b) => a.rank - b.rank);
}

export function overlayLiveMetrics(
  seed: BoardMetrics,
  live: LiveWzBoard,
  change24h: number | null = null,
  liveAvgs?: {
    avgPerDaySeason: number | null;
    avgPerDay7d: number | null;
  } | null,
): BoardMetrics {
  return {
    ...seed,
    cutoffSr: live.cutoffSr,
    change24h,
    // Prefer stored-cutoff avgs; never keep seed avgs on a live board.
    avgPerDaySeason: liveAvgs?.avgPerDaySeason ?? null,
    avgPerDay7d: liveAvgs?.avgPerDay7d ?? null,
    playersSampled: live.rows.length,
    capturedAt: live.fetchedAt,
  };
}

export function isLiveWzBoard(mode: Mode, seasonId: string): boolean {
  return mode === "wz" && getSeason(seasonId)?.isActive === true;
}

export function getHomeSummary() {
  const season = getActiveSeason();
  return {
    season,
    wz: getBoardMetrics("wz", season.id),
    mp: getBoardMetrics("mp", season.id),
  };
}
