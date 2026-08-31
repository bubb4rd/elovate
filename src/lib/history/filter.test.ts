import assert from "node:assert/strict";
import {
  clearHistoryFilterChip,
  emptyHistoryFilter,
  filterSummaries,
  historyDateFrom,
  historyFilterActive,
  historyFilterChips,
  uniqueHistoryTeammates,
} from "./filter";
import { teammateKey } from "./sessions";
import type { HistoryDocument, HistoryTeammate, SessionSummary, WzHistoryMatch } from "./types";

const bode: HistoryTeammate = {
  displayName: "Bode",
  slug: "bode",
  avatarUrl: null,
};
const nova: HistoryTeammate = {
  displayName: "Nova",
  slug: "nova",
  avatarUrl: null,
};

function wzMatch(overrides: Partial<WzHistoryMatch> = {}): WzHistoryMatch {
  return {
    id: "m1",
    sessionId: "s1",
    createdAt: "2026-08-30T12:00:00.000Z",
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
    teammates: [],
    ...overrides,
  };
}

function summary(overrides: Partial<SessionSummary> & { id?: string } = {}): SessionSummary {
  const id = overrides.id ?? overrides.session?.id ?? "s1";
  const matches = overrides.matches ?? [wzMatch({ sessionId: id })];
  return {
    session: {
      mode: "wz",
      startedAt: "2026-08-30T12:00:00.000Z",
      endedAt: null,
      startSr: 10000,
      ...overrides.session,
      id,
    },
    matches,
    games: overrides.games ?? matches.length,
    net: overrides.net ?? matches.reduce((sum, match) => sum + match.net, 0),
    endSr: overrides.endSr ?? 10080,
    streak: overrides.streak ?? 0,
  };
}

function isoLocal(year: number, month: number, day: number, hour = 12): string {
  return new Date(year, month, day, hour).toISOString();
}

const now = new Date(2026, 7, 30, 18, 0, 0);

const upWin = summary({
  id: "up",
  matches: [wzMatch({ id: "u1", sessionId: "up", net: 80, placement: "first", teammates: [bode] })],
  streak: 2,
  session: { startedAt: isoLocal(2026, 7, 30) } as SessionSummary["session"],
});

const downLoss = summary({
  id: "down",
  matches: [
    wzMatch({
      id: "d1",
      sessionId: "down",
      net: -40,
      placement: "top15",
      teammates: [nova],
      createdAt: "2026-08-20T12:00:00.000Z",
    }),
  ],
  streak: 0,
  session: { startedAt: isoLocal(2026, 7, 1) } as SessionSummary["session"],
});

const mixed = summary({
  id: "mixed",
  matches: [
    wzMatch({ id: "m-up", sessionId: "mixed", net: 50, placement: "top4", teammates: [bode, nova] }),
    wzMatch({ id: "m-down", sessionId: "mixed", net: -20, placement: "top10" }),
  ],
  streak: 0,
  session: { startedAt: isoLocal(2026, 6, 31) } as SessionSummary["session"],
});

const all = [upWin, downLoss, mixed];
const empty = emptyHistoryFilter();

assert.equal(historyFilterActive(empty), false);
assert.deepEqual(filterSummaries(all, empty, now), all);
assert.deepEqual(historyFilterChips(empty), []);

const byQuery = filterSummaries(all, { ...empty, query: "bode" }, now);
assert.deepEqual(
  byQuery.map((item) => item.session.id),
  ["up", "mixed"],
);
assert.equal(filterSummaries(all, { ...empty, query: "NOVA" }, now).length, 2);
assert.equal(filterSummaries(all, { ...empty, query: "  " }, now).length, 3);

const byOutcomeUp = filterSummaries(all, { ...empty, outcome: "up" }, now);
assert.deepEqual(
  byOutcomeUp.map((item) => item.session.id),
  ["up", "mixed"],
);
assert.deepEqual(
  filterSummaries(all, { ...empty, outcome: "down" }, now).map((item) => item.session.id),
  ["down"],
);
assert.deepEqual(
  filterSummaries(all, { ...empty, outcome: "mixed" }, now).map((item) => item.session.id),
  ["mixed"],
);

