import assert from "node:assert/strict";
import {
  HISTORY_VERSION,
  type HistoryDocument,
  type WzHistoryMatch,
} from "@/lib/history";
import type { ClimbTarget } from "@/lib/ranked";
import {
  bucketDailyPoints,
  computeTrendProjection,
  dedupeGoals,
  formatCalloutDay,
  isTrendWindowId,
  MAX_PROJECTION_DAYS,
  MIN_TREND_DAYS,
  projectBandDays,
  projectCrossingDays,
  projectDaysToTarget,
  type GoalProjection,
  type TrendInput,
} from "./trend-projection";

const DAY = 86_400_000;
const NOW = Date.parse("2026-06-15T12:00:00.000Z");
const NOW_DAY_MS = Date.parse("2026-06-15T00:00:00.000Z");

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

let seq = 0;
function wz(opts: {
  dayOffset: number;
  hour?: number;
  net: number;
  srBefore?: number;
  srAfter?: number;
}): WzHistoryMatch {
  seq += 1;
  const ms =
    NOW_DAY_MS - opts.dayOffset * DAY + (opts.hour ?? 18) * 3_600_000;
  const srBefore = opts.srBefore ?? 5000;
  return {
    id: `m${seq}`,
    sessionId: "s1",
    createdAt: new Date(ms).toISOString(),
    srBefore,
    srAfter: opts.srAfter ?? srBefore + opts.net,
    net: opts.net,
    mode: "wz",
    placement: "top10",
    squadElims: 0,
    yourElims: 0,
    fee: 45,
    placementSr: 20,
    elimSr: 10,
    capped: false,
    teammates: [],
  };
}

function doc(matches: WzHistoryMatch[]): HistoryDocument {
  return { version: HISTORY_VERSION, sessions: [], matches };
}

function input(over: Partial<TrendInput> & Pick<TrendInput, "doc">): TrendInput {
  return {
    now: NOW,
    currentSr: 6000,
    cutoff: { sr: 10_500, pacePerDay: 30 },
    savedGoals: [] as ClimbTarget[],
    ...over,
  };
}

// --- 1. empty document -------------------------------------------------

{
  const t = computeTrendProjection(input({ doc: doc([]) }));
  for (const id of ["7d", "30d", "season"] as const) {
    const w = t.windows[id];
    assert.equal(w.days.length, 0, `${id}: no days`);
    assert.equal(w.totalNet, 0);
    assert.equal(w.games, 0);
    assert.equal(w.srPerDay, 0);
    assert.equal(w.sdDaily, null);
    assert.equal(w.projection, null);
    assert.equal(w.firstDay, null);
    assert.equal(w.goals.length, 3);
    for (const g of w.goals) {
      assert.equal(g.status, "insufficient-history", `${id}/${g.target}`);
    }
    assert.equal(w.hero, null, `${id}: no history → no hero`);
    assert.deepEqual(w.cutoffHistory, [], `${id}: no cutoff series`);
    assert.deepEqual(w.cutoffProjection, [], `${id}: no ray → no cutoff ray`);
    assert.deepEqual(w.callouts, [], `${id}: no callouts`);
  }
  assert.equal(t.seasonEndMs, null, "no season end supplied");
}

// --- 2. same-day matches collapse ------------------------------------

{
  const t = computeTrendProjection(
    input({
      doc: doc([
        wz({ dayOffset: 1, hour: 9, net: 20, srBefore: 5000, srAfter: 5020 }),
        wz({ dayOffset: 1, hour: 14, net: -5, srBefore: 5020, srAfter: 5015 }),
        wz({ dayOffset: 1, hour: 21, net: 30, srBefore: 5015, srAfter: 5045 }),
      ]),
    }),
  );
  const day = t.windows.season.days.find((d) => d.day === "2026-06-14");
  assert.ok(day, "the collapsed day exists");
  assert.equal(day!.games, 3, "3 games in one bucket");
  assert.equal(day!.netSr, 45, "summed net 20 - 5 + 30");
  assert.equal(day!.endSr, 5045, "endSr from the latest match that day");
}

// --- 3. gap day is a materialized zero-net day ----------------------

