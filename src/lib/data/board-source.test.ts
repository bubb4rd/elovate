import assert from "node:assert/strict";
import {
  currentCutoffMetrics,
  getBoardCutoff,
  resolveBoardRows,
  resolveCutoff,
  STORED_CUTOFF_MAX_AGE_MS,
} from "./board-source";
import { getBoardMetrics, isLiveWzBoard, listSeasons } from "./queries";
import type { BoardMetrics, LiveWzBoard } from "./types";

// Fixed reference "now", shortly after both fixtures below, so staleness
// checks stay deterministic regardless of real wall-clock time.
const NOW = Date.parse("2026-09-01T12:05:00.000Z");

const live: LiveWzBoard = {
  rows: [],
  ladder: [],
  cutoffSr: 23796,
  rank1Sr: 41000,
  fetchedAt: "2026-09-01T12:00:00.000Z",
  nextUpdateAt: "2026-09-01T12:15:00.000Z",
};

const stored = {
  capturedAt: "2026-09-01T11:30:00.000Z",
  cutoffSr: 23755,
  rank1Sr: 40800,
};

const seed: BoardMetrics = {
  cutoffSr: 20155,
  change24h: 120,
  avgPerDaySeason: 90,
  avgPerDay7d: 80,
  playersSampled: 250,
  capturedAt: "2026-08-20T00:00:00.000Z",
};

// --- resolveCutoff: pure live -> stored -> none precedence ---

const rLive = resolveCutoff(live, stored, NOW);
assert.equal(rLive.source, "live");
assert.equal(rLive.cutoffSr, 23796);
assert.equal(rLive.capturedAt, "2026-09-01T12:00:00.000Z");
assert.equal(rLive.stored, stored, "stored is still carried alongside a live board");

const rStored = resolveCutoff(null, stored, NOW);
assert.equal(rStored.source, "stored");
assert.equal(rStored.cutoffSr, 23755);
assert.equal(rStored.capturedAt, "2026-09-01T11:30:00.000Z");

const rNone = resolveCutoff(null, null, NOW);
assert.equal(rNone.source, "none");
assert.equal(rNone.cutoffSr, null);
assert.equal(rNone.capturedAt, null);
assert.equal(rNone.live, null);
assert.equal(rNone.stored, null);

// --- resolveCutoff: a stored snapshot older than STORED_CUTOFF_MAX_AGE_MS is
// no longer trusted — a genuine season reset looks identical to "the poller
// can't get a reliable board" and must not be masked by ancient data forever.

const staleNow = Date.parse(stored.capturedAt) + STORED_CUTOFF_MAX_AGE_MS + 1;
const rStale = resolveCutoff(null, stored, staleNow);
assert.equal(rStale.source, "none", "stale stored snapshot falls through to none");
assert.equal(rStale.cutoffSr, null);
assert.equal(
  rStale.stored,
  stored,
  "the stale snapshot is still carried for reference, just not used as the source",
);

// A snapshot exactly at the age boundary is still trusted.
const boundaryNow = Date.parse(stored.capturedAt) + STORED_CUTOFF_MAX_AGE_MS;
assert.equal(resolveCutoff(null, stored, boundaryNow).source, "stored");

// --- resolveBoardRows: WZ-12 rule 1 (never seed rows for the active WZ season) ---

const liveRows = [{ rank: 1 }];
const seedRows = [{ rank: 2 }];

assert.equal(resolveBoardRows(liveRows, seedRows, true), liveRows, "live roster wins");
assert.equal(
  resolveBoardRows(undefined, seedRows, true),
  null,
  "active WZ season, no live board -> render nothing, not the seed roster",
);
assert.equal(
  resolveBoardRows(undefined, seedRows, false),
  seedRows,
  "archived season / MP -> keep seed rows",
);
assert.equal(resolveBoardRows(undefined, undefined, false), null);

// --- currentCutoffMetrics ---

// Archived / MP: seed snapshots are real recorded history, keep them.
assert.equal(
  currentCutoffMetrics({ seed, resolved: rNone, isLiveBoard: false }),
  seed,
);

// Active WZ, live: overlay the live cutoff + history onto the seed shape.
const liveMetrics = currentCutoffMetrics({
  seed,
  resolved: resolveCutoff(live, null, NOW),
  isLiveBoard: true,
  history: { change24h: 300, avgPerDaySeason: 110, avgPerDay7d: 95 },
});
assert.equal(liveMetrics?.cutoffSr, 23796);
assert.equal(liveMetrics?.change24h, 300);
assert.equal(liveMetrics?.avgPerDay7d, 95);

