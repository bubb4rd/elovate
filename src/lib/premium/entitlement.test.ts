import assert from "node:assert/strict";
import { entitlementFromProUntil, isProActive, NOT_PRO } from "./entitlement";

const NOW = new Date("2026-09-02T12:00:00Z");

// --- isProActive -----------------------------------------------------------

assert.equal(isProActive(null, NOW), false, "null → not pro");
assert.equal(isProActive(undefined, NOW), false, "undefined → not pro");
assert.equal(isProActive("", NOW), false, "empty string → not pro");
assert.equal(isProActive("not-a-date", NOW), false, "unparseable → not pro");

assert.equal(
  isProActive("2026-12-01T00:00:00Z", NOW),
  true,
  "future expiry → pro",
);
assert.equal(
  isProActive("2026-01-01T00:00:00Z", NOW),
  false,
  "past expiry → lapsed",
);
assert.equal(
  isProActive("2026-09-02T12:00:00Z", NOW),
  false,
  "expiry exactly now → not pro (strictly greater)",
);
assert.equal(
  isProActive("2026-09-02T12:00:01Z", NOW),
  true,
  "one second of runway → still pro",
);

// Season-pass style date-only value.
assert.equal(isProActive("2026-10-15", NOW), true, "date-only future → pro");

// Defaults to the real clock when `now` is omitted.
assert.equal(isProActive("1999-01-01T00:00:00Z"), false, "long-past, real clock");
assert.equal(isProActive("2999-01-01T00:00:00Z"), true, "far-future, real clock");

// --- entitlementFromProUntil --------------------------------------------------

assert.deepEqual(
  entitlementFromProUntil(null, NOW),
  { isPro: false, proUntil: null },
  "null → NOT_PRO shape",
);
assert.deepEqual(
  entitlementFromProUntil("2026-12-01T00:00:00Z", NOW),
  { isPro: true, proUntil: "2026-12-01T00:00:00Z" },
  "active pass keeps the raw timestamp",
);
assert.deepEqual(
  entitlementFromProUntil("2026-01-01T00:00:00Z", NOW),
  { isPro: false, proUntil: "2026-01-01T00:00:00Z" },
  "lapsed pass: isPro false but timestamp retained for 'renew' UI",
);

assert.deepEqual(NOT_PRO, { isPro: false, proUntil: null }, "NOT_PRO constant");

console.log("entitlement.test.ts ok");