{
  const t = computeTrendProjection(
    input({
      doc: doc([
        wz({ dayOffset: 4, net: 40 }),
        wz({ dayOffset: 3, net: 10 }),
        // gap on dayOffset 2
        wz({ dayOffset: 1, net: 25 }),
        wz({ dayOffset: 0, net: 5 }),
      ]),
    }),
  );
  const w = t.windows.season;
  assert.equal(w.elapsedDays, 5, "day -4 .. day 0 inclusive");
  assert.equal(w.activeDays, 4, "gap day not active");
  const gap = w.days.find((d) => d.day === "2026-06-13");
  assert.ok(gap, "gap day materialized");
  assert.equal(gap!.games, 0);
  assert.equal(gap!.netSr, 0);
}

// --- 4. window scoping + season anchor -----------------------------

{
  const matches = [
    wz({ dayOffset: 40, net: 500 }),
    wz({ dayOffset: 20, net: 200 }),
    wz({ dayOffset: 6, net: 50 }),
    wz({ dayOffset: 2, net: 25 }),
  ];
  const t = computeTrendProjection(input({ doc: doc(matches) }));
  assert.equal(t.windows["7d"].totalNet, 75, "7d keeps only the last-7-day matches");
  assert.equal(t.windows["30d"].totalNet, 275, "30d keeps last 30 days");
  assert.equal(t.windows.season.totalNet, 775, "season keeps everything");
  assert.equal(
    t.windows.season.firstDay,
    "2026-05-06",
    "season anchors to the earliest logged match day",
  );
  assert.equal(t.windows["7d"].elapsedDays, 7, "7d spans 7 calendar days");
  assert.equal(t.windows["30d"].elapsedDays, 30, "30d spans 30 calendar days");
}

// --- 5. window boundary is inclusive ------------------------------

{
  // 7d window start day = 2026-06-09 (NOW day - 6).
  const onBoundary = wz({ dayOffset: 6, hour: 0, net: 33 });
  const justBefore = wz({ dayOffset: 7, hour: 23, net: 999 });
  const t = computeTrendProjection(input({ doc: doc([justBefore, onBoundary]) }));
  assert.equal(
    t.windows["7d"].totalNet,
    33,
    "match on the first window day is in, the day before is out",
  );
  assert.equal(t.windows["7d"].firstDay, "2026-06-09");
}

// --- 6. pace metrics are exact ----------------------------------

{
  const matches = [
    wz({ dayOffset: 6, net: 100 }),
    wz({ dayOffset: 5, net: 50 }),
    // gap day 4
    wz({ dayOffset: 3, hour: 10, net: 20 }),
    wz({ dayOffset: 3, hour: 20, net: 10 }),
    // gap day 2
    wz({ dayOffset: 1, net: -30 }),
    wz({ dayOffset: 0, net: 40 }),
  ];
  const w = computeTrendProjection(input({ doc: doc(matches) })).windows["7d"];
  assert.equal(w.totalNet, 190);
  assert.equal(w.games, 6);
  assert.equal(w.elapsedDays, 7);
  assert.equal(w.activeDays, 5);
  assert.equal(round(w.srPerDay), round(190 / 7));
  assert.equal(w.srPerActiveDay, 38);
  assert.equal(round(w.srPerGame), round(190 / 6));
}

// --- 7. sample SD --------------------------------------------------

{
  const rising = [10, 20, 30, 40, 50].map((net, i) =>
    wz({ dayOffset: 4 - i, net }),
  );
  const w = computeTrendProjection(input({ doc: doc(rising) })).windows["7d"];
  // mean 30; sum sq dev 1000; sample var 250; sd sqrt(250)
  assert.equal(round(w.sdDaily!), round(Math.sqrt(250)));

  const flat = [0, 1, 2, 3, 4].map((off) => wz({ dayOffset: off, net: 20 }));
  const flatW = computeTrendProjection(input({ doc: doc(flat) })).windows["7d"];
  assert.equal(flatW.sdDaily, 0, "constant daily net → sd 0");
}

// --- 8. below MIN_TREND_DAYS -------------------------------------

{
  const matches = [
    wz({ dayOffset: 2, net: 60 }),
    wz({ dayOffset: 1, net: 30 }),
    wz({ dayOffset: 0, net: 30 }),
  ];
  const w = computeTrendProjection(input({ doc: doc(matches) })).windows["7d"];
  assert.equal(w.elapsedDays, 3, "only 3 days of history");
  assert.ok(w.elapsedDays < MIN_TREND_DAYS);
  assert.equal(round(w.srPerDay), round(120 / 3), "pace still reported");
  assert.equal(w.sdDaily, null, "sd withheld");
  assert.equal(w.projection, null, "no ray");
  for (const g of w.goals) {
    assert.equal(g.status, "insufficient-history");
  }
}

