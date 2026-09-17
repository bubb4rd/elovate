import assert from "node:assert/strict";
import type { ClimbMatchRow, ClimbSessionRow } from "@/lib/supabase/database";
import { climbPeaks, isInSeason, resolveDisplaySr } from "./queries";

const SEASON_STARTS_AT = "2026-09-16T00:00:00.000Z";

function wzMatchRow(overrides: Partial<ClimbMatchRow>): ClimbMatchRow {
  return {
    id: "m1",
    user_id: "u1",
    session_id: "s1",
    mode: "wz",
    created_at: "2026-09-01T00:00:00.000Z",
    sr_before: 0,
    sr_after: 0,
    net: 0,
    placement: "top15",
    squad_elims: 0,
    your_elims: 0,
    fee: 0,
    placement_sr: 0,
    elim_sr: 0,
    capped: false,
    sr_per_win: null,
    teammates: [],
    ...overrides,
  };
}

function sessionRow(overrides: Partial<ClimbSessionRow>): ClimbSessionRow {
  return {
    id: "s1",
    user_id: "u1",
    mode: "wz",
    started_at: "2026-09-01T00:00:00.000Z",
    ended_at: null,
    start_sr: 0,
    ...overrides,
  };
}

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

// --- climbPeaks: no history at all -> both peaks are just currentSr ---

{
  const peaks = climbPeaks([], [], 5400, null, SEASON_STARTS_AT);
  assert.equal(peaks.seasonPeakSr, 5400);
  assert.equal(peaks.allTimePeakSr, 5400);
}

// --- climbPeaks: pre-season history only (right after a reset) -> allTimePeakSr
// keeps the real historical high (so an earned header stays earned), but
// seasonPeakSr falls back to the reset currentSr, not last season's peak. ---

{
  const preSeasonMatch = wzMatchRow({
    created_at: "2026-09-10T12:00:00.000Z",
    sr_after: 8200,
  });
  const preSeasonSession = sessionRow({ started_at: "2026-09-10T00:00:00.000Z", start_sr: 7500 });
  const peaks = climbPeaks([preSeasonSession], [preSeasonMatch], 5400, null, SEASON_STARTS_AT);
  assert.equal(peaks.allTimePeakSr, 8200, "true all-time peak, unaffected by the reset");
  assert.equal(peaks.seasonPeakSr, 5400, "no in-season data yet, so this season's peak is just the reset value");
}

// --- climbPeaks: a real in-season match above currentSr -> seasonPeakSr picks it up ---

{
  const oldMatch = wzMatchRow({ created_at: "2026-09-10T12:00:00.000Z", sr_after: 8200 });
  const newMatch = wzMatchRow({
    id: "m2",
    created_at: "2026-09-17T12:00:00.000Z",
    sr_after: 6000,
  });
  const peaks = climbPeaks([], [oldMatch, newMatch], 5400, null, SEASON_STARTS_AT);
  assert.equal(peaks.allTimePeakSr, 8200);
  assert.equal(peaks.seasonPeakSr, 6000, "picks up the real in-season match, above the reset floor");
}

console.log("profile queries tests passed");
