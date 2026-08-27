import assert from "node:assert/strict";
import { matchToRow, rowToMatch } from "./map";
import type { WzHistoryMatch } from "./types";

const match: WzHistoryMatch = {
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
  teammates: [
    { displayName: "OPAL", slug: null, avatarUrl: null },
    {
      displayName: "Nova",
      slug: "nova",
      avatarUrl: "https://cdn.discordapp.com/avatars/1.png",
    },
  ],
};

const row = matchToRow("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", match);
assert.deepEqual(row.teammates, match.teammates);

const roundTrip = rowToMatch(row);
assert.ok(roundTrip);
assert.equal(roundTrip.mode, "wz");
if (roundTrip.mode === "wz") {
  assert.deepEqual(roundTrip.teammates, match.teammates);
}

const emptyRow = matchToRow("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", {
  ...match,
  teammates: [],
});
assert.deepEqual(emptyRow.teammates, []);
assert.deepEqual(rowToMatch(emptyRow)?.teammates, []);

const junk = rowToMatch({
  ...row,
  teammates: [
    { displayName: "  ", slug: null, avatarUrl: null },
    { displayName: "Keep", slug: "keep", avatarUrl: null },
    { displayName: "Keep", slug: "keep", avatarUrl: null },
  ],
});
assert.deepEqual(junk?.teammates, [{ displayName: "Keep", slug: "keep", avatarUrl: null }]);

const snake = rowToMatch({
  ...row,
  teammates: [
    {
      display_name: "Guest",
      slug: null,
      avatar_url: null,
    } as unknown as (typeof row.teammates)[number],
  ],
});
assert.deepEqual(snake?.teammates, [{ displayName: "Guest", slug: null, avatarUrl: null }]);

console.log("history map teammates ok");
