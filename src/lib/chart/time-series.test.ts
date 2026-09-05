import assert from "node:assert/strict";
import { parseTimestamp, toSortedRows } from "./time-series";

// --- parseTimestamp: variable fractional-second precision must all parse ---
//
// Note: `.12`, `.1`, and no-fraction are genuinely different instants from
// `.123` (0.12s / 0.1s / 0s vs 0.123s) — Postgres only trims trailing ZERO
// digits, so it never emits both `.12` and `.123` for the same captured_at.
// What varies per-row is precision, not value. So the real invariant is:
// (a) every representation of the SAME 0.123s value — full microseconds,
// millisecond form, `Z`-suffixed, and the space-separated PostgREST form —
// must parse identically, and (b) every precision variant must still parse
// to a finite, correctly-scaled value (none may throw or produce NaN).

const sameInstantVariants = [
  "2026-09-02T14:32:11.123456+00:00", // microseconds, truncates to .123
  "2026-09-02T14:32:11.123+00:00",
  "2026-09-02T14:32:11.123Z",
  "2026-09-02 14:32:11.123+00", // space-separated PostgREST form
];

const sameInstantParsed = sameInstantVariants.map(parseTimestamp);
for (const value of sameInstantParsed) {
  assert.ok(Number.isFinite(value), "expected a finite epoch ms value");
}
const expectedInstant = sameInstantParsed[0];
for (const value of sameInstantParsed) {
  assert.equal(value, expectedInstant);
}

// Other precisions are distinct instants but must still parse without
// throwing, and must be correctly scaled (not misread as raw milliseconds).
assert.equal(parseTimestamp("2026-09-02T14:32:11.12+00:00"), expectedInstant! - 3);
assert.equal(parseTimestamp("2026-09-02T14:32:11.1+00:00"), expectedInstant! - 23);
assert.equal(parseTimestamp("2026-09-02T14:32:11+00:00"), expectedInstant! - 123);

// --- parseTimestamp: never throws, returns NaN on garbage input ---

assert.equal(Number.isNaN(parseTimestamp("")), true);
assert.equal(Number.isNaN(parseTimestamp("not a date")), true);

// --- toSortedRows: drops non-finite, sorts ascending, dedupes keeping last ---

type Row = { id: string; t: number };

const shuffled: Row[] = [
  { id: "c", t: 300 },
  { id: "bad-1", t: NaN },
  { id: "a", t: 100 },
  { id: "dup-1", t: 200 },
  { id: "bad-2", t: NaN },
  { id: "b", t: 200 },
  { id: "dup-2", t: 200 },
];

const sorted = toSortedRows(shuffled, (row) => row.t);

assert.deepEqual(
  sorted.map((row) => row.t),
  [100, 200, 300],
);
assert.equal(sorted.length, 3);
// Duplicate t=200 rows: "dup-1", "b", "dup-2" appear in that original order —
// the LAST one ("dup-2") must win.
assert.equal(sorted.find((row) => row.t === 200)?.id, "dup-2");

console.log("time-series tests passed");