// --- 9-12. static projection ----------------------------------

{
  assert.equal(projectDaysToTarget(1000, 100), 10);
  assert.equal(projectDaysToTarget(0, 100), 0);
  assert.equal(projectDaysToTarget(-50, 100), 0);
  assert.equal(projectDaysToTarget(500, 0), null);
  assert.equal(projectDaysToTarget(500, -10), null);

  // Fixture: currentSr 9000, +100/day over 7 days → Iridescent (10000) in 10d.
  const climb = [0, 1, 2, 3, 4, 5, 6].map((off) =>
    wz({ dayOffset: off, net: 100, srBefore: 8000, srAfter: 8100 }),
  );
  const t = computeTrendProjection(
    input({
      doc: doc(climb),
      currentSr: 9000,
      cutoff: { sr: 10_500, pacePerDay: 10 },
    }),
  );
  const iri = t.windows["7d"].goals.find((g) => g.target === "iridescent")!;
  assert.equal(iri.status, "projected");
  assert.equal(round(iri.daysToGoal!), 10);
  assert.equal(iri.etaMs, NOW + 10 * DAY, "eta is now + 10 days");
  assert.equal(iri.etaMs, NOW + iri.daysToGoal! * DAY);

  // reached
  const reached = computeTrendProjection(
    input({
      doc: doc(climb),
      currentSr: 10_800,
      cutoff: { sr: 12_000, pacePerDay: 10 },
    }),
  );
  const iriReached = reached.windows["7d"].goals.find(
    (g) => g.target === "iridescent",
  )!;
  assert.equal(iriReached.status, "reached");
  assert.equal(iriReached.daysToGoal, 0);
  assert.equal(iriReached.etaMs, null);

  // negative pace → unreachable
  const falling = [0, 1, 2, 3, 4, 5, 6].map((off) => wz({ dayOffset: off, net: -30 }));
  const down = computeTrendProjection(
    input({
      doc: doc(falling),
      currentSr: 6000,
      cutoff: { sr: 10_500, pacePerDay: null },
    }),
  );
  for (const g of down.windows["7d"].goals) {
    assert.equal(g.status, "unreachable", `${g.target} unreachable on negative pace`);
    assert.equal(g.etaMs, null);
  }

  // beyond horizon
  const crawl = [0, 1, 2, 3, 4, 5, 6].map((off) => wz({ dayOffset: off, net: 1 }));
  const far = computeTrendProjection(
    input({ doc: doc(crawl), currentSr: 100, cutoff: { sr: 10_500, pacePerDay: 1 } }),
  );
  const iriFar = far.windows["7d"].goals.find((g) => g.target === "iridescent")!;
  assert.ok(9900 > MAX_PROJECTION_DAYS);
  assert.equal(iriFar.status, "beyond-horizon");
  assert.equal(iriFar.etaMs, null);
}

// --- 13-15. band dates ------------------------------------------

{
  const exact = projectBandDays(1000, 100, 0);
  assert.equal(exact.earliest, 10);
  assert.equal(exact.latest, 10);

  const spread = projectBandDays(1000, 100, 30);
  assert.ok(spread.earliest! < 10 && spread.latest! > 10, "band straddles the point");
  assert.ok(Number.isFinite(spread.earliest!) && spread.earliest! > 0);
  assert.ok(Number.isFinite(spread.latest!) && spread.latest! > 0);

  assert.deepEqual(projectBandDays(1000, -5, 30), { earliest: null, latest: null });
  assert.deepEqual(projectBandDays(1000, 0, 30), { earliest: null, latest: null });
}

// --- 16-20. moving T250 ---------------------------------------

