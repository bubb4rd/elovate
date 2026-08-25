import assert from "node:assert/strict";
import { canApplyBreakdown, validateBreakdown, OcrHardFailure } from "./index";

// Hard: fewer than 2 core fields
assert.throws(
  () => validateBreakdown({ net: 10 }),
  (e) => e instanceof OcrHardFailure,
);
assert.throws(
  () => validateBreakdown({}),
  (e) => e instanceof OcrHardFailure,
);

// Soft: 2+ fields, math mismatch — still returns, Apply allowed if placement ok
const softMath = validateBreakdown({
  net: 1,
  placementSr: 100,
  elimSr: 10,
  fee: 50,
});
assert.ok(softMath.warnings.length > 0);
assert.equal(canApplyBreakdown(softMath), true);

// Soft: bad placement — Apply blocked
const softPlace = validateBreakdown({
  net: 20,
  placementSr: 77,
  elimSr: 10,
  fee: 10,
});
assert.equal(softPlace.placementId, undefined);
assert.equal(canApplyBreakdown(softPlace), false);

// Soft: elim over cap — Apply blocked
const softCap = validateBreakdown({
  net: 200,
  placementSr: 100,
  elimSr: 200,
  fee: 100,
});
assert.equal(canApplyBreakdown(softCap), false);

console.log("ocr error-matrix ok");
