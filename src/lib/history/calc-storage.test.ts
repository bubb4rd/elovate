import assert from "node:assert/strict";
import { calcKey } from "./calc-storage";

assert.equal(calcKey("wz"), "elovate-calc-sr-wz");
assert.equal(calcKey("mp"), "elovate-calc-sr-mp");
assert.equal(calcKey("wz", "user-1"), "elovate-calc-sr-wz-user-1");
assert.equal(calcKey("wz", null), "elovate-calc-sr-wz");
assert.notEqual(calcKey("wz", "a"), calcKey("wz", "b"));

console.log("calc-storage: ok");