{
  assert.equal(projectCrossingDays(900, 150, 60), 10, "900 / (150 - 60)");
  assert.equal(projectCrossingDays(900, 100, 100), null, "equal pace → null");
  assert.equal(projectCrossingDays(900, 40, 100), null, "losing ground → null");
  assert.equal(projectCrossingDays(-5, 40, 100), 0, "already crossed");

  // equal pace → unreachable, ground lost 0
  const flat = [0, 1, 2, 3, 4, 5, 6].map((off) => wz({ dayOffset: off, net: 100 }));
  const t1 = computeTrendProjection(
    input({
      doc: doc(flat),
      currentSr: 9000,
      cutoff: { sr: 10_000, pacePerDay: 100 },
    }),
  );
  const g1 = t1.windows["7d"].goals.find((g) => g.target === "top250")!;
  assert.equal(g1.status, "unreachable");
  assert.equal(g1.groundLostPerDay, 0);
  assert.equal(g1.etaMs, null);
  assert.ok(Number.isFinite(g1.groundLostPerDay!));

  // cutoff faster → ground lost positive
  const t2 = computeTrendProjection(
    input({
      doc: doc(flat),
      currentSr: 9000,
      cutoff: { sr: 10_000, pacePerDay: 180 },
    }),
  );
  const g2 = t2.windows["7d"].goals.find((g) => g.target === "top250")!;
  assert.equal(g2.status, "unreachable");
  assert.equal(g2.groundLostPerDay, 80, "180 - 100");

  // already above the cutoff → reached with a buffer
  const t3 = computeTrendProjection(
    input({
      doc: doc(flat),
      currentSr: 10_400,
      cutoff: { sr: 10_000, pacePerDay: 160 },
    }),
  );
  const g3 = t3.windows["7d"].goals.find((g) => g.target === "top250")!;
  assert.equal(g3.status, "reached");
  assert.ok(g3.bufferDays! > 0 && Number.isFinite(g3.bufferDays!));

  // cutoff SR unavailable
  const t4 = computeTrendProjection(
    input({ doc: doc(flat), currentSr: 9000, cutoff: { sr: null, pacePerDay: null } }),
  );
  const g4 = t4.windows["7d"].goals.find((g) => g.target === "top250")!;
  assert.equal(g4.status, "cutoff-unavailable");

  // cutoff pace unavailable → static fallback, not moving
  const t5 = computeTrendProjection(
    input({
      doc: doc(flat),
      currentSr: 9000,
      cutoff: { sr: 10_500, pacePerDay: null },
    }),
  );
  const g5 = t5.windows["7d"].goals.find((g) => g.target === "top250")!;
  assert.equal(g5.moving, false);
  assert.equal(g5.status, "projected");
  assert.equal(round(g5.daysToGoal!), round(1500 / 100));
}

// --- 21. resolveTarget integration --------------------------------

{
  const climb = [0, 1, 2, 3, 4, 5, 6].map((off) => wz({ dayOffset: off, net: 40 }));
  const t = computeTrendProjection(
    input({
      doc: doc(climb),
      currentSr: 6000,
      cutoff: { sr: 10_500, pacePerDay: 20 },
    }),
  );
  const g = (target: ClimbTarget) =>
    t.windows["7d"].goals.find((x) => x.target === target)!;
  assert.equal(g("nextTier").targetSr, 6100, "Diamond I → Diamond II at 6100");
  assert.equal(g("iridescent").targetSr, 10_000);
  assert.equal(g("top250").targetSr, 10_500, "T250 uses the live cutoff");
}

// --- 22. saved-goal flagging -------------------------------------

{
  const climb = [0, 1, 2, 3, 4, 5, 6].map((off) => wz({ dayOffset: off, net: 40 }));
  const t = computeTrendProjection(
    input({ doc: doc(climb), savedGoals: ["iridescent"] }),
  );
  const goals = t.windows["7d"].goals;
  assert.equal(goals.length, 3, "all three cards regardless of saved goals");
  assert.equal(goals.find((g) => g.target === "iridescent")!.isSavedGoal, true);
  assert.equal(goals.find((g) => g.target === "nextTier")!.isSavedGoal, false);
  assert.equal(goals.find((g) => g.target === "top250")!.isSavedGoal, false);
}

// --- 23. hero insight branches -------------------------------------

