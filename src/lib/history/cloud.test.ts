import assert from "node:assert/strict";
import { documentForMode } from "./map";
import { emptyDocument, appendMatch } from "./sessions";
import type { HistoryDocument } from "./types";

const t = new Date("2026-08-24T12:00:00.000Z");

function wzMatch(doc: HistoryDocument) {
  return appendMatch(
    doc,
    {
      mode: "wz",
      srBefore: 15000,
      srAfter: 15050,
      net: 50,
      placement: "top6",
      squadElims: 10,
      yourElims: 4,
      fee: 0,
      placementSr: 30,
      elimSr: 20,
      capped: false,
    },
    t,
  ).doc;
}

const wzOnly = wzMatch(emptyDocument());
const scoped = documentForMode(wzOnly, "wz");

assert.equal(scoped.sessions.length, 1);
assert.equal(scoped.matches.length, 1);
assert.equal(scoped.matches[0]?.mode, "wz");

console.log("history cloud scope tests ok");
