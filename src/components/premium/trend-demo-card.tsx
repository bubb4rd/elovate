import {
  HISTORY_VERSION,
  type HistoryDocument,
  type WzHistoryMatch,
} from "@/lib/history";
import { nowMs } from "@/lib/premium/clock";
import { computeTrendProjection } from "@/lib/premium/trend-projection";
import { ProFeatureCard } from "./pro-feature-showcase";
import { TrendChart } from "./trend-chart";

/**
 * `/pro` showcase demo card for PREM-03 — trend & goal projection.
 *
 * Deterministic, committed sample data — NOT the viewer's matches, no live or
 * Supabase read. Renders identically for signed-out visitors and never fails on
 * a dead API. Only `Date.now()` (safe: `/pro` is already dynamic) is used, to
 * anchor the sample so the projected date reads as near-future.
 */

const SAMPLE_START_SR = 8100;
const SAMPLE_CUTOFF_SR = 10_800;
const SAMPLE_CUTOFF_PACE = 42;

/** [days ago, hour UTC, net SR] — ~20 games across ~14 days, net-positive drift. */
const DEMO_GAMES: [number, number, number][] = [
  [13, 20, 55],
  [13, 21, -30],
  [12, 19, 70],
  [12, 20, 40],
  [11, 21, -20],
  [10, 18, 65],
  [10, 19, 35],
  [10, 20, 50],
  [9, 20, -45],
  [8, 19, 60],
  [8, 21, 25],
  [7, 20, 40],
  [6, 19, -15],
  [6, 20, 55],
  [5, 21, 70],
  [4, 19, 30],
  [4, 20, -25],
  [3, 20, 60],
  [2, 19, 45],
  [2, 21, 35],
  [1, 20, 50],
  [0, 19, 40],
];

function buildDemoDoc(now: number): { doc: HistoryDocument; currentSr: number } {
  const dayMs = 86_400_000;
  let sr = SAMPLE_START_SR;
  const matches: WzHistoryMatch[] = DEMO_GAMES.map(
    ([daysAgo, hour, net], index) => {
      const base = new Date(now - daysAgo * dayMs);
      base.setUTCHours(hour, 0, 0, 0);
      const srBefore = sr;
      sr += net;
      return {
        id: `demo-${index}`,
        sessionId: `demo-s${daysAgo}`,
        createdAt: base.toISOString(),
        srBefore,
        srAfter: sr,
        net,
        mode: "wz",
        placement: net > 0 ? "top4" : "top10",
        squadElims: 0,
        yourElims: 0,
        fee: 75,
        placementSr: 30,
        elimSr: 12,
        capped: false,
        teammates: [],
      } satisfies WzHistoryMatch;
    },
  );
  return {
    doc: { version: HISTORY_VERSION, sessions: [], matches },
    currentSr: sr,
  };
}

export function TrendProjectionDemoCard() {
  const now = nowMs();
  const { doc, currentSr } = buildDemoDoc(now);

  const projection = computeTrendProjection({
    doc,
    now,
    currentSr,
    cutoff: { sr: SAMPLE_CUTOFF_SR, pacePerDay: SAMPLE_CUTOFF_PACE },
    savedGoals: ["iridescent"],
  });

  const trendWindow = projection.windows["30d"];
  const goals = trendWindow.goals.map((g) => ({
    label: g.label,
    targetSr: g.targetSr,
  }));

  return (
    <ProFeatureCard
      title="Trend & goal projection"
      blurb="Your SR pace, projected forward to a hit date for every goal."
    >
      <TrendChart
        days={trendWindow.days}
        projection={trendWindow.projection}
        goals={goals}
        compact
      />
      {projection.insight && (
        <p className="text-xs text-foreground">{projection.insight}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {trendWindow.goals
          .filter((g) => g.status === "projected" && g.etaMs != null)
          .slice(0, 1)
          .map((g) => (
            <span
              key={g.target}
              className="numeric rounded-[4px] bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent"
            >
              {g.label}{" "}
              {new Intl.DateTimeFormat("en-US", {
                timeZone: "UTC",
                month: "short",
                day: "numeric",
              }).format(new Date(g.etaMs!))}
            </span>
          ))}
      </div>
    </ProFeatureCard>
  );
}
