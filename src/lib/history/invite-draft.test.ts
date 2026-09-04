import assert from "node:assert/strict";
import {
  currentSrFromHistory,
  draftFromSourceMatch,
  inviteMatchSummary,
  teammateSlugDiff,
  teammatesForAcceptedMatch,
} from "./invite-draft";
import { appendMatch, emptyDocument } from "./sessions";
import type { HistoryTeammate, WzHistoryMatch } from "./types";

const inviter: HistoryTeammate = {
  displayName: "Nova",
  slug: "nova",
  avatarUrl: "https://cdn.example/n.png",
};
const invitee: HistoryTeammate = { displayName: "Kai", slug: "kai", avatarUrl: null };
const guest: HistoryTeammate = { displayName: "Echo", slug: null, avatarUrl: null };
const other: HistoryTeammate = { displayName: "Opal", slug: "opal", avatarUrl: null };

assert.deepEqual(
  teammateSlugDiff([invitee, guest], [invitee, other, guest]),
  { added: ["opal"], removed: [] },
);
assert.deepEqual(
  teammateSlugDiff([invitee, other], [guest]),
  { added: [], removed: ["kai", "opal"] },
);

const accepted = teammatesForAcceptedMatch({
  inviter,
  sourceTeammates: [invitee, guest, other],
  inviteeSlug: "kai",
});
assert.deepEqual(
  accepted.map((teammate) => teammate.slug ?? teammate.displayName),
  ["nova", "Echo", "opal"],
);

const source: WzHistoryMatch = {
  id: "src",
  sessionId: "ses",
  createdAt: "2026-08-26T12:00:00.000Z",
  srBefore: 10000,
  srAfter: 10080,
  net: 80,
  mode: "wz",
  placement: "top6",
  squadElims: 8,
  yourElims: 3,
  fee: 50,
  placementSr: 50,
  elimSr: 80,
  capped: false,
  teammates: [invitee, guest, other],
};

const draft = draftFromSourceMatch(source, 3600, accepted);
assert.ok(draft);
assert.equal(draft.mode, "wz");
if (draft.mode === "wz") {
  assert.equal(draft.srBefore, 3600);
  assert.equal(draft.placement, "top6");
  assert.equal(draft.squadElims, 8);
  assert.equal(draft.yourElims, 3);
  assert.equal(draft.placementSr, 50);
  assert.equal(draft.elimSr, 51);
  assert.equal(draft.fee, 50);
  assert.equal(draft.net, 51);
  assert.equal(draft.srAfter, 3651);
  assert.equal(draft.capped, false);
}

assert.equal(inviteMatchSummary(source), "T6 · 8 squad elims");

const mpDraft = draftFromSourceMatch(
  {
    id: "mp",
    sessionId: "ses",
    createdAt: "2026-08-26T12:00:00.000Z",
    srBefore: 900,
    srAfter: 950,
    net: 50,
    mode: "mp",
    srPerWin: 50,
    teammates: [invitee],
  },
  1000,
  [inviter],
);
assert.ok(mpDraft);
assert.equal(mpDraft.mode, "mp");
if (mpDraft.mode === "mp") {
  assert.equal(mpDraft.srBefore, 1000);
  assert.equal(mpDraft.srAfter, 1050);
  assert.equal(mpDraft.net, 50);
  assert.equal(mpDraft.srPerWin, 50);
}

const seeded = appendMatch(
  emptyDocument(),
  {
    mode: "mp",
    srBefore: 1000,
    srAfter: 1050,
    net: 50,
    srPerWin: 50,
  },
  new Date("2026-08-26T12:00:00.000Z"),
);
assert.equal(currentSrFromHistory(seeded.doc, 0), 1050);
assert.equal(currentSrFromHistory(emptyDocument(), 8800), 8800);

const reused = appendMatch(
  seeded.doc,
  {
    mode: "mp",
    srBefore: 2000,
    srAfter: 2050,
    net: 50,
    srPerWin: 50,
  },
  new Date("2026-08-26T12:10:00.000Z"),
  seeded.match.id,
);
assert.equal(reused.match.id, seeded.match.id);
assert.equal(reused.doc.matches.length, 1);
assert.equal(reused.match.srBefore, 1000);

console.log("invite draft tests ok");
