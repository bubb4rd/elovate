import assert from "node:assert/strict";
import { isInSeason, resolveDisplaySr } from "./queries";

const SEASON_STARTS_AT = "2026-09-16T00:00:00.000Z";

// --- resolveDisplaySr: no matches at all -> falls back to profile.current_sr ---

{
  const result = resolveDisplaySr(null, 3600, SEASON_STARTS_AT);
  assert.equal(result.currentSr, 3600);
  assert.equal(result.usingResetValue, true, "no match logged yet, so the reset value is showing");
}

// --- resolveDisplaySr: latest match predates the active season (last season's stale value) ---

{
  const staleMatch = { srAfter: 8200, createdAt: "2026-09-10T20:45:01.235Z" };
  const result = resolveDisplaySr(staleMatch, 5400, SEASON_STARTS_AT);
  assert.equal(result.currentSr, 5400, "prefers the freshly-reset profile.current_sr over a pre-season match");
  assert.equal(result.usingResetValue, true);
}

// --- resolveDisplaySr: latest match is within the active season -> real, self-corrected value wins ---

{
  const inSeasonMatch = { srAfter: 4200, createdAt: "2026-09-17T09:00:00.000Z" };
  const result = resolveDisplaySr(inSeasonMatch, 5400, SEASON_STARTS_AT);
  assert.equal(result.currentSr, 4200, "a real match this season overrides the reset value");
  assert.equal(result.usingResetValue, false);
}

// --- resolveDisplaySr: a match exactly at the season boundary counts as in-season ---

{
  const boundaryMatch = { srAfter: 4200, createdAt: SEASON_STARTS_AT };
  const result = resolveDisplaySr(boundaryMatch, 5400, SEASON_STARTS_AT);
  assert.equal(result.currentSr, 4200);
  assert.equal(result.usingResetValue, false);
}

// --- isInSeason: same boundary resolveDisplaySr uses, exposed for the trend-chart filter ---

assert.equal(isInSeason("2026-09-10T20:45:01.235Z", SEASON_STARTS_AT), false, "pre-season match");
assert.equal(isInSeason(SEASON_STARTS_AT, SEASON_STARTS_AT), true, "exact boundary counts as in-season");
assert.equal(isInSeason("2026-09-17T09:00:00.000Z", SEASON_STARTS_AT), true, "in-season match");

console.log("profile queries tests passed");
