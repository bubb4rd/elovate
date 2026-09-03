import {
  HISTORY_VERSION,
  type HistoryDocument,
  type WzHistoryMatch,
} from "@/lib/history";
import { formatDay } from "@/lib/format";
import { nowMs } from "@/lib/premium/clock";
import { computeTrendProjection } from "@/lib/premium/trend-projection";
import { ProObjectCard } from "./pro-feature-card";
import { TrendTeaserChart } from "./trend-teaser-chart";

/**
 * `/pro` showcase teaser for PREM-03 — trend & goal projection.
 *
 * One sentence: "At {rate} SR/day, {goal} on {date}." The chart proves it —
 * observed pace, extended, crossing one goal, with the date on the crossing.
 *
 * Deterministic committed sample data — NOT the viewer's matches, no live or
 * Supabase read. `Date.now()` (safe: `/pro` is already dynamic) only anchors the
 * sample so the projected date reads as a nearby calendar date.
 */

const SAMPLE_START_SR = 8100;
const SAMPLE_CUTOFF_SR = 10_800;
const SAMPLE_CUTOFF_PACE = 42;

/** [days ago, hour UTC, net SR] — ~22 games over ~14 days, an organic climb. */
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

export function TrendProjectionDemoCard({ index }: { index?: number }) {
  const now = nowMs();
  const { doc, currentSr } = buildDemoDoc(now);

  const projection = computeTrendProjection({
    doc,
    now,
    currentSr,
    cutoff: { sr: SAMPLE_CUTOFF_SR, pacePerDay: SAMPLE_CUTOFF_PACE },
    savedGoals: ["iridescent"],
  });

  const window = projection.windows["30d"];
  const slope = window.srPerDay;
  const rate = Math.round(slope);

  // One goal: the nearest one the pace actually reaches.
  const goal =
    window.goals.find(
      (g) => g.target === "nextTier" && g.status === "projected" && g.etaMs != null,
    ) ?? window.goals.find((g) => g.status === "projected" && g.etaMs != null);

  if (!goal || goal.etaMs == null) return null;

  const dateLabel = formatDay(new Date(goal.etaMs).toISOString());
  const headline = `${goal.label} on ${dateLabel}`;
  const insight = `At ${rate > 0 ? "+" : ""}${rate} SR/day, ${goal.label} on ${dateLabel}.`;

  return (
    <ProObjectCard index={index}>
      <div className="px-4 pt-4">
        <p className="text-sm font-medium text-muted">
          Trend &amp; goal projection
          <span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted/70">
            preview
          </span>
        </p>
        <p className="mt-2 text-lg font-semibold leading-tight tracking-tight text-foreground">
          {headline}
        </p>
        <p className="mt-1.5 text-xs text-muted">
          Your last-30-day pace, drawn to the goal.
        </p>
        <p className="numeric mt-3 text-sm font-semibold text-accent">
          {rate > 0 ? "+" : ""}
          {rate} SR/day
          <span className="ml-2 font-sans text-xs font-medium text-muted">
            last 30 days
          </span>
        </p>
      </div>

      <TrendTeaserChart
        history={window.days}
        now={now}
        currentSr={currentSr}
        slopePerDay={slope}
        goal={{
          label: goal.label,
          sr: goal.targetSr,
          hitMs: goal.etaMs,
          dateLabel,
        }}
        height={200}
      />

      <p className="px-4 pb-4 pt-2 text-xs text-muted">
        <span className="sr-only">Preview data. </span>
        {insight}
      </p>
    </ProObjectCard>
  );
}
