import assert from "node:assert/strict";
import { filterRecentTeammates, guestTeammateFromQuery } from "./search";
import type { HistoryTeammate } from "@/lib/history/types";

const recents: HistoryTeammate[] = [
  { displayName: "OPAL", slug: null, avatarUrl: null },
  { displayName: "Nova", slug: "nova", avatarUrl: null },
];

assert.equal(filterRecentTeammates(recents, "").length, 2);
assert.deepEqual(
  filterRecentTeammates(recents, "op").map((t) => t.displayName),
  ["OPAL"],
);
assert.deepEqual(
  filterRecentTeammates(recents, "nova").map((t) => t.displayName),
  ["Nova"],
);

assert.deepEqual(guestTeammateFromQuery("  Echo  "), {
  displayName: "Echo",
  slug: null,
  avatarUrl: null,
});
assert.equal(guestTeammateFromQuery("   "), null);
assert.equal(guestTeammateFromQuery("x".repeat(41)), null);

console.log("teammate search helpers ok");