// Active WZ, stored: the last recorded cutoff, no fabricated deltas.
const storedMetrics = currentCutoffMetrics({
  seed,
  resolved: rStored,
  isLiveBoard: true,
});
assert.equal(storedMetrics?.cutoffSr, 23755);
assert.equal(storedMetrics?.change24h, null);
assert.equal(storedMetrics?.avgPerDaySeason, null);
assert.equal(storedMetrics?.capturedAt, "2026-09-01T11:30:00.000Z");

// Active WZ, nothing recorded: render nothing, never the seed numeral.
assert.equal(
  currentCutoffMetrics({ seed, resolved: rNone, isLiveBoard: true }),
  null,
);

// Active WZ, live but no seed metrics to overlay (a brand-new season has none
// — see the season-rollover incident this guards against): render the live
// numbers anyway. `seed` was only ever a spread base, never load-bearing data.
const noSeedLiveMetrics = currentCutoffMetrics({
  seed: null,
  resolved: resolveCutoff(live, null, NOW),
  isLiveBoard: true,
  history: { change24h: 300, avgPerDaySeason: 110, avgPerDay7d: 95 },
});
assert.equal(noSeedLiveMetrics?.cutoffSr, 23796);
assert.equal(noSeedLiveMetrics?.change24h, 300);
assert.equal(noSeedLiveMetrics?.playersSampled, live.rows.length);

// --- getBoardCutoff: orchestration with an injected stored fetcher ---

const activeSeasonId = listSeasons().find((s) => s.isActive)!.id;
const archivedSeasonId = listSeasons().find((s) => !s.isActive)!.id;
assert.equal(isLiveWzBoard("wz", activeSeasonId), true);

async function orchestrationTests() {
// Live down + active season -> stored fetcher is consulted, stored metrics returned.
let storedCalls: Array<[string, string]> = [];
const downResult = await getBoardCutoff({
  mode: "wz",
  seasonId: activeSeasonId,
  live: null,
  seed,
  now: NOW,
  fetchStored: async (mode, seasonId) => {
    storedCalls.push([mode, seasonId]);
    return stored;
  },
});
assert.deepEqual(storedCalls, [["wz", activeSeasonId]]);
assert.equal(downResult.resolved.source, "stored");
assert.equal(downResult.metrics?.cutoffSr, 23755);

// Live down, active season, but the stored snapshot has aged past
// STORED_CUTOFF_MAX_AGE_MS -> treated as none, not an ancient season's cutoff.
storedCalls = [];
const staleDownResult = await getBoardCutoff({
  mode: "wz",
  seasonId: activeSeasonId,
  live: null,
  seed,
  now: Date.parse(stored.capturedAt) + STORED_CUTOFF_MAX_AGE_MS + 1,
  fetchStored: async (mode, seasonId) => {
    storedCalls.push([mode, seasonId]);
    return stored;
  },
});
assert.equal(staleDownResult.resolved.source, "none");
assert.equal(staleDownResult.metrics, null);

// Live up -> stored fetcher is never called.
storedCalls = [];
const liveResult = await getBoardCutoff({
  mode: "wz",
  seasonId: activeSeasonId,
  live,
  seed,
  now: NOW,
  history: { change24h: 41, avgPerDaySeason: 100, avgPerDay7d: 90 },
  fetchStored: async (mode, seasonId) => {
    storedCalls.push([mode, seasonId]);
    return stored;
  },
});
assert.deepEqual(storedCalls, []);
assert.equal(liveResult.resolved.source, "live");
assert.equal(liveResult.metrics?.cutoffSr, 23796);
assert.equal(liveResult.metrics?.change24h, 41);

// Archived season, live down -> no stored lookup, seed metrics preserved.
storedCalls = [];
const archivedSeed = getBoardMetrics("wz", archivedSeasonId);
const archivedResult = await getBoardCutoff({
  mode: "wz",
  seasonId: archivedSeasonId,
  live: null,
  seed: archivedSeed,
  now: NOW,
  fetchStored: async (mode, seasonId) => {
    storedCalls.push([mode, seasonId]);
    return stored;
  },
});
assert.deepEqual(storedCalls, []);
assert.equal(archivedResult.resolved.source, "none");
assert.equal(archivedResult.metrics, archivedSeed);
}

orchestrationTests().then(() => {
  console.log("board-source tests passed");
});
