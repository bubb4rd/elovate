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
): { avgPerDaySeason: number | null; avgPerDay7d: number | null } {
  if (snapshots.length === 0) {
    return { avgPerDaySeason: null, avgPerDay7d: null };
  }

  const first = snapshots[0]!;
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
  const last = series[series.length - 1];
  if (!last || Date.parse(last.capturedAt) < Date.parse(live.fetchedAt)) {
    series.push(livePoint);
  } else {
    series[series.length - 1] = livePoint;
  }

  return {
    change24h: live.cutoffSr - baseline.cutoffSr,
    series,
  };
}
