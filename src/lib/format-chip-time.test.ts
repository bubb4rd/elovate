import assert from "node:assert/strict";
import { formatChipTime, formatSlashDateTime, formatUtcChipTime } from "./format";
import {
  parseTimeZoneCookie,
  TIMEZONE_COOKIE,
  isValidTimeZone,
} from "./time-preference";

const iso = "2026-08-29T22:15:00.000Z";

const utc = formatUtcChipTime(iso);
assert.equal(utc.date, "Aug 29");
assert.equal(utc.time, "10:15 PM");
assert.equal(utc.zone, "UTC");
assert.deepEqual(formatChipTime(iso, "UTC"), utc);

const chicago = formatChipTime(iso, "America/Chicago");
assert.equal(chicago.date, "Aug 29");
assert.equal(chicago.time, "5:15 PM");
assert.match(chicago.zone, /CDT|GMT-5/);

assert.equal(isValidTimeZone("UTC"), true);
assert.equal(isValidTimeZone("America/Chicago"), true);
assert.equal(isValidTimeZone("not a zone"), false);

assert.equal(parseTimeZoneCookie(null), null);
assert.equal(
  parseTimeZoneCookie(`${TIMEZONE_COOKIE}=America%2FChicago`),
  "America/Chicago",
);
assert.equal(parseTimeZoneCookie(`${TIMEZONE_COOKIE}=nope`), null);

const slashUtc = formatSlashDateTime(iso, "UTC");
assert.equal(slashUtc.date, "08/29");
assert.equal(slashUtc.time, "10:15 PM");

const slashChicago = formatSlashDateTime(iso, "America/Chicago");
assert.equal(slashChicago.date, "08/29");
assert.equal(slashChicago.time, "5:15 PM");

console.log("chip time tests ok");
