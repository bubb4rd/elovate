import assert from "node:assert/strict";
import { emptyDocument } from "./sessions";
import { mergeHistory } from "./merge";
import type { HistoryDocument, HistoryMatch, HistorySession, MpHistoryMatch } from "./types";

function mpSession(id: string, startSr: number): HistorySession {
  return {
    id,
    mode: "mp",
    startedAt: "2026-08-26T12:00:00.000Z",
    endedAt: null,
    startSr,
  };
}

function mpMatch(
  id: string,
  sessionId: string,
  srBefore: number,
  net: number,
): MpHistoryMatch {
  return {
    id,
    sessionId,
    createdAt: "2026-08-26T12:10:00.000Z",
    mode: "mp",
    srBefore,
    srAfter: srBefore + net,
    net,
    srPerWin: net,
  };
}

const localOnly: HistoryDocument = {
  version: 1,
  sessions: [mpSession("local-s", 1000)],
  matches: [mpMatch("local-m", "local-s", 1000, 40)],
};

const cloudOnly: HistoryDocument = {
  version: 1,
  sessions: [mpSession("cloud-s", 2000)],
  matches: [mpMatch("cloud-m", "cloud-s", 2000, 25)],
};

const merged = mergeHistory(localOnly, cloudOnly);
assert.equal(merged.sessions.length, 2);
assert.equal(merged.matches.length, 2);
assert.ok(merged.matches.some((match) => match.id === "local-m"));
assert.ok(merged.matches.some((match) => match.id === "cloud-m"));

const sharedLocal: HistoryMatch = mpMatch("same-m", "same-s", 1000, 10);
const sharedCloud: HistoryMatch = mpMatch("same-m", "same-s", 1000, 99);
const localWins = mergeHistory(
  { version: 1, sessions: [mpSession("same-s", 1000)], matches: [sharedLocal] },
  { version: 1, sessions: [mpSession("same-s", 1000)], matches: [sharedCloud] },
);
assert.equal(localWins.matches[0]?.net, 10);

assert.deepEqual(mergeHistory(emptyDocument(), emptyDocument()).matches, []);

console.log("history merge ok");