{
  const strong = [0, 1, 2, 3, 4, 5, 6].map((off) => wz({ dayOffset: off, net: 100 }));
  const h1 = computeTrendProjection(
    input({
      doc: doc(strong),
      currentSr: 6000,
      cutoff: { sr: 10_500, pacePerDay: 10 },
    }),
  ).windows["7d"].hero!;
  assert.equal(h1.tone, "accent");
  assert.equal(h1.headline, "Next tier in 1 day", "catching → goal + days");
  assert.match(h1.support ?? "", /SR\/day · last 7 days/);

  const h2 = computeTrendProjection(
    input({
      doc: doc([0, 1, 2, 3, 4, 5, 6].map((off) => wz({ dayOffset: off, net: 50 }))),
      currentSr: 9000,
      cutoff: { sr: 10_000, pacePerDay: 200 },
    }),
  ).windows["7d"].hero!;
  assert.equal(h2.tone, "negative");
  assert.equal(h2.headline, "Losing 150 SR/day to the cutoff");
  assert.equal(h2.support, "You +50/day · cutoff +200/day · last 7 days");

  const h3 = computeTrendProjection(
    input({
      doc: doc([0, 1, 2, 3, 4, 5, 6].map((off) => wz({ dayOffset: off, net: -30 }))),
      currentSr: 6000,
      cutoff: { sr: 10_500, pacePerDay: null },
    }),
  ).windows["7d"].hero!;
  assert.equal(h3.tone, "negative");
  assert.equal(h3.headline, "-30 SR/day");
  assert.match(h3.support ?? "", /no open goal lands at this pace/);

  const h4 = computeTrendProjection(
    input({
      doc: doc([
        wz({ dayOffset: 2, net: 20 }),
        wz({ dayOffset: 1, net: 20 }),
        wz({ dayOffset: 0, net: 20 }),
      ]),
    }),
  ).windows["7d"].hero!;
  assert.equal(h4.tone, "muted");
  assert.equal(h4.headline, "3 days logged");
  assert.match(h4.support ?? "", /from day 5\.$/);

  assert.equal(
    computeTrendProjection(input({ doc: doc([]) })).windows["7d"].hero,
    null,
  );

  // No em-dash anywhere in generated copy.
  const copy = [h1, h2, h3, h4]
    .flatMap((h) => [h.headline, h.support ?? ""])
    .join(" ");
  assert.ok(!copy.includes("—"), "no em-dash in hero copy");
}

// --- 25. goal dedupe --------------------------------------------------

{
  const goal = (
    over: Partial<GoalProjection> & Pick<GoalProjection, "target" | "targetSr">,
  ): GoalProjection => ({
    label: over.target,
    remaining: 0,
    isSavedGoal: false,
    moving: false,
    status: "projected",
    daysToGoal: null,
    etaMs: null,
    etaEarliestMs: null,
    etaLatestMs: null,
    groundLostPerDay: null,
    bufferDays: null,
    ...over,
  });

  // Same SR from two targets → one row, and the saved goal's identity wins.
  const folded = dedupeGoals([
    goal({ target: "nextTier", targetSr: 24_760, label: "Top 250" }),
    goal({ target: "iridescent", targetSr: 10_000, status: "reached" }),
    goal({ target: "top250", targetSr: 24_760, label: "Live T250", isSavedGoal: true }),
  ]);
  assert.equal(folded.length, 2, "24,760 collapses to one row");
  assert.equal(folded[0]!.target, "top250", "open row first");
  assert.equal(folded[0]!.label, "Live T250", "user's goal label survives");
  assert.equal(folded[0]!.isSavedGoal, true);
  assert.equal(folded[1]!.target, "iridescent", "reached row sorts last");

  // No saved goal → the more meaningful target name wins.
  const byPriority = dedupeGoals([
    goal({ target: "nextTier", targetSr: 24_760, label: "Top 250" }),
    goal({ target: "top250", targetSr: 24_760, label: "Live T250" }),
  ]);
  assert.equal(byPriority.length, 1);
  assert.equal(byPriority[0]!.target, "top250");

  // Distinct SRs stay distinct, ascending.
  const distinct = dedupeGoals([
    goal({ target: "top250", targetSr: 12_000 }),
    goal({ target: "nextTier", targetSr: 6100 }),
  ]);
  assert.deepEqual(
    distinct.map((g) => g.targetSr),
    [6100, 12_000],
  );

  // `cutoff-unavailable` placeholders are never folded into a real line.
  const placeholder = dedupeGoals([
    goal({ target: "nextTier", targetSr: 9000, status: "reached" }),
    goal({ target: "top250", targetSr: 9000, status: "cutoff-unavailable" }),
  ]);
  assert.equal(placeholder.length, 2);

  // The saved goal can be "Next tier" while it collides with T250's SR at
  // Iridescent — the label/identity follows the saved goal, but the moving
  // cutoff-crossing math must survive the merge, not get silently replaced by
  // Next tier's static projection.
  const savedNextTierCollidesWithCutoff = dedupeGoals([
    goal({
      target: "nextTier",
      targetSr: 24_760,
      label: "Top 250",
      isSavedGoal: true,
      moving: false,
      status: "projected",
      daysToGoal: 999,
      etaMs: 999,
    }),
    goal({
      target: "top250",
      targetSr: 24_760,
      label: "Live T250",
      moving: true,
      status: "unreachable",
      groundLostPerDay: 374,
    }),
  ]);
  assert.equal(savedNextTierCollidesWithCutoff.length, 1);
  const merged = savedNextTierCollidesWithCutoff[0]!;
  assert.equal(merged.label, "Top 250", "saved goal's label survives");
  assert.equal(merged.isSavedGoal, true);
  assert.equal(
    merged.status,
    "unreachable",
    "the moving cutoff-crossing status is not lost to the saved static goal",
  );
  assert.equal(merged.moving, true);
  assert.equal(merged.groundLostPerDay, 374);
}

