import assert from "node:assert/strict";
import {
  currentCutoffMetrics,
  getBoardCutoff,
  resolveCutoff,
} from "./board-source";
import { getBoardMetrics, isLiveWzBoard, listSeasons } from "./queries";
import type { BoardMetrics, LiveWzBoard } from "./types";

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

const rLive = resolveCutoff(live, stored);
assert.equal(rLive.source, "live");
assert.equal(rLive.cutoffSr, 23796);
assert.equal(rLive.capturedAt, "2026-09-01T12:00:00.000Z");
assert.equal(rLive.stored, stored, "stored is still carried alongside a live board");

const rStored = resolveCutoff(null, stored);
assert.equal(rStored.source, "stored");
assert.equal(rStored.cutoffSr, 23755);
assert.equal(rStored.capturedAt, "2026-09-01T11:30:00.000Z");

const rNone = resolveCutoff(null, null);
assert.equal(rNone.source, "none");
assert.equal(rNone.cutoffSr, null);
assert.equal(rNone.capturedAt, null);
assert.equal(rNone.live, null);
assert.equal(rNone.stored, null);

// --- currentCutoffMetrics ---

// Archived / MP: seed snapshots are real recorded history, keep them.
assert.equal(
  currentCutoffMetrics({ seed, resolved: rNone, isLiveBoard: false }),
  seed,
);

// Active WZ, live: overlay the live cutoff + history onto the seed shape.
const liveMetrics = currentCutoffMetrics({
  seed,
  resolved: resolveCutoff(live, null),
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

// Active WZ, live but no seed metrics to overlay: nothing.
assert.equal(
  currentCutoffMetrics({
    seed: null,
    resolved: resolveCutoff(live, null),
    isLiveBoard: true,
  }),
  null,
);

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
  fetchStored: async (mode, seasonId) => {
    storedCalls.push([mode, seasonId]);
    return stored;
  },
});
assert.deepEqual(storedCalls, [["wz", activeSeasonId]]);
assert.equal(downResult.resolved.source, "stored");
assert.equal(downResult.metrics?.cutoffSr, 23755);

// Live up -> stored fetcher is never called.
storedCalls = [];
const liveResult = await getBoardCutoff({
  mode: "wz",
  seasonId: activeSeasonId,
  live,
  seed,
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
