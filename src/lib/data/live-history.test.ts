import assert from "node:assert/strict";
import {
  avgPerDayFromCutoffs,
  windowCutoffHistory,
  type StoredCutoff,
} from "./cutoff-window";

const snapshots: StoredCutoff[] = [
  { capturedAt: "2026-08-24T10:00:00.000Z", cutoffSr: 10000, rank1Sr: 20000 },
  { capturedAt: "2026-08-24T22:00:00.000Z", cutoffSr: 10100, rank1Sr: 20100 },
  { capturedAt: "2026-08-25T09:00:00.000Z", cutoffSr: 10200, rank1Sr: 20200 },
];

const with24h = windowCutoffHistory(snapshots, {
  fetchedAt: "2026-08-25T10:00:00.000Z",
  cutoffSr: 10300,
  rank1Sr: 20300,
});
assert.equal(with24h.change24h, 300);
assert.equal(with24h.series[0]?.capturedAt, "2026-08-24T10:00:00.000Z");
assert.equal(with24h.series[with24h.series.length - 1]?.capturedAt, "2026-08-25T10:00:00.000Z");
assert.equal(with24h.series[with24h.series.length - 1]?.cutoffSr, 10300);
assert.equal(with24h.series[with24h.series.length - 1]?.deltaCutoff, 300);

const missing = windowCutoffHistory(snapshots, {
  fetchedAt: "2026-08-25T09:30:00.000Z",
  cutoffSr: 10250,
  rank1Sr: 20250,
});
assert.equal(missing.change24h, null);
assert.equal(missing.series.length, 0);

const liveNewer = windowCutoffHistory(snapshots, {
  fetchedAt: "2026-08-25T12:00:00.000Z",
  cutoffSr: 10400,
  rank1Sr: 20400,
});
assert.equal(liveNewer.change24h, 400);
assert.equal(liveNewer.series.length, 4);
assert.equal(liveNewer.series[0]?.capturedAt, "2026-08-24T10:00:00.000Z");
assert.equal(liveNewer.series[liveNewer.series.length - 1]?.capturedAt, "2026-08-25T12:00:00.000Z");

const replaceLast = windowCutoffHistory(
  [
    ...snapshots,
    { capturedAt: "2026-08-25T10:00:00.000Z", cutoffSr: 10220, rank1Sr: 20220 },
  ],
  {
    fetchedAt: "2026-08-25T10:00:00.000Z",
    cutoffSr: 10300,
    rank1Sr: 20300,
  },
);
assert.equal(replaceLast.change24h, 300);
assert.equal(replaceLast.series.length, 4);
assert.equal(replaceLast.series[replaceLast.series.length - 1]?.cutoffSr, 10300);
assert.equal(replaceLast.series[replaceLast.series.length - 1]?.capturedAt, "2026-08-25T10:00:00.000Z");

const emptyAvgs = avgPerDayFromCutoffs([], {
  fetchedAt: "2026-08-25T10:00:00.000Z",
  cutoffSr: 10300,
});
assert.equal(emptyAvgs.avgPerDaySeason, null);
assert.equal(emptyAvgs.avgPerDay7d, null);

const shortSeason = avgPerDayFromCutoffs(snapshots, {
  fetchedAt: "2026-08-25T10:00:00.000Z",
  cutoffSr: 10300,
});
// 1 day between first and live → season avg = +300
assert.equal(shortSeason.avgPerDaySeason, 300);
// No 7d baseline yet → fall back to season avg
assert.equal(shortSeason.avgPerDay7d, 300);

const weekSnapshots: StoredCutoff[] = [
  { capturedAt: "2026-08-18T10:00:00.000Z", cutoffSr: 9600, rank1Sr: 19600 },
  { capturedAt: "2026-08-20T10:00:00.000Z", cutoffSr: 9800, rank1Sr: 19800 },
  { capturedAt: "2026-08-24T10:00:00.000Z", cutoffSr: 10000, rank1Sr: 20000 },
  { capturedAt: "2026-08-25T09:00:00.000Z", cutoffSr: 10200, rank1Sr: 20200 },
];
const weekAvgs = avgPerDayFromCutoffs(weekSnapshots, {
  fetchedAt: "2026-08-25T10:00:00.000Z",
  cutoffSr: 10300,
});
// season: (10300-9600) / 7 days = ~100
assert.equal(weekAvgs.avgPerDaySeason, 100);
// 7d baseline is 2026-08-18 (exactly 7d ago): (10300-9600) / 7 = 100
assert.equal(weekAvgs.avgPerDay7d, 100);

const steeperWeek = avgPerDayFromCutoffs(weekSnapshots, {
  fetchedAt: "2026-08-25T10:00:00.000Z",
  cutoffSr: 11000,
});
assert.equal(steeperWeek.avgPerDaySeason, 200);
assert.equal(steeperWeek.avgPerDay7d, 200);

console.log("live-history tests passed");
