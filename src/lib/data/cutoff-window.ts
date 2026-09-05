import { daysBetween } from "@/lib/format";
import type { CutoffPoint } from "./types";

export type StoredCutoff = {
  capturedAt: string;
  cutoffSr: number;
  rank1Sr: number;
};

const HOUR_MS = 3_600_000;

function nearestAtLeastHoursAgo(
  snapshots: StoredCutoff[],
  liveAt: string,
  hours: number,
): StoredCutoff | undefined {
  const target = Date.parse(liveAt) - hours * HOUR_MS;
  const older = snapshots.filter((snap) => Date.parse(snap.capturedAt) <= target);
  return older[older.length - 1];
}

/** Season + 7d average daily cutoff climb from stored snapshots vs live board. */
export function avgPerDayFromCutoffs(
  snapshots: StoredCutoff[],
  live: { fetchedAt: string; cutoffSr: number },
  anchor: StoredCutoff | null = null,
): { avgPerDaySeason: number | null; avgPerDay7d: number | null } {
  const first = anchor ?? snapshots[0];
  if (!first) {
    return { avgPerDaySeason: null, avgPerDay7d: null };
  }

  const seasonDays = daysBetween(first.capturedAt, live.fetchedAt);
  const avgPerDaySeason = (live.cutoffSr - first.cutoffSr) / seasonDays;

  const weekAgo = nearestAtLeastHoursAgo(snapshots, live.fetchedAt, 24 * 7);
  if (!weekAgo) {
    return { avgPerDaySeason, avgPerDay7d: avgPerDaySeason };
  }

  const weekDays = daysBetween(weekAgo.capturedAt, live.fetchedAt);
  return {
    avgPerDaySeason,
    avgPerDay7d: (live.cutoffSr - weekAgo.cutoffSr) / weekDays,
  };
}

export function windowCutoffHistory(
  snapshots: StoredCutoff[],
  live: { fetchedAt: string; cutoffSr: number; rank1Sr: number },
  hours = 24,
): { change24h: number | null; series: CutoffPoint[] } {
  const baseline = nearestAtLeastHoursAgo(snapshots, live.fetchedAt, hours);
  if (!baseline) {
    return { change24h: null, series: [] };
  }

  const fromBaseline = snapshots.filter(
    (snap) => Date.parse(snap.capturedAt) >= Date.parse(baseline.capturedAt),
  );
  const series: CutoffPoint[] = fromBaseline.map((snap, index) => ({
    capturedAt: snap.capturedAt,
    cutoffSr: snap.cutoffSr,
    rank1Sr: snap.rank1Sr,
    deltaCutoff: index === 0 ? null : snap.cutoffSr - fromBaseline[index - 1]!.cutoffSr,
  }));

  const livePoint: CutoffPoint = {
    capturedAt: live.fetchedAt,
    cutoffSr: live.cutoffSr,
    rank1Sr: live.rank1Sr,
    deltaCutoff: live.cutoffSr - baseline.cutoffSr,
  };
  // Merge by timestamp, not by array position: the live board is cached and can
  // fall back to a stale `lastGood` snapshot, so `live.fetchedAt` is not guaranteed
  // to be newer than the last stored snapshot. Blindly overwriting `series[-1]`
  // (the old behavior) could replace a NEWER snapshot with an OLDER-stamped live
  // point, producing an out-of-order series that Recharts draws as a jagged line.
  const liveTime = Date.parse(live.fetchedAt);
  const existingIndex = series.findIndex(
    (point) => Date.parse(point.capturedAt) === liveTime,
  );
  if (existingIndex !== -1) {
    // Same timestamp as a stored snapshot: replace it in place (preserves the
    // pre-existing "replaceLast" semantics for the equal-timestamp case).
    series[existingIndex] = livePoint;
  } else {
    // Otherwise insert in sorted position so the series stays strictly
    // ascending by capturedAt regardless of how stale `live` is.
    series.push(livePoint);
    series.sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));
  }

  return {
    change24h: live.cutoffSr - baseline.cutoffSr,
    series,
  };
}
