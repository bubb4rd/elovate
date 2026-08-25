import assert from "node:assert/strict";
import { placementIdFromSr, isValidPlacementSr } from "./placement-from-sr";
import { parseSrBreakdown, parseSrFieldsFromText } from "./parse-sr-breakdown";
import { reverseElimKills } from "./reverse-elims";
import {
  canApplyBreakdown,
  countCoreFields,
  validateBreakdown,
  validateEditedBreakdown,
} from "./validate-breakdown";
import { OcrHardFailure } from "./types";

const SAMPLE = `
Deployment Fee
-58
Placement
+100
Eliminations
+45
Your eliminations
+18
Squad elims
+27
Total
+87
`;

const fields = parseSrFieldsFromText(SAMPLE);
assert.equal(fields.fee, 58);
assert.equal(fields.placementSr, 100);
assert.equal(fields.elimSr, 45);
assert.equal(fields.net, 87);
assert.equal(fields.yourElimSr, 18);
assert.equal(fields.squadElimSr, 27);
assert.equal(countCoreFields(fields), 4);

const parsed = parseSrBreakdown(SAMPLE);
assert.equal(parsed.placementId, "top4");
assert.equal(parsed.net, 87);
assert.equal(canApplyBreakdown(parsed), true);

assert.equal(isValidPlacementSr(100), true);
assert.equal(isValidPlacementSr(99), false);
assert.equal(placementIdFromSr(125), "first");

const kills = reverseElimKills({ yourElimSr: 14, squadElimSr: 20 });
assert.equal(kills.yourElims, 4);
assert.equal(kills.squadElims, 4);

assert.throws(() => parseSrBreakdown(""), (e) => e instanceof OcrHardFailure);
assert.throws(
  () => parseSrBreakdown("Hello world scoreboard Player1"),
  (e) => e instanceof OcrHardFailure,
);

const soft = validateBreakdown({
  net: 50,
  placementSr: 100,
  elimSr: 20,
  fee: 58,
});
assert.ok(soft.warnings.some((w) => w.includes("doesn’t add up") || w.includes("Double-check")));
assert.equal(canApplyBreakdown(soft), true);

const badPlacement = validateBreakdown({
  net: 10,
  placementSr: 99,
  elimSr: 20,
  fee: 10,
});
assert.equal(badPlacement.placementId, undefined);
assert.equal(canApplyBreakdown(badPlacement), false);

const overCap = validateEditedBreakdown({
  net: 200,
  placementSr: 100,
  elimSr: 160,
  fee: 60,
});
assert.equal(canApplyBreakdown(overCap), false);

const feeWarn = validateBreakdown(
  { net: 87, placementSr: 100, elimSr: 45, fee: 58 },
  { expectedFee: 70 },
);
assert.ok(feeWarn.warnings.some((w) => w.includes("Fee doesn’t match")));

console.log("ocr parse/validate ok");
