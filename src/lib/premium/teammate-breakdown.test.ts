import assert from "node:assert/strict";
import {
  HISTORY_VERSION,
  type HistoryDocument,
  type HistoryTeammate,
  type WzHistoryMatch,
} from "@/lib/history";
import type { WzPlacementId } from "@/lib/ranked";
import {
  avgPlacementLabel,
  computeTeammateBreakdown,
  MIN_CALLOUT_GAMES,
} from "./teammate-breakdown";

const T0 = Date.parse("2026-08-01T18:00:00Z");

function mate(displayName: string): HistoryTeammate {
  return { displayName, slug: displayName.toLowerCase(), avatarUrl: null };
}

let seq = 0;
function wz(opts: {
  session: string;
  net: number;
  placement?: WzPlacementId;
  squadElims?: number;
  yourElims?: number;
  minsFromStart?: number;
  teammates: HistoryTeammate[];
}): WzHistoryMatch {
  seq += 1;
  return {
    id: `m${seq}`,
    sessionId: opts.session,
    createdAt: new Date(T0 + (opts.minsFromStart ?? seq * 20) * 60_000).toISOString(),
    srBefore: 5000,
    srAfter: 5000 + opts.net,
    net: opts.net,
    mode: "wz",
    placement: opts.placement ?? "top10",
    squadElims: opts.squadElims ?? 0,
    yourElims: opts.yourElims ?? 0,
    fee: 45,
    placementSr: 20,
    elimSr: 10,
    capped: false,
    teammates: opts.teammates,
  };
}

