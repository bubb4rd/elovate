import assert from "node:assert/strict";
import {
  SCHEDULE_PRE_S06,
  SCHEDULE_S06,
  deploymentFee,
  iridescentFee,
  rankFromSr,
  srScheduleForSeason,
} from "./ranks";
import { WZ_ELIM_CAP, WZ_PLACEMENT_MAX } from "./wz-sr";

const MAX_EARNABLE_BASE = WZ_PLACEMENT_MAX + WZ_ELIM_CAP;

function assertMaxEarnable(fee: number) {
  const maxEarnable = WZ_PLACEMENT_MAX + WZ_ELIM_CAP - fee;
  assert.equal(275 - fee, maxEarnable, `275 - ${fee} should equal maxEarnable`);
  assert.equal(MAX_EARNABLE_BASE - fee, maxEarnable);
}

// --- Season 6 grid: Diamond + Crimson breakpoints ---
//
// SR division breakpoints are unchanged from prior seasons; only fees moved.
// For each row we check the fee at the breakpoint, the rank label at the
// breakpoint, the rank label one SR below it (the prior tier/division), and
// the 275 - fee === maxEarnable identity.

const S06_TIER_GRID = [
  { sr: 5_400, fee: 75, label: "Diamond I" },
  { sr: 6_100, fee: 85, label: "Diamond II" },
  { sr: 6_800, fee: 95, label: "Diamond III" },
  { sr: 7_500, fee: 130, label: "Crimson I" },
  { sr: 8_300, fee: 135, label: "Crimson II" },
  { sr: 9_100, fee: 140, label: "Crimson III" },
] as const;

for (const row of S06_TIER_GRID) {
  const atBreakpoint = rankFromSr(row.sr, null, SCHEDULE_S06);
  assert.equal(atBreakpoint.fee, row.fee, `fee at ${row.sr} (S06)`);
  assert.equal(atBreakpoint.label, row.label, `label at ${row.sr} (S06)`);
  assertMaxEarnable(row.fee);

  const belowBreakpoint = rankFromSr(row.sr - 1, null, SCHEDULE_S06);
  assert.notEqual(belowBreakpoint.label, row.label, `${row.sr - 1} should be below ${row.label}`);

  assert.equal(deploymentFee(row.sr, null, SCHEDULE_S06), row.fee);
}

// One SR below Diamond I / Crimson I must land in the previous division.
assert.equal(rankFromSr(5_399, null, SCHEDULE_S06).divisionLabel, "Platinum");
assert.equal(rankFromSr(7_499, null, SCHEDULE_S06).divisionLabel, "Diamond");
assert.equal(rankFromSr(7_499, null, SCHEDULE_S06).label, "Diamond III");

// --- Season 6 grid: Iridescent / Top 250 step table ---
//
// 275 (placement max 125 + elim cap 150) minus the fee = max earnable SR,
// confirmed by hand against every patch-note row — no separate max-SR table.

const S06_IRIDESCENT_GRID = [
  { sr: 10_000, fee: 170 },
  { sr: 10_500, fee: 190 },
  { sr: 11_000, fee: 200 },
  { sr: 11_500, fee: 210 },
  { sr: 12_000, fee: 220 },
  { sr: 12_500, fee: 230 },
  { sr: 13_000, fee: 240 },
  { sr: 13_500, fee: 255 },
  { sr: 14_000, fee: 260 },
  { sr: 14_500, fee: 265 },
  { sr: 15_000, fee: 270 },
] as const;

for (const row of S06_IRIDESCENT_GRID) {
  assert.equal(iridescentFee(row.sr, SCHEDULE_S06), row.fee, `iridescentFee at ${row.sr} (S06)`);
  assert.equal(deploymentFee(row.sr, null, SCHEDULE_S06), row.fee, `deploymentFee at ${row.sr} (S06)`);
  assertMaxEarnable(row.fee);
}

// 15000 is the cap: fee holds at 270 for everything above it, no further steps.
assert.equal(iridescentFee(15_499, SCHEDULE_S06), 270);
assert.equal(iridescentFee(20_000, SCHEDULE_S06), 270);
assert.equal(iridescentFee(99_999, SCHEDULE_S06), 270);

// --- SCHEDULE_PRE_S06 regression guard: today's existing fee values must still hold ---
//
// Historical replay of old-season data depends on these staying exactly as
// they were before the Season 6 schedule was introduced.

const PRE_S06_TIER_GRID = [
  { sr: 5_400, fee: 65, label: "Diamond I" },
  { sr: 6_100, fee: 70, label: "Diamond II" },
  { sr: 6_800, fee: 75, label: "Diamond III" },
  { sr: 7_500, fee: 85, label: "Crimson I" },
  { sr: 8_300, fee: 95, label: "Crimson II" },
  { sr: 9_100, fee: 110, label: "Crimson III" },
] as const;

for (const row of PRE_S06_TIER_GRID) {
  const atBreakpoint = rankFromSr(row.sr, null, SCHEDULE_PRE_S06);
  assert.equal(atBreakpoint.fee, row.fee, `fee at ${row.sr} (pre-S06)`);
  assert.equal(atBreakpoint.label, row.label, `label at ${row.sr} (pre-S06)`);
  assert.equal(deploymentFee(row.sr, null, SCHEDULE_PRE_S06), row.fee);
}

const PRE_S06_IRIDESCENT_GRID = [
  { sr: 10_000, fee: 120 },
  { sr: 10_500, fee: 130 },
  { sr: 11_000, fee: 140 },
  { sr: 11_500, fee: 150 },
  { sr: 12_000, fee: 160 },
  { sr: 12_500, fee: 170 },
  { sr: 13_000, fee: 180 },
  { sr: 13_500, fee: 190 },
  { sr: 14_000, fee: 200 },
  { sr: 14_500, fee: 210 },
  { sr: 15_000, fee: 220 },
] as const;

for (const row of PRE_S06_IRIDESCENT_GRID) {
  assert.equal(iridescentFee(row.sr, SCHEDULE_PRE_S06), row.fee, `iridescentFee at ${row.sr} (pre-S06)`);
}
// Legacy formula also capped at 220 above 15000.
assert.equal(iridescentFee(20_000, SCHEDULE_PRE_S06), 220);

// Bronze/Silver/Gold/Platinum fees are unconfirmed by patch notes and unchanged
// between schedules — both schedules must agree on them.
for (const sr of [0, 900, 2_100, 3_600]) {
  assert.equal(
    rankFromSr(sr, null, SCHEDULE_S06).fee,
    rankFromSr(sr, null, SCHEDULE_PRE_S06).fee,
    `fee at ${sr} should be unchanged between schedules`,
  );
}

// --- srScheduleForSeason: resolves by season id, defaults to the active (S06) schedule ---

assert.equal(srScheduleForSeason("s5"), SCHEDULE_PRE_S06);
assert.equal(srScheduleForSeason("s4"), SCHEDULE_PRE_S06);
assert.equal(srScheduleForSeason("s6"), SCHEDULE_S06);
assert.equal(srScheduleForSeason(), SCHEDULE_S06);
assert.equal(srScheduleForSeason(null), SCHEDULE_S06);
assert.equal(srScheduleForSeason("not-a-season-id"), SCHEDULE_S06);

console.log("sr schedule / ranks tests ok");