// --- 26. the Iridescent collision, end to end -----------------------

{
  // At 11,192 with a 24,760 cutoff, resolveTarget("nextTier") IS the cutoff.
  const climb = [0, 1, 2, 3, 4, 5, 6].map((off) => wz({ dayOffset: off, net: 100 }));
  const t = computeTrendProjection(
    input({
      doc: doc(climb),
      currentSr: 11_192,
      cutoff: { sr: 24_760, pacePerDay: 476 },
      savedGoals: ["top250"],
    }),
  );
  const w = t.windows["7d"];
  assert.equal(w.goals.length, 3, "raw goals untouched for existing callers");
  assert.equal(
    w.goals.find((g) => g.target === "nextTier")!.targetSr,
    w.goals.find((g) => g.target === "top250")!.targetSr,
    "the collision is real",
  );
  assert.equal(w.goalRows.length, 2, "deduped to T250 + Iridescent");
  assert.equal(w.goalRows[0]!.target, "top250");
  assert.equal(w.goalRows[0]!.label, "Live T250");
  assert.equal(w.goalRows[0]!.status, "unreachable");
  assert.equal(w.goalRows[1]!.target, "iridescent");
  assert.equal(w.goalRows[1]!.status, "reached");

  // The chart has to be able to agree with the hero.
  assert.equal(w.hero!.tone, "negative");
  assert.match(w.hero!.headline, /^Losing 376 SR\/day to the cutoff$/);
  assert.ok(w.cutoffProjection.length > 1, "cutoff is a drawn series");
  const firstCut = w.cutoffProjection[0]!;
  const lastCut = w.cutoffProjection[w.cutoffProjection.length - 1]!;
  const lastYou = w.projection!.points[w.projection!.points.length - 1]!;
  assert.equal(firstCut.sr, 24_760, "cutoff ray starts at the live cutoff");
  assert.ok(
    lastCut.sr > lastYou.projected,
    "the dash never crosses a faster cutoff",
  );

  // No goal-name label planted on an optimistic dash: each series is named at
  // today's value and numbered where it finishes, and nothing else.
  assert.deepEqual(
    w.callouts.map((c) => c.id),
    ["now", "cutoff", "finish-you", "finish-cutoff"],
  );

  const nowMark = w.callouts.find((c) => c.id === "now")!;
  assert.equal(nowMark.sr, 11_192);
  assert.equal(nowMark.label, "11,192");
  assert.equal(nowMark.sublabel, "Now");

  // The second series is named, not an anonymous grey line.
  const cutoffMark = w.callouts.find((c) => c.id === "cutoff")!;
  assert.equal(cutoffMark.t, NOW);
  assert.equal(cutoffMark.sr, 24_760);
  assert.equal(cutoffMark.label, "24,760");
  assert.equal(cutoffMark.sublabel, "Cutoff");
  assert.equal(cutoffMark.tone, "muted");

  // Both projections carry their finishing number at the chart's right edge.
  const days = w.projection!.horizonDays;
  assert.equal(days, 45, "no season end → the unreachable-goal floor");
  assert.equal(w.srPerDay, 100);

  const youFinish = w.callouts.find((c) => c.id === "finish-you")!;
  assert.equal(youFinish.kind, "finish");
  assert.equal(youFinish.t, NOW + days * DAY);
  assert.equal(youFinish.sr, 11_192 + 100 * 45);
  assert.equal(youFinish.label, "15,692");
  assert.equal(youFinish.sublabel, formatCalloutDay(NOW + days * DAY, NOW));
  assert.equal(youFinish.tone, "accent");

  const cutoffFinish = w.callouts.find((c) => c.id === "finish-cutoff")!;
  assert.equal(cutoffFinish.kind, "finish");
  assert.equal(cutoffFinish.t, youFinish.t, "both finish at the same x");
  assert.equal(cutoffFinish.sr, 24_760 + 476 * 45);
  assert.equal(cutoffFinish.label, "46,180");
  assert.equal(
    cutoffFinish.sublabel,
    "won't catch",
    "the losing verdict rides the cutoff's finish label",
  );
  assert.equal(cutoffFinish.tone, "muted");
  assert.ok(
    cutoffFinish.sr > youFinish.sr,
    "the cutoff finishes above the player",
  );
}