function doc(matches: WzHistoryMatch[]): HistoryDocument {
  return { version: HISTORY_VERSION, sessions: [], matches };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// --- empty ---------------------------------------------------------------

{
  const b = computeTeammateBreakdown(doc([]));
  assert.deepEqual(b.rows, [], "empty history → no rows");
  assert.equal(b.bestDuo, null);
  assert.equal(b.dropQueue, null);
  assert.equal(b.insight, null, "no data → no insight");
  assert.equal(b.gamesWithTeammates, 0);
}

// --- aggregation + sort by total net -----------------------------------

{
  const ace = mate("Ace");
  const nova = mate("Nova");
  const b = computeTeammateBreakdown(
    doc([
      wz({ session: "s1", net: 30, teammates: [ace, nova] }),
      wz({ session: "s1", net: -10, teammates: [ace] }),
      wz({ session: "s1", net: 50, teammates: [nova] }),
    ]),
  );
  assert.equal(b.rows.length, 2, "one row per distinct teammate");
  assert.equal(b.rows[0]!.teammate.displayName, "Nova", "sorted by total net desc");
  assert.equal(b.rows[0]!.totalNet, 80);
  assert.equal(b.rows[0]!.games, 2);
  assert.equal(b.rows[1]!.teammate.displayName, "Ace");
  assert.equal(b.rows[1]!.totalNet, 20);
  assert.equal(round(b.rows[1]!.avgNet), 10, "Ace avg = (30 + -10) / 2");
  assert.equal(round(b.rows[1]!.positiveNetRate), 0.5, "1 of 2 games positive");
  assert.equal(b.gamesWithTeammates, 3);
}

// --- callouts need MIN_CALLOUT_GAMES ----------------------------------

{
  const duo = mate("Duo");
  const twoGames = computeTeammateBreakdown(
    doc([
      wz({ session: "s1", net: 40, teammates: [duo] }),
      wz({ session: "s1", net: 40, teammates: [duo] }),
    ]),
  );
  assert.equal(twoGames.qualified.length, 0, `< ${MIN_CALLOUT_GAMES} games → unqualified`);
  assert.equal(twoGames.bestDuo, null, "no callout below the games floor");

  const threeGames = computeTeammateBreakdown(
    doc([
      wz({ session: "s1", net: 40, teammates: [duo] }),
      wz({ session: "s1", net: 40, teammates: [duo] }),
      wz({ session: "s1", net: 10, teammates: [duo] }),
    ]),
  );
  assert.equal(threeGames.bestDuo?.teammate.displayName, "Duo");
}

// --- best duo vs drop queue -----------------------------------------

{
  const carry = mate("Carry");
  const anchor = mate("Anchor");
  const matches: WzHistoryMatch[] = [];
  for (let i = 0; i < 4; i++) matches.push(wz({ session: "s1", net: 25, teammates: [carry] }));
  for (let i = 0; i < 4; i++) matches.push(wz({ session: "s2", net: -18, teammates: [anchor] }));
  const b = computeTeammateBreakdown(doc(matches));

  assert.equal(b.bestDuo?.teammate.displayName, "Carry", "positive avg → best duo");
  assert.equal(b.dropQueue?.teammate.displayName, "Anchor", "negative avg → drop queue");
  assert.match(
    b.insight ?? "",
    /Carry.*Anchor|Anchor.*Carry/,
    "insight names both duos",
  );
}

// --- no positive duo → drop-queue-only insight ---------------------

{
  const anchor = mate("Anchor");
  const b = computeTeammateBreakdown(
    doc([
      wz({ session: "s1", net: -5, teammates: [anchor] }),
      wz({ session: "s1", net: -15, teammates: [anchor] }),
      wz({ session: "s1", net: -10, teammates: [anchor] }),
    ]),
  );
  assert.equal(b.bestDuo, null);
  assert.equal(b.dropQueue?.teammate.displayName, "Anchor");
  assert.match(b.insight ?? "", /Anchor is costing you/);
}

// --- elim share: games without squad elims are excluded -----------

{
  const ace = mate("Ace");
  const b = computeTeammateBreakdown(
    doc([
      wz({ session: "s1", net: 20, squadElims: 10, yourElims: 6, teammates: [ace] }),
      wz({ session: "s1", net: 20, squadElims: 10, yourElims: 4, teammates: [ace] }),
      wz({ session: "s1", net: 20, squadElims: 0, yourElims: 0, teammates: [ace] }),
    ]),
  );
  assert.equal(round(b.rows[0]!.yourElimShare!), 0.5, "(6+4) / (10+10), zero-elim game ignored");
}

{
  const ace = mate("Ace");
  const b = computeTeammateBreakdown(
    doc([wz({ session: "s1", net: 20, squadElims: 0, yourElims: 0, teammates: [ace] })]),
  );
  assert.equal(b.rows[0]!.yourElimShare, null, "no squad-elim data → null share");
}

// --- avg placement -------------------------------------------------

{
  const ace = mate("Ace");
  const b = computeTeammateBreakdown(
    doc([
      wz({ session: "s1", net: 10, placement: "first", teammates: [ace] }), // rank 1
      wz({ session: "s1", net: 10, placement: "top13", teammates: [ace] }), // rank 13
    ]),
  );
  assert.equal(b.rows[0]!.avgPlacement, 7, "(1 + 13) / 2");
}

// --- SR/hour: elapsed time across a session ------------------------

{
  const ace = mate("Ace");
  // Two matches 60 min apart in one session, +30 net total → 30 SR/hour.
  const b = computeTeammateBreakdown(
    doc([
      wz({ session: "s1", net: 10, minsFromStart: 0, teammates: [ace] }),
      wz({ session: "s1", net: 20, minsFromStart: 60, teammates: [ace] }),
    ]),
  );
  assert.equal(round(b.rows[0]!.srPerHour!), 30, "30 net SR over one elapsed hour");
}

{
  const ace = mate("Ace");
  // Single match → nominal 20-min fallback → 15 net over (1/3) hr = 45/hr.
  const b = computeTeammateBreakdown(
    doc([wz({ session: "s1", net: 15, minsFromStart: 0, teammates: [ace] })]),
  );
  assert.equal(round(b.rows[0]!.srPerHour!), 45, "single game uses the nominal match length");
}

// --- avgPlacementLabel -------------------------------------------

assert.equal(avgPlacementLabel(1), "1st");
assert.equal(avgPlacementLabel(6.8), "Top 6");
assert.equal(avgPlacementLabel(11), "Top 10");
assert.equal(avgPlacementLabel(99), "Top 15");

console.log("teammate-breakdown.test.ts ok");
