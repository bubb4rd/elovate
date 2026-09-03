"use client";

import { useId, useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendDay } from "@/lib/premium/trend-projection";
import { ChartHitAnnotation } from "./chart-hit-annotation";

/**
 * The Trend teaser chart: solid observed SR with the home cutoff chart's
 * gradient fill, a dashed extension of the last-30-day pace, one muted goal
 * rule, and a hit callout on the crossing (projection x goal) — retargeted from
 * `LiveCutoffAnnotation` in `src/components/cutoff-chart.tsx`.
 *
 * One trend, one rate, one goal, one date. The full `/pro/trend` chart
 * (`trend-chart.tsx`) is the dense version; this stays a single-idea object.
 */

const DAY_MS = 86_400_000;

export type TrendTeaserGoal = {
  /** e.g. "Next tier" — labels the goal rule. */
  label: string;
  /** Target SR; the horizontal rule sits here. */
  sr: number;
  /** When the pace line crosses `sr`. Drives the callout. */
  hitMs: number;
  /** Same date string as the headline, e.g. "Sep 11". */
  dateLabel: string;
};

type Row = { t: number; observed?: number; projected?: number };

function buildRows(
  history: TrendDay[],
  now: number,
  currentSr: number,
  slopePerDay: number,
  goal: TrendTeaserGoal,
): Row[] {
  const observed: Row[] = history.map((d) => ({ t: d.t, observed: d.endSr }));

  // Bridge: the last observed point also seeds `projected` so the dashed line
  // starts exactly where the solid one ends.
  if (observed.length > 0) {
    const last = observed[observed.length - 1]!;
    observed[observed.length - 1] = { ...last, projected: last.observed };
  }

  const endT = goal.hitMs + Math.max(DAY_MS, (goal.hitMs - now) * 0.28);
  const steps = 12;
  const projected: Row[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = now + ((endT - now) * i) / steps;
    projected.push({ t, projected: currentSr + slopePerDay * ((t - now) / DAY_MS) });
  }

  return [...observed, ...projected];
}

export function TrendTeaserChart({
  history,
  now,
  currentSr,
  slopePerDay,
  goal,
  height = 200,
}: {
  history: TrendDay[];
  now: number;
  currentSr: number;
  /** Exact SR/day used for the projection geometry (display rate is rounded). */
  slopePerDay: number;
  goal: TrendTeaserGoal;
  height?: number;
}) {
  const reduce = useReducedMotion();
  const gradientId = useId().replace(/:/g, "");
  const drawMs = reduce ? 0 : 1200;
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);

  const rows = useMemo(
    () => buildRows(history, now, currentSr, slopePerDay, goal),
    [history, now, currentSr, slopePerDay, goal],
  );

  const yValues = rows.flatMap((r) =>
    [r.observed, r.projected].filter((v): v is number => typeof v === "number"),
  );
  yValues.push(goal.sr);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const yPad = Math.max(30, (yMax - yMin) * 0.12);

  return (
    <div
      className="relative w-full"
      style={{ height }}
      role="img"
      aria-label={`${goal.label} projected ${goal.dateLabel} at ${
        slopePerDay > 0 ? "+" : ""
      }${Math.round(slopePerDay)} SR per day`}
    >
      <div
        ref={(node) => {
          if (node !== portal) setPortal(node);
        }}
        className="pointer-events-none absolute inset-0 isolate"
      />
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 12, right: 10, left: 10, bottom: 6 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.42} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            hide
          />
          <YAxis type="number" hide domain={[yMin - yPad, yMax + yPad]} />
          <ReferenceLine
            y={goal.sr}
            stroke="var(--muted)"
            strokeDasharray="4 4"
            strokeOpacity={0.55}
            label={{
              value: goal.label,
              position: "insideTopRight",
              fill: "var(--muted)",
              fontSize: 10,
              offset: 6,
            }}
          />
          <Area
            type="natural"
            dataKey="observed"
            stroke="var(--accent)"
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={false}
            connectNulls={false}
            isAnimationActive={!reduce}
            animationDuration={drawMs}
            animationEasing="ease-out"
          />
          <Area
            type="linear"
            dataKey="projected"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeDasharray="5 5"
            fill="none"
            dot={false}
            connectNulls
            isAnimationActive={!reduce}
            animationBegin={reduce ? 0 : Math.round(drawMs * 0.55)}
            animationDuration={reduce ? 0 : Math.round(drawMs * 0.7)}
            animationEasing="ease-out"
          />
          <ChartHitAnnotation
            x={goal.hitMs}
            y={goal.sr}
            label={goal.dateLabel}
            portalNode={portal}
            delay={reduce ? 0 : (drawMs * 1.1) / 1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