// --- 27. a hit callout lands on the crossing ------------------------

{
  const climb = [0, 1, 2, 3, 4, 5, 6].map((off) =>
    wz({ dayOffset: off, net: 100, srBefore: 8000, srAfter: 8100 }),
  );
  const w = computeTrendProjection(
    input({
      doc: doc(climb),
      currentSr: 9000,
      cutoff: { sr: 10_500, pacePerDay: 10 },
    }),
  ).windows["7d"];

  const iri = w.goalRows.find((g) => g.target === "iridescent")!;
  const hit = w.callouts.find((c) => c.id === "hit-iridescent")!;
  assert.equal(hit.kind, "hit");
  assert.equal(hit.t, iri.etaMs);
  assert.ok(Math.abs(hit.sr - iri.targetSr) < 1e-6, "callout sits on the goal SR");
  assert.equal(hit.label, "Jun 25", "same-year date has no year");
  assert.equal(hit.sublabel, "Iridescent");
  assert.equal(
    w.callouts.find((c) => c.id === "finish-cutoff")!.sublabel,
    "Cutoff",
    "no losing verdict when the pace catches",
  );
}

// --- 28. cutoff series + season end ---------------------------------

{
  const climb = [0, 1, 2, 3, 4, 5, 6].map((off) => wz({ dayOffset: off, net: 40 }));
  const seasonEnd = NOW + 20 * DAY;
  const cutoffSeries = [
    // Three snapshots on one day: only the last survives bucketing.
    { t: NOW_DAY_MS - 2 * DAY + 3_600_000, sr: 10_400 },
    { t: NOW_DAY_MS - 2 * DAY + 7_200_000, sr: 10_410 },
    { t: NOW_DAY_MS - 2 * DAY + 10_800_000, sr: 10_420 },
    { t: NOW_DAY_MS - 1 * DAY, sr: 10_460 },
    // Older than the 7d window but inside the season window.
    { t: NOW_DAY_MS - 40 * DAY, sr: 9000 },
  ];
  const t = computeTrendProjection(
    input({
      doc: doc(climb),
      currentSr: 9000,
      cutoff: { sr: 10_500, pacePerDay: 30 },
      cutoffSeries,
      seasonEndMs: seasonEnd,
    }),
  );
  assert.equal(t.seasonEndMs, seasonEnd);

  const w7 = t.windows["7d"];
  assert.deepEqual(
    w7.cutoffHistory.map((p) => p.sr),
    [10_420, 10_460],
    "one point per UTC day, last sample wins, clipped to the window",
  );
  assert.ok(
    w7.projection!.horizonDays <= 20,
    "horizon clips to season end when the record has one",
  );
  assert.equal(
    w7.cutoffProjection[w7.cutoffProjection.length - 1]!.t,
    NOW + w7.projection!.horizonDays * DAY,
    "cutoff ray shares the player's horizon",
  );

  // The season window's first day is the first logged match day, so a cutoff
  // snapshot 40 days back is still outside it here.
  assert.deepEqual(
    t.windows.season.cutoffHistory.map((p) => p.sr),
    [10_420, 10_460],
  );

  // A season ending inside the goal-driven floor still ends the chart: a
  // season with 5 days left does not draw a 45-day race.
  const soon = computeTrendProjection(
    input({
      doc: doc(climb),
      currentSr: 11_192,
      cutoff: { sr: 24_760, pacePerDay: 476 },
      seasonEndMs: NOW + 5 * DAY,
    }),
  ).windows.season;
  assert.ok(
    soon.goalRows.some((g) => g.status === "unreachable"),
    "the 45-day unreachable floor would otherwise apply",
  );
  assert.equal(soon.projection!.horizonDays, 5, "horizon clips to season end");
  const soonFinish = soon.callouts.find((c) => c.id === "finish-cutoff")!;
  assert.equal(soonFinish.t, NOW + 5 * DAY, "the finish lands on season end");
  assert.equal(soonFinish.sublabel, "won't catch");
  assert.equal(
    soon.callouts.find((c) => c.id === "finish-you")!.t,
    NOW + 5 * DAY,
  );
}

