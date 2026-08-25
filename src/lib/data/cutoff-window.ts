import type { CutoffPoint } from "./types";

export type StoredCutoff = {
  capturedAt: string;
  cutoffSr: number;
  rank1Sr: number;
};

const HOUR_MS = 3_600_000;

export function windowCutoffHistory(
  snapshots: StoredCutoff[],
  live: { fetchedAt: string; cutoffSr: number; rank1Sr: number },
  hours = 24,
): { change24h: number | null; series: CutoffPoint[] } {
  const target = Date.parse(live.fetchedAt) - hours * HOUR_MS;
  const older = snapshots.filter((snap) => Date.parse(snap.capturedAt) <= target);
  const baseline = older[older.length - 1];
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
