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

// --- WZ-11: anchor passed separately vs. full-array behavior ---

// Fixture spanning ~14 days. The first two rows are OLDER than the 8-day
// recent window and would be excluded from `getRecentCutoffSnapshots`.
const fullHistory: StoredCutoff[] = [
  { capturedAt: "2026-08-11T10:00:00.000Z", cutoffSr: 9000, rank1Sr: 19000 },
  { capturedAt: "2026-08-14T10:00:00.000Z", cutoffSr: 9300, rank1Sr: 19300 },
  { capturedAt: "2026-08-18T10:00:00.000Z", cutoffSr: 9600, rank1Sr: 19600 },
  { capturedAt: "2026-08-20T10:00:00.000Z", cutoffSr: 9800, rank1Sr: 19800 },
  { capturedAt: "2026-08-24T10:00:00.000Z", cutoffSr: 10000, rank1Sr: 20000 },
  { capturedAt: "2026-08-25T09:00:00.000Z", cutoffSr: 10200, rank1Sr: 20200 },
];
const liveNow = { fetchedAt: "2026-08-25T10:00:00.000Z", cutoffSr: 10300 };

// Old behavior: whole array, no explicit anchor.
const oldWay = avgPerDayFromCutoffs(fullHistory, liveNow);

// New behavior: only the recent (<= 8d) window + a separate season anchor row.
const recentWindow = fullHistory.filter(
  (s) => Date.parse(s.capturedAt) >= Date.parse("2026-08-17T10:00:00.000Z"),
);
const anchorRow = fullHistory[0]!;
const newWay = avgPerDayFromCutoffs(recentWindow, liveNow, anchorRow);

// Season average must be identical: anchored on the true season-start row,
// not on recentWindow[0].
assert.equal(newWay.avgPerDaySeason, oldWay.avgPerDaySeason);
// Sanity: without the anchor the windowed array would give a different (8-day) number.
assert.notEqual(
  avgPerDayFromCutoffs(recentWindow, liveNow).avgPerDaySeason,
  oldWay.avgPerDaySeason,
);

// --- WZ-11: recent window with no row older than 24h → honest empty state ---
const freshOnly: StoredCutoff[] = [
  { capturedAt: "2026-08-25T06:00:00.000Z", cutoffSr: 10250, rank1Sr: 20250 },
  { capturedAt: "2026-08-25T09:00:00.000Z", cutoffSr: 10280, rank1Sr: 20280 },
];
const noBaseline = windowCutoffHistory(freshOnly, {
  fetchedAt: "2026-08-25T10:00:00.000Z",
  cutoffSr: 10300,
  rank1Sr: 20300,
});
assert.equal(noBaseline.change24h, null);
assert.deepEqual(noBaseline.series, []);

// --- WZ-11: avgPerDay7d still resolves with exactly 7 days + 1 row in window ---
const sevenDayWindow: StoredCutoff[] = [
  { capturedAt: "2026-08-18T10:00:00.000Z", cutoffSr: 9600, rank1Sr: 19600 },
  { capturedAt: "2026-08-25T10:00:00.000Z", cutoffSr: 10300, rank1Sr: 20300 },
];
const sevenDayAvgs = avgPerDayFromCutoffs(
  sevenDayWindow,
  { fetchedAt: "2026-08-25T10:00:00.000Z", cutoffSr: 10300 },
  { capturedAt: "2026-08-01T10:00:00.000Z", cutoffSr: 8000, rank1Sr: 18000 },
);
// 7d baseline is 2026-08-18 exactly 7d ago: (10300-9600)/7 = 100
assert.equal(sevenDayAvgs.avgPerDay7d, 100);
// season anchored on 2026-08-01: (10300-8000)/24 ≈ 95.83
assert.equal(
  Math.round(sevenDayAvgs.avgPerDaySeason! * 100) / 100,
  Math.round((2300 / 24) * 100) / 100,
);

// --- WZ-11: both anchor null and snapshots empty → preserved empty behavior ---
const bothEmpty = avgPerDayFromCutoffs([], liveNow, null);
assert.equal(bothEmpty.avgPerDaySeason, null);
assert.equal(bothEmpty.avgPerDay7d, null);

console.log("live-history tests passed");