// --- 29. small pure helpers -----------------------------------------

{
  assert.deepEqual(bucketDailyPoints([]), []);
  assert.deepEqual(
    bucketDailyPoints([
      { t: Date.parse("2026-06-14T23:00:00.000Z"), sr: 5 },
      { t: Date.parse("2026-06-14T01:00:00.000Z"), sr: 1 },
      { t: Number.NaN, sr: 9 },
    ]),
    [{ t: Date.parse("2026-06-14T00:00:00.000Z"), sr: 5 }],
  );

  assert.equal(formatCalloutDay(Date.parse("2026-01-14T00:00:00Z"), NOW), "Jan 14");
  assert.equal(
    formatCalloutDay(Date.parse("2027-01-14T00:00:00Z"), NOW),
    "Jan 14, 2027",
  );

  assert.equal(isTrendWindowId("7d"), true);
  assert.equal(isTrendWindowId("season"), true);
  assert.equal(isTrendWindowId("14d"), false);
  assert.equal(isTrendWindowId(undefined), false);
}

// --- 24. no NaN / Infinity sweep ---------------------------------

{
  const fixtures: TrendInput[] = [
    input({ doc: doc([]) }),
    input({
      doc: doc([0, 1, 2, 3, 4, 5, 6].map((off) => wz({ dayOffset: off, net: 40 }))),
    }),
    input({
      doc: doc([0, 1, 2, 3, 4, 5, 6].map((off) => wz({ dayOffset: off, net: -40 }))),
      cutoff: { sr: null, pacePerDay: null },
    }),
    input({
      doc: doc([
        wz({ dayOffset: 1, net: 10 }),
        wz({ dayOffset: 0, net: 10 }),
      ]),
    }),
    input({
      doc: doc([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((off) => wz({ dayOffset: off, net: 12 }))),
      cutoff: { sr: 10_500, pacePerDay: 12 },
    }),
  ];

  const checkNum = (v: number, label: string) => {
    assert.ok(Number.isFinite(v), `${label} is finite (${v})`);
  };

  for (const [i, f] of fixtures.entries()) {
    const t = computeTrendProjection(f);
    for (const id of ["7d", "30d", "season"] as const) {
      const w = t.windows[id];
      for (const key of [
        "totalNet",
        "games",
        "activeDays",
        "elapsedDays",
        "srPerDay",
        "srPerActiveDay",
        "srPerGame",
      ] as const) {
        checkNum(w[key], `f${i}/${id}/${key}`);
      }
      if (w.sdDaily != null) checkNum(w.sdDaily, `f${i}/${id}/sdDaily`);
      if (w.projection) {
        checkNum(w.projection.pacePerDay, `f${i}/${id}/ray.pace`);
        checkNum(w.projection.sdDaily, `f${i}/${id}/ray.sd`);
        for (const p of w.projection.points) {
          checkNum(p.t, `f${i}/${id}/ray.t`);
          checkNum(p.projected, `f${i}/${id}/ray.projected`);
          checkNum(p.band[0], `f${i}/${id}/ray.band.low`);
          checkNum(p.band[1], `f${i}/${id}/ray.band.high`);
        }
      }
      for (const p of [...w.cutoffHistory, ...w.cutoffProjection]) {
        checkNum(p.t, `f${i}/${id}/cutoff.t`);
        checkNum(p.sr, `f${i}/${id}/cutoff.sr`);
      }
      for (const c of w.callouts) {
        checkNum(c.t, `f${i}/${id}/callout.t`);
        checkNum(c.sr, `f${i}/${id}/callout.sr`);
      }
      for (const g of [...w.goals, ...w.goalRows]) {
        checkNum(g.targetSr, `f${i}/${id}/${g.target}/targetSr`);
        checkNum(g.remaining, `f${i}/${id}/${g.target}/remaining`);
        for (const key of [
          "daysToGoal",
          "etaMs",
          "etaEarliestMs",
          "etaLatestMs",
          "groundLostPerDay",
          "bufferDays",
        ] as const) {
          const v = g[key];
          if (v != null) checkNum(v, `f${i}/${id}/${g.target}/${key}`);
        }
      }
    }
  }
}

console.log("trend-projection.test.ts ok");
