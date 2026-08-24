import assert from "node:assert/strict";
import {
  appendMatch,
  canUndoLast,
  emptyDocument,
  endSession,
  openSession,
  undoLastMatch,
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

console.log("history session rules ok");