assert.equal(historyDateFrom("7d", now).getDate(), 24);
assert.equal(historyDateFrom("7d", now).getMonth(), 7);
assert.equal(historyDateFrom("30d", now).getDate(), 1);
assert.equal(historyDateFrom("month", now).getDate(), 1);
assert.equal(historyDateFrom("month", now).getMonth(), 7);

assert.deepEqual(
  filterSummaries(all, { ...empty, date: "7d" }, now).map((item) => item.session.id),
  ["up"],
);
assert.deepEqual(
  filterSummaries(all, { ...empty, date: "30d" }, now).map((item) => item.session.id),
  ["up", "down"],
);
assert.deepEqual(
  filterSummaries(all, { ...empty, date: "month" }, now).map((item) => item.session.id),
  ["up", "down"],
);

assert.deepEqual(
  filterSummaries(all, { ...empty, placement: "first" }, now).map((item) => item.session.id),
  ["up"],
);
assert.deepEqual(
  filterSummaries(all, { ...empty, placement: "top4" }, now).map((item) => item.session.id),
  ["mixed"],
);

assert.deepEqual(
  filterSummaries(all, { ...empty, teammate: bode }, now).map((item) => item.session.id),
  ["up", "mixed"],
);
assert.deepEqual(
  filterSummaries(all, { ...empty, teammate: nova }, now).map((item) => item.session.id),
  ["down", "mixed"],
);

assert.deepEqual(
  filterSummaries(all, { ...empty, streak: true }, now).map((item) => item.session.id),
  ["up"],
);

const combined = filterSummaries(
  all,
  { ...empty, query: "bode", outcome: "up", placement: "first", streak: true },
  now,
);
assert.deepEqual(
  combined.map((item) => item.session.id),
  ["up"],
);

const active = {
  ...empty,
  query: "bode",
  outcome: "up" as const,
  date: "7d" as const,
  placement: "first" as const,
  teammate: bode,
  streak: true,
};
assert.equal(historyFilterActive(active), true);
assert.deepEqual(historyFilterChips(active), [
  { id: "query", label: "bode" },
  { id: "outcome", label: "Up" },
  { id: "date", label: "Last 7d" },
  { id: "placement", label: "1st" },
  { id: "teammate", label: "Bode" },
  { id: "streak", label: "Streak" },
]);
assert.equal(clearHistoryFilterChip(active, "query").query, "");
assert.equal(clearHistoryFilterChip(active, "outcome").outcome, null);
assert.equal(clearHistoryFilterChip(active, "date").date, null);
assert.equal(clearHistoryFilterChip(active, "placement").placement, null);
assert.equal(clearHistoryFilterChip(active, "teammate").teammate, null);
assert.equal(clearHistoryFilterChip(active, "streak").streak, false);

const doc: HistoryDocument = {
  version: 1,
  sessions: [],
  matches: [
    wzMatch({
      id: "old",
      createdAt: "2026-08-20T12:00:00.000Z",
      teammates: [{ displayName: "OPAL", slug: null, avatarUrl: null }],
    }),
    wzMatch({
      id: "new",
      createdAt: "2026-08-30T12:00:00.000Z",
      teammates: [bode, nova],
      imported: true,
    }),
    wzMatch({
      id: "dup",
      createdAt: "2026-08-29T12:00:00.000Z",
      teammates: [{ displayName: "Bode", slug: "bode", avatarUrl: "https://cdn.example/b.png" }],
    }),
  ],
};
assert.deepEqual(
  uniqueHistoryTeammates(doc).map((teammate) => teammate.displayName),
  ["Bode", "Nova", "OPAL"],
);
assert.equal(teammateKey(uniqueHistoryTeammates(doc)[0]!), teammateKey(bode));

console.log("history filter ok");
