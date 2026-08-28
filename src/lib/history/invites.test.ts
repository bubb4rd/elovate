import assert from "node:assert/strict";
import { wzMatchToProfileMatch } from "./invites";
import type { MpHistoryMatch, WzHistoryMatch } from "./types";

const wz: WzHistoryMatch = {
  id: "m1",
  sessionId: "s1",
  createdAt: "2026-08-26T12:20:00.000Z",
  mode: "wz",
  srBefore: 10000,
  srAfter: 10080,
  net: 80,
  placement: "top6",
  squadElims: 8,
  yourElims: 3,
  fee: 50,
  placementSr: 50,
  elimSr: 80,
  capped: false,
  teammates: [{ displayName: "Nova", slug: "nova", avatarUrl: null }],
};

const mp: MpHistoryMatch = {
  id: "m2",
  sessionId: "s1",
  createdAt: "2026-08-26T12:20:00.000Z",
  mode: "mp",
  srBefore: 10000,
  srAfter: 10050,
  net: 50,
  srPerWin: 50,
  teammates: [],
};

assert.deepEqual(wzMatchToProfileMatch(wz), {
  id: "m1",
  createdAt: "2026-08-26T12:20:00.000Z",
  placement: "top6",
  squadElims: 8,
  yourElims: 3,
  net: 80,
  srAfter: 10080,
  teammates: [{ displayName: "Nova", slug: "nova", avatarUrl: null }],
});
assert.equal(wzMatchToProfileMatch(mp), null);

console.log("invite profile match map tests ok");
