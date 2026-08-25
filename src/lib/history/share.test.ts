import assert from "node:assert/strict";
import { shareCardCopy, shareFilename, formatShareDay, shareModeLabel } from "./share";
import type { SessionSummary } from "./types";

const started = new Date(2026, 7, 24, 12).toISOString();

const summary = {
  session: {
    id: "s1",
    mode: "wz",
    startedAt: started,
    endedAt: null,
    startSr: 9000,
  },
  matches: [],
  games: 8,
  net: 1027,
  endSr: 10027,
  streak: 3,
} satisfies SessionSummary;

assert.equal(formatShareDay(started), "Mon Aug 24 2026");
assert.equal(shareModeLabel("wz"), "Resurgence");
assert.equal(shareModeLabel("mp"), "Multiplayer");

const copy = shareCardCopy(summary);
assert.equal(copy.netLabel, "+1,027");
assert.equal(copy.gamesLabel, "8 games");
assert.equal(copy.dateLabel, "Mon Aug 24 2026");
assert.equal(copy.modeLabel, "Resurgence");
assert.equal(copy.playlistLabel, "Ranked");
assert.match(copy.alt, /Resurgence Ranked session \+1,027 SR/);

assert.equal(shareFilename(summary), "elovate-resurgence-2026-08-24.png");
assert.equal(
  shareFilename({ ...summary, session: { ...summary.session, mode: "mp" }, games: 1, net: -20 })
    .startsWith("elovate-multiplayer-"),
  true,
);

const oneGame = shareCardCopy({ ...summary, games: 1, net: 0 });
assert.equal(oneGame.gamesLabel, "1 game");
assert.equal(oneGame.netLabel, "0");

console.log("session share copy ok");
