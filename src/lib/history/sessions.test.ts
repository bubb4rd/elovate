import assert from "node:assert/strict";
import {
  appendMatch,
  canUndoLast,
  deleteSession,
  emptyDocument,
  endSession,
  openSession,
  parseDocument,
  recentTeammates,
  setMatchTeammates,
  summarizeSession,
  undoLastMatch,
  winStreak,
} from "./sessions";

const mp = (srBefore: number, net: number) =>
  ({
    mode: "mp" as const,
    srBefore,
    srAfter: srBefore + net,
    net,
    srPerWin: net,
  });

const t1 = new Date("2026-08-24T12:00:00.000Z");
const first = appendMatch(emptyDocument(), mp(1000, 50), t1);
assert.equal(first.doc.sessions.length, 1);
assert.equal(first.doc.matches.length, 1);
assert.equal(first.session.startSr, 1000);
assert.equal(canUndoLast(first.doc, 1050), true);
assert.equal(canUndoLast(first.doc, 1000), false);

const t2 = new Date("2026-08-24T12:10:00.000Z");
const second = appendMatch(first.doc, mp(1050, 40), t2);
assert.equal(second.doc.sessions.length, 1);
assert.equal(second.doc.matches.length, 2);

const t3 = new Date("2026-08-24T15:00:00.000Z");
const rolled = appendMatch(second.doc, mp(1090, 30), t3);
assert.equal(rolled.doc.sessions.length, 2);
assert.equal(rolled.doc.sessions[0]?.endedAt, "2026-08-24T12:10:00.000Z");
assert.equal(openSession(rolled.doc)?.id, rolled.session.id);

const undone = undoLastMatch(rolled.doc, 1120);
assert.ok(undone);
assert.equal(undone.restoredSr, 1090);
assert.equal(undone.doc.matches.length, 2);
assert.equal(undone.doc.sessions.length, 1);

const closed = endSession(second.doc, second.session.id, t2.toISOString());
assert.equal(openSession(closed), undefined);
assert.equal(closed.sessions[0]?.endedAt, t2.toISOString());

const deleted = deleteSession(rolled.doc, rolled.doc.sessions[0]!.id);
assert.equal(deleted.sessions.length, 1);
assert.equal(deleted.sessions[0]?.id, rolled.session.id);
assert.equal(
  deleted.matches.every((match) => match.sessionId === rolled.session.id),
  true,
);
assert.equal(deleteSession(deleted, "missing").sessions.length, 1);

assert.equal(winStreak(second.doc.matches), 2);
const loss = appendMatch(second.doc, mp(1090, -20), new Date("2026-08-24T12:20:00.000Z"));
assert.equal(winStreak(loss.doc.matches), 0);
const rebound = appendMatch(loss.doc, mp(1070, 15), new Date("2026-08-24T12:30:00.000Z"));
assert.equal(winStreak(rebound.doc.matches), 1);
const hot = appendMatch(rebound.doc, mp(1085, 25), new Date("2026-08-24T12:40:00.000Z"));
assert.equal(winStreak(hot.doc.matches), 2);
const open = openSession(hot.doc);
assert.ok(open);
assert.equal(summarizeSession(open, hot.doc.matches.filter((m) => m.sessionId === open.id)).streak, 2);

assert.deepEqual(first.match.teammates, []);

const tagged = setMatchTeammates(first.doc, first.match.id, [
  { displayName: "  OPAL  ", slug: null, avatarUrl: null },
  { displayName: "Nova", slug: "nova", avatarUrl: "https://cdn.discordapp.com/n.png" },
  { displayName: "opal", slug: null, avatarUrl: null },
  { displayName: "Third", slug: null, avatarUrl: null },
  { displayName: "Fourth", slug: null, avatarUrl: null },
]);
assert.deepEqual(
  tagged.matches.find((match) => match.id === first.match.id)?.teammates,
  [
    { displayName: "OPAL", slug: null, avatarUrl: null },
    { displayName: "Nova", slug: "nova", avatarUrl: "https://cdn.discordapp.com/n.png" },
    { displayName: "Third", slug: null, avatarUrl: null },
  ],
);
assert.equal(setMatchTeammates(first.doc, "missing", []).matches.length, 1);

const later = appendMatch(
  tagged,
  mp(1050, 40),
  new Date("2026-08-24T12:10:00.000Z"),
);
const laterTagged = setMatchTeammates(later.doc, later.match.id, [
  { displayName: "Fresh", slug: null, avatarUrl: null },
  { displayName: "Nova", slug: "nova", avatarUrl: "https://cdn.discordapp.com/n.png" },
]);
assert.deepEqual(
  recentTeammates(laterTagged).map((teammate) => teammate.displayName),
  ["Fresh", "Nova", "OPAL", "Third"],
);
assert.deepEqual(
  recentTeammates(laterTagged, 2).map((teammate) => teammate.displayName),
  ["Fresh", "Nova"],
);

const importedDoc = appendMatch(
  laterTagged,
  { ...mp(1090, 20), imported: true, teammates: [{ displayName: "Squadmate", slug: "other", avatarUrl: null }] },
  new Date("2026-08-24T12:20:00.000Z"),
).doc;
assert.equal(
  recentTeammates(importedDoc).some((teammate) => teammate.displayName === "Squadmate"),
  false,
);

const parsedLegacy = parseDocument(
  JSON.stringify({
    version: 1,
    sessions: first.doc.sessions,
    matches: [{ ...first.match, teammates: undefined }],
  }),
);
assert.deepEqual(parsedLegacy.matches[0]?.teammates, []);

console.log("history session rules ok");
