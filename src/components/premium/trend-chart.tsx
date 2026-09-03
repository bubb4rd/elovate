"use client";

import { useMemo } from "react";
import { useReducedMotion } from "motion/react";
import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  useXAxisScale,
  useYAxisScale,
  XAxis,
  YAxis,
} from "recharts";
import { formatDay, formatSr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TrendDay, TrendRay } from "@/lib/premium/trend-projection";

/**
 * The trend line: recorded WZ SR, a dashed projection ray from today at the
 * selected window's pace, and a shaded ±1σ "typical range" band. Every number
 * drawn here is also shown as text in the summary row / goal cards.
 *
 * Follows `src/components/cutoff-chart.tsx` conventions: CSS-var colors only,
 * `scale="time"` numeric x-axis, `useReducedMotion()` gating. `compact` drops
 * the axes + grid for the `/pro` showcase demo card.
 */

type ChartRow = {
  t: number;
  sr?: number;
  projected?: number;
  band?: [number, number];
};

/** A single point annotation on the projection ray (e.g. the next-tier date). */
export type TrendCallout = { t: number; sr: number; label: string };

/**
 * A leader line from the point on the projection ray to a floating label, drawn
 * inside the plot so the callout reads as attached to the trend rather than
 * sitting off to the side. Uses recharts' scale hooks so it lines up with the
 * series exactly.
 */
function TrendCalloutLayer({ callout }: { callout: TrendCallout }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;

  const x = xScale(callout.t);
  const y = yScale(callout.sr);
  if (typeof x !== "number" || typeof y !== "number") return null;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  const elbowX = x - 12;
  const elbowY = y + 16;
  const textX = elbowX - 4;

  return (
    <g style={{ pointerEvents: "none" }}>
      <path
        d={`M${x},${y} L${elbowX},${elbowY} L${textX},${elbowY}`}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1}
      />
      <circle
        cx={x}
        cy={y}
        r={3}
        fill="var(--accent)"
        stroke="var(--background)"
        strokeWidth={1.5}
      />
      <text
        x={textX}
        y={elbowY + 3.5}
        textAnchor="end"
        fill="var(--foreground)"
        stroke="var(--background)"
        strokeWidth={3}
        paintOrder="stroke"
        style={{ fontSize: 10, fontWeight: 600 }}
      >
        {callout.label}
      </text>
    </g>
  );
}

function formatDayTick(value: number): string {
  return formatDay(new Date(value).toISOString());
}

export function TrendChart({
  days,
  projection,
  goals,
  callout = null,
  compact = false,
  height,
}: {
  days: TrendDay[];
  projection: TrendRay | null;
  goals: { label: string; targetSr: number }[];
  callout?: TrendCallout | null;
  compact?: boolean;
  height?: number;
}) {
  const reduce = useReducedMotion();

  const data = useMemo<ChartRow[]>(() => {
    const actual: ChartRow[] = days.map((d) => ({ t: d.t, sr: d.endSr }));
    if (actual.length > 0 && projection) {
      const last = actual[actual.length - 1]!;
      last.projected = last.sr;
      last.band = [last.sr!, last.sr!];
    }
    const projected: ChartRow[] = projection
      ? projection.points.map((p) => ({
          t: p.t,
          projected: p.projected,
          band: p.band,
        }))
      : [];
    return [...actual, ...projected];
  }, [days, projection]);

  if (days.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center rounded-[8px] border border-border px-4 text-sm text-muted",
          compact ? "h-32" : "h-56",
        )}
        style={height ? { height } : undefined}
      >
        Log a few WZ matches to see your trend.
      </div>
    );
  }

  const resolvedHeight = height ?? (compact ? 128 : 224);

  // Keep goal lines that sit within a sensible band of the plotted values so a
  // far-off target doesn't flatten the whole series.
  const values = data.flatMap((r) =>
    [r.sr, r.projected, r.band?.[0], r.band?.[1]].filter(
      (v): v is number => typeof v === "number",
    ),
  );
  const maxValue = values.length > 0 ? Math.max(...values) : 0;
  const visibleGoals = goals.filter((g) => g.targetSr <= maxValue + 400);

  return (
    <div
      className={cn(
        "w-full",
        !compact && "rounded-[8px] border border-border p-2",
      )}
      style={{ height: resolvedHeight }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={
            compact
              ? { top: 6, right: 10, bottom: 4, left: 6 }
              : { top: 8, right: 12, bottom: 4, left: 4 }
          }
        >
          {!compact && (
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
          )}
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={formatDayTick}
            tick={compact ? false : { fill: "var(--muted)", fontSize: 11 }}
            axisLine={compact ? false : { stroke: "var(--border)" }}
            tickLine={false}
            hide={compact}
            minTickGap={28}
          />
          <YAxis
            type="number"
            tickFormatter={(value: number) => formatSr(value)}
            tick={compact ? false : { fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={compact ? 0 : 56}
            hide={compact}
            domain={["dataMin - 60", "dataMax + 60"]}
          />
          <Area
            dataKey="band"
            stroke="none"
            fill="var(--accent)"
            fillOpacity={0.12}
            isAnimationActive={!reduce}
            connectNulls
          />
          {visibleGoals.map((g) => (
            <ReferenceLine
              key={g.label}
              y={g.targetSr}
              stroke="var(--border)"
              strokeDasharray="2 4"
              label={
                compact
                  ? undefined
                  : {
                      value: g.label,
                      position: "insideTopLeft",
                      fill: "var(--muted)",
                      fontSize: 10,
                    }
              }
            />
          ))}
          <Line
            type="monotone"
            dataKey="sr"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={!reduce}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="projected"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={!reduce}
            connectNulls
          />
          {callout && <TrendCalloutLayer callout={callout} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
