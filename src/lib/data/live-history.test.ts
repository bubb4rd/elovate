import assert from "node:assert/strict";
import {
  avgPerDayFromCutoffs,
  finalPushCutoffHistory,
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

// --- WZ-17: stale live point must not overwrite (or precede) a newer snapshot ---

const staleLiveSnapshots: StoredCutoff[] = [
  { capturedAt: "2026-08-23T10:00:00.000Z", cutoffSr: 9900, rank1Sr: 19900 },
  { capturedAt: "2026-08-24T10:00:00.000Z", cutoffSr: 10000, rank1Sr: 20000 },
  { capturedAt: "2026-08-24T22:00:00.000Z", cutoffSr: 10100, rank1Sr: 20100 },
  { capturedAt: "2026-08-25T09:00:00.000Z", cutoffSr: 10200, rank1Sr: 20200 },
  { capturedAt: "2026-08-25T12:00:00.000Z", cutoffSr: 10250, rank1Sr: 20250 },
];

// The live board's cache (or a lastGood fallback) can be OLDER than the
// newest stored snapshot. Here `fetchedAt` is 1h behind the 12:00 snapshot.
const staleLive = windowCutoffHistory(staleLiveSnapshots, {
  fetchedAt: "2026-08-25T11:00:00.000Z",
  cutoffSr: 10230,
  rank1Sr: 20230,
});

const staleLiveTimes = staleLive.series.map((point) => Date.parse(point.capturedAt));
for (let i = 1; i < staleLiveTimes.length; i++) {
  assert.ok(
    staleLiveTimes[i]! > staleLiveTimes[i - 1]!,
    "series must be strictly ascending by capturedAt",
  );
}
// The newest stored snapshot (12:00, cutoffSr 10250) must survive the merge.
assert.ok(
  staleLive.series.some(
    (point) => point.capturedAt === "2026-08-25T12:00:00.000Z" && point.cutoffSr === 10250,
  ),
  "newest snapshot must not be overwritten by a stale live point",
);
// The stale live point itself is still present, just ordered correctly.
assert.ok(
  staleLive.series.some(
    (point) => point.capturedAt === "2026-08-25T11:00:00.000Z" && point.cutoffSr === 10230,
  ),
);

// --- WZ-17: very-stale live (lastGood fallback, ~13h behind the newest snapshot) ---

const veryStaleLive = windowCutoffHistory(staleLiveSnapshots, {
  fetchedAt: "2026-08-24T23:00:00.000Z",
  cutoffSr: 10120,
  rank1Sr: 20120,
});

const veryStaleTimes = veryStaleLive.series.map((point) => Date.parse(point.capturedAt));
for (let i = 1; i < veryStaleTimes.length; i++) {
  assert.ok(
    veryStaleTimes[i]! > veryStaleTimes[i - 1]!,
    "series must be strictly ascending by capturedAt even for a very stale live point",
  );
}
assert.ok(
  veryStaleLive.series.some(
    (point) => point.capturedAt === "2026-08-25T12:00:00.000Z" && point.cutoffSr === 10250,
  ),
  "newest snapshot must survive a very-stale live merge",
);

// --- Frozen home: finalPushCutoffHistory replays the last 24h before the lock ---

// Climb, then a flat plateau once ranked locked. The window must anchor on the
// start of the plateau (last real movement), not on the newest snapshot.
const lockSnapshots: StoredCutoff[] = [
  { capturedAt: "2026-09-09T00:00:00.000Z", cutoffSr: 27000, rank1Sr: 48000 },
  { capturedAt: "2026-09-09T05:00:00.000Z", cutoffSr: 27100, rank1Sr: 48200 },
  { capturedAt: "2026-09-09T12:00:00.000Z", cutoffSr: 27400, rank1Sr: 48500 },
  { capturedAt: "2026-09-10T05:00:00.000Z", cutoffSr: 27870, rank1Sr: 49047 },
  { capturedAt: "2026-09-10T09:00:00.000Z", cutoffSr: 27870, rank1Sr: 49047 },
  { capturedAt: "2026-09-10T18:00:00.000Z", cutoffSr: 27870, rank1Sr: 49047 },
];
const finalPush = finalPushCutoffHistory(lockSnapshots);
// anchor = 2026-09-10T05:00 (start of plateau); baseline = 2026-09-09T05:00 @ 27100
assert.equal(finalPush.change24h, 770);
assert.equal(finalPush.series[0]?.capturedAt, "2026-09-09T05:00:00.000Z");
assert.equal(
  finalPush.series[finalPush.series.length - 1]?.capturedAt,
  "2026-09-10T05:00:00.000Z",
);
// trailing plateau snapshots are not part of the closing-scramble series
assert.ok(
  finalPush.series.every(
    (point) =>
      Date.parse(point.capturedAt) <= Date.parse("2026-09-10T05:00:00.000Z"),
  ),
);

// Still climbing at the last sample → anchor is the newest snapshot.
const stillClimbing: StoredCutoff[] = [
  { capturedAt: "2026-09-09T06:00:00.000Z", cutoffSr: 27100, rank1Sr: 48200 },
  { capturedAt: "2026-09-09T18:00:00.000Z", cutoffSr: 27500, rank1Sr: 48600 },
  { capturedAt: "2026-09-10T06:00:00.000Z", cutoffSr: 27900, rank1Sr: 49100 },
];
const climbing = finalPushCutoffHistory(stillClimbing);
assert.equal(climbing.change24h, 800);
assert.equal(climbing.series.length, 3);

// No snapshot a full 24h before the anchor → empty, caller hides the chart.
const thin: StoredCutoff[] = [
  { capturedAt: "2026-09-10T04:00:00.000Z", cutoffSr: 27860, rank1Sr: 49000 },
  { capturedAt: "2026-09-10T05:00:00.000Z", cutoffSr: 27870, rank1Sr: 49047 },
];
const thinResult = finalPushCutoffHistory(thin);
assert.equal(thinResult.change24h, null);
assert.deepEqual(thinResult.series, []);

// Long past the lock, every snapshot flat → empty.
const allFlat: StoredCutoff[] = [
  { capturedAt: "2026-09-12T00:00:00.000Z", cutoffSr: 27870, rank1Sr: 49047 },
  { capturedAt: "2026-09-13T00:00:00.000Z", cutoffSr: 27870, rank1Sr: 49047 },
];
assert.equal(finalPushCutoffHistory(allFlat).change24h, null);

// Single snapshot → empty.
assert.deepEqual(finalPushCutoffHistory([lockSnapshots[0]!]).series, []);

// Mid-season SR-tier reset (e.g. a rank compression event): the cutoff drops
// by thousands of SR in a single poll, all under the same season_id. The 24h
// window must not bridge that drop and report it as a real "cutoff loss".
const resetSnapshots: StoredCutoff[] = [
  { capturedAt: "2026-09-17T10:00:00.000Z", cutoffSr: 27700, rank1Sr: 48000 },
  { capturedAt: "2026-09-17T22:00:00.000Z", cutoffSr: 27870, rank1Sr: 48200 },
  // The reset lands here — a single-poll drop far beyond organic play.
  { capturedAt: "2026-09-18T09:00:00.000Z", cutoffSr: 10000, rank1Sr: 15000 },
  { capturedAt: "2026-09-18T22:00:00.000Z", cutoffSr: 10050, rank1Sr: 15100 },
];
const resetWindow = windowCutoffHistory(resetSnapshots, {
  fetchedAt: "2026-09-19T09:00:00.000Z",
  cutoffSr: 10087,
  rank1Sr: 15200,
});
// The reset-point snapshot (09-18T09:00, 10000 SR) is itself exactly 24h
// before "now" and is on the post-reset side, so it's a valid baseline:
// change24h is the small, real +87, never the pre-reset-era -17,783.
assert.equal(resetWindow.change24h, 87);
assert.ok(resetWindow.series.every((point) => point.cutoffSr < 20000));

// Once enough post-reset history exists, change24h resumes working — anchored
// only to snapshots on the new side of the reset.
const resetSnapshotsLater: StoredCutoff[] = [
  ...resetSnapshots,
  { capturedAt: "2026-09-19T09:00:00.000Z", cutoffSr: 10087, rank1Sr: 15200 },
];
const resetWindowLater = windowCutoffHistory(resetSnapshotsLater, {
  fetchedAt: "2026-09-19T10:00:00.000Z",
  cutoffSr: 10120,
  rank1Sr: 15250,
});
assert.equal(resetWindowLater.change24h, 120);
assert.ok(resetWindowLater.series.every((point) => point.cutoffSr < 20000));

// A reset that happened after the last poll (not written to `snapshots` yet)
// must also be caught — the live board itself is the only post-reset point.
const preResetOnly: StoredCutoff[] = [
  { capturedAt: "2026-09-17T10:00:00.000Z", cutoffSr: 27700, rank1Sr: 48000 },
  { capturedAt: "2026-09-17T22:00:00.000Z", cutoffSr: 27870, rank1Sr: 48200 },
];
const justReset = windowCutoffHistory(preResetOnly, {
  fetchedAt: "2026-09-19T00:00:00.000Z",
  cutoffSr: 10087,
  rank1Sr: 15200,
});
assert.equal(justReset.change24h, null);
assert.deepEqual(justReset.series, []);

// avgPerDayFromCutoffs must not bridge the same reset, including via the
// season anchor row (which is even older than the recent-snapshots window).
const resetAvgs = avgPerDayFromCutoffs(
  resetSnapshotsLater,
  { fetchedAt: "2026-09-19T10:00:00.000Z", cutoffSr: 10120 },
  { capturedAt: "2026-09-01T00:00:00.000Z", cutoffSr: 8000, rank1Sr: 12000 },
);
assert.ok(resetAvgs.avgPerDaySeason != null && resetAvgs.avgPerDaySeason > 0);
assert.ok(resetAvgs.avgPerDay7d != null && resetAvgs.avgPerDay7d > 0);

console.log("live-history tests passed");
