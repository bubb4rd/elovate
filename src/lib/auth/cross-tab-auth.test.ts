import assert from "node:assert/strict";
import {
  AUTH_BROADCAST_CHANNEL,
  parseAuthCompleteMessage,
} from "./cross-tab-auth";

assert.equal(AUTH_BROADCAST_CHANNEL, "elovate-auth");

assert.deepEqual(parseAuthCompleteMessage({ type: "complete", next: "/wz/calc" }), {
  type: "complete",
  next: "/wz/calc",
});

assert.deepEqual(parseAuthCompleteMessage({ type: "complete", next: "/" }), {
  type: "complete",
  next: "/",
});

assert.deepEqual(parseAuthCompleteMessage({ type: "complete", next: "//evil" }), {
  type: "complete",
  next: "/",
});
assert.deepEqual(parseAuthCompleteMessage({ type: "complete", next: "https://evil.test" }), {
  type: "complete",
  next: "/",
});
assert.equal(parseAuthCompleteMessage({ type: "other", next: "/wz" }), null);
assert.equal(parseAuthCompleteMessage({ type: "complete" }), null);
assert.equal(parseAuthCompleteMessage(null), null);
assert.equal(parseAuthCompleteMessage("complete"), null);

console.log("cross-tab auth tests ok");
