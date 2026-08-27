import assert from "node:assert/strict";
import {
  headerState,
  headersUnlockedByGrants,
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
  "fragger",
]);

assert.deepEqual(headersUnlockedByGrants(["elovate-staff"]), ["elovate-staff", "fragger"]);
assert.equal(ownedHeaderIds(2000, ["elovate-staff"]).includes("fragger"), true);
assert.equal(ownedHeaderIds(2000, ["elovate-staff"]).includes("elovate-staff"), true);
assert.equal(ownedHeaderIds(12_000).includes("fragger"), false);
assert.equal(ownedHeaderIds(12_000).includes("elovate-staff"), false);

assert.equal(resolveEquippedHeaderId("diamond", ["default", "platinum", "diamond"]), "diamond");
assert.equal(resolveEquippedHeaderId("fragger", ["default", "platinum"]), "default");
assert.equal(resolveEquippedHeaderId("elovate-staff", ["default", "elovate-staff", "fragger"]), "elovate-staff");
assert.equal(resolveEquippedHeaderId("fragger", ["default", "elovate-staff", "fragger"]), "fragger");
assert.equal(resolveEquippedHeaderId("not-a-header", ["default", "iridescent"]), "default");
assert.equal(resolveEquippedHeaderId(null, ["default", "crimson"]), "default");

const kai = headerState({
  peakSr: 12_880,
  grantedIds: ["elovate-staff"],
  equippedHeaderId: "default",
});
assert.deepEqual(kai.ownedHeaderIds, [
  "default",
  "platinum",
  "diamond",
  "crimson",
  "iridescent",
  "elovate-staff",
  "fragger",
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
