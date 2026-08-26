import assert from "node:assert/strict";
import {
  headerState,
  ownedHeaderIds,
  peakSrForHeaders,
  resolveEquippedHeaderId,
} from "./headers";

assert.deepEqual(ownedHeaderIds(0), ["default"]);
assert.deepEqual(ownedHeaderIds(3599), ["default"]);
assert.deepEqual(ownedHeaderIds(3600), ["default", "platinum"]);
assert.deepEqual(ownedHeaderIds(5399), ["default", "platinum"]);
assert.deepEqual(ownedHeaderIds(5400), ["default", "platinum", "diamond"]);
assert.deepEqual(ownedHeaderIds(7499), ["default", "platinum", "diamond"]);
assert.deepEqual(ownedHeaderIds(7500), ["default", "platinum", "diamond", "crimson"]);
assert.deepEqual(ownedHeaderIds(9999), ["default", "platinum", "diamond", "crimson"]);
assert.deepEqual(ownedHeaderIds(10_000), [
  "default",
  "platinum",
  "diamond",
  "crimson",
  "iridescent",
]);

assert.deepEqual(ownedHeaderIds(3288), ["default"]);
assert.deepEqual(ownedHeaderIds(5688), ["default", "platinum", "diamond"]);
assert.deepEqual(ownedHeaderIds(6472), ["default", "platinum", "diamond"]);
assert.deepEqual(ownedHeaderIds(8421), ["default", "platinum", "diamond", "crimson"]);
assert.deepEqual(ownedHeaderIds(12_880, ["elovate-staff"]), [
  "default",
  "platinum",
  "diamond",
  "crimson",
  "iridescent",
  "elovate-staff",
]);

assert.equal(ownedHeaderIds(2000, ["elovate-staff"]).includes("elovate-staff"), true);
assert.equal(ownedHeaderIds(12_000).includes("elovate-staff"), false);

assert.deepEqual(ownedHeaderIds(10_000), ownedHeaderIds(10_000));
assert.equal(ownedHeaderIds(10_000).includes("iridescent"), true);
assert.equal(ownedHeaderIds(2000).includes("iridescent"), false);

assert.equal(resolveEquippedHeaderId("diamond", ["default", "platinum", "diamond"]), "diamond");
assert.equal(resolveEquippedHeaderId("elovate-staff", ["default", "platinum"]), "default");
assert.equal(resolveEquippedHeaderId("not-a-header", ["default", "iridescent"]), "default");
assert.equal(resolveEquippedHeaderId(null, ["default", "crimson"]), "default");

const kai = headerState({
  peakSr: 12_880,
  grantedHeaderIds: ["elovate-staff"],
  equippedHeaderId: "default",
});
assert.deepEqual(kai.ownedHeaderIds, [
  "default",
  "platinum",
  "diamond",
  "crimson",
  "iridescent",
  "elovate-staff",
]);
assert.equal(kai.equippedHeaderId, "default");

assert.equal(
  peakSrForHeaders(
    {
      seasonPeakSr: 6400,
      allTimePeakSr: 10_200,
      peakRankLabel: "Iridescent",
      peakBoardRank: null,
      bestSession: null,
    },
    4100,
  ),
  10_200,
);

assert.equal(
  peakSrForHeaders(
    {
      seasonPeakSr: null,
      allTimePeakSr: null,
      peakRankLabel: null,
      peakBoardRank: null,
      bestSession: null,
    },
    5688,
  ),
  5688,
);

console.log("headers.test.ts ok");
