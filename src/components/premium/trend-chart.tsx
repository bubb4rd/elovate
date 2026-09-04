"use client";

import { useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  useCartesianScale,
} from "recharts";
import { formatDay, formatDelta, formatSr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  TrendCallout,
  TrendPoint,
  TrendRay,
} from "@/lib/premium/trend-projection";

/**
 * The PREM-03 trend chart: the player's SR (solid, then dashed projection with
 * a typical-range band) drawn against the live T250 cutoff (muted, solid then
 * dashed) so the picture agrees with the hero insight. When the cutoff climbs
 * faster than the player, the dash visibly never crosses it and the only label
 * at the far edge is the muted "won't catch".
 *
 * Borrows `src/components/cutoff-chart.tsx` techniques: CSS-var colors only,
 * `scale="time"` numeric x-axis, `useCartesianScale` + a `createPortal`
 * annotation layer for callouts, `useReducedMotion()` gating. Goal names are
 * never planted on the line - callouts carry dates.
 */

export type TrendGoalLine = { key: string; sr: number; label: string };

type ChartRow = {
  t: number;
  you?: number;
  youProjected?: number;
  band?: [number, number];
  cutoff?: number;
  cutoffProjected?: number;
  youDelta?: number;
};

const DRAW_MS = 900;

function formatDayTick(value: number): string {
  return formatDay(new Date(value).toISOString());
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartRow }[];
}) {
  if (!active || !payload?.[0]) return null;
  const row = payload[0].payload;
  const you = row.you ?? row.youProjected;
  const cutoff = row.cutoff ?? row.cutoffProjected;
  const projected = row.you == null && row.youProjected != null;

  return (
    <div className="rounded-[6px] border border-border bg-surface-elevated px-3 py-2 shadow-sm">
      <p className="numeric text-[11px] leading-none tracking-wide text-foreground/75">
        {formatDayTick(row.t)}
        {projected ? (
          <span className="ml-1.5 font-sans text-muted">projected</span>
        ) : null}
      </p>
      {you != null ? (
        <p className="numeric mt-1.5 flex items-baseline gap-1.5 text-sm leading-none">
          <span className="text-accent">{formatSr(Math.round(you))}</span>
          <span className="font-sans text-[11px] text-muted">you</span>
          {row.youDelta != null && row.youDelta !== 0 ? (
            <span
              className={cn(
                "text-[11px]",
                row.youDelta > 0 ? "text-accent" : "text-negative",
              )}
            >
              {formatDelta(Math.round(row.youDelta))}
            </span>
          ) : null}
        </p>
      ) : null}
      {cutoff != null ? (
        <p className="numeric mt-1 flex items-baseline gap-1.5 text-sm leading-none text-foreground/70">
          <span>{formatSr(Math.round(cutoff))}</span>
          <span className="font-sans text-[11px] text-muted">cutoff</span>
        </p>
      ) : null}
    </div>
  );
}

function CalloutMark({
  callout,
  portalNode,
  reduce,
}: {
  callout: TrendCallout;
  portalNode: HTMLElement | null;
  reduce: boolean;
}) {
  const coords = useCartesianScale({ x: callout.t, y: callout.sr });
  // Lines and band draw first, then the callouts fade in over the finished
  // frame. Reduced motion jumps straight to that final frame.
  const fade = reduce
    ? { duration: 0 }
    : {
        duration: 0.45,
        delay: DRAW_MS / 1000,
        ease: [0.16, 1, 0.3, 1] as const,
      };

  if (coords == null || !Number.isFinite(coords.x) || !Number.isFinite(coords.y)) {
    return null;
  }

  // A value mark reads an SR off a series: `now`/`cutoff` at today, `finish` at
  // the end of that same series' projection. A series' start and end marks get
  // identical treatment - same size, same colour, same leader, same lift - so
  // "11,192 -> 12,213" and "24,760 -> 27,521" read as two pairs. Only `hit`
  // (a date on a crossing) is a smaller, different thing.
  const isValueMark = callout.kind !== "hit";
  const accent = callout.tone === "accent";
  const stroke = accent ? "var(--accent)" : "var(--muted)";
  const lift = isValueMark ? (accent ? 74 : 62) : 44;
  const labelTop = Math.max(4, coords.y - lift);
  const anchorRight = callout.kind !== "hit";

  return (
    <>
      <motion.g
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={fade}
      >
        <line
          x1={coords.x}
          y1={coords.y}
          x2={anchorRight ? coords.x - 20 : coords.x + 20}
          y2={labelTop + (isValueMark ? 44 : 22)}
          stroke={stroke}
          strokeWidth={1.25}
          strokeOpacity={0.7}
        />
        <circle
          cx={coords.x}
          cy={coords.y}
          r={isValueMark && accent ? 4.5 : 3.5}
          fill={stroke}
          stroke="var(--background)"
          strokeWidth={2}
        />
      </motion.g>
      {portalNode
        ? createPortal(
            <motion.div
              className={cn(
                "pointer-events-none absolute",
                anchorRight ? "pr-3 text-right" : "pl-3 text-left",
              )}
              style={
                anchorRight
                  ? { top: labelTop, right: `calc(100% - ${coords.x}px)` }
                  : { top: labelTop, left: coords.x }
              }
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={fade}
            >
              <p
                className={cn(
                  "numeric font-semibold leading-none tracking-tight",
                  !isValueMark ? "text-sm" : accent ? "text-2xl" : "text-lg",
                  accent ? "text-accent" : "text-muted",
                )}
                style={
                  accent && isValueMark
                    ? {
                        textShadow:
                          "0 0 12px color-mix(in oklab, var(--accent) 35%, transparent)",
                      }
                    : undefined
                }
              >
                {callout.label}
              </p>
              {callout.sublabel ? (
                <p className="mt-1 text-[11px] font-medium text-muted">
                  {callout.sublabel}
                </p>
              ) : null}
            </motion.div>,
            portalNode,
          )
        : null}
    </>
  );
}

export function TrendChart({
  history,
  projection,
  cutoffHistory,
  cutoffProjection,
  goalLines,
  callouts,
  className,
}: {
  history: TrendPoint[];
  projection: TrendRay | null;
  cutoffHistory: TrendPoint[];
  cutoffProjection: TrendPoint[];
  goalLines: TrendGoalLine[];
  callouts: TrendCallout[];
  className?: string;
}) {
  const reduce = useReducedMotion();
  const gradientId = useId().replace(/:/g, "");
  const [calloutLayer, setCalloutLayer] = useState<HTMLDivElement | null>(null);

  const data = useMemo<ChartRow[]>(() => {
    const rows = new Map<number, ChartRow>();
    const at = (t: number): ChartRow => {
      const existing = rows.get(t);
      if (existing) return existing;
      const created: ChartRow = { t };
      rows.set(t, created);
      return created;
    };

    for (const point of history) at(point.t).you = point.sr;
    for (const point of cutoffHistory) at(point.t).cutoff = point.sr;

    // Join the dashed ray to the solid line so there is no visual break.
    const lastYou = history[history.length - 1];
    if (lastYou && projection) {
      const row = at(lastYou.t);
      row.youProjected = lastYou.sr;
      row.band = [lastYou.sr, lastYou.sr];
    }
    if (projection) {
      for (const point of projection.points) {
        const row = at(point.t);
        row.youProjected = point.projected;
        row.band = point.band;
      }
    }

    const lastCutoff = cutoffHistory[cutoffHistory.length - 1];
    if (lastCutoff && cutoffProjection.length > 0) {
      at(lastCutoff.t).cutoffProjected = lastCutoff.sr;
    }
    for (const point of cutoffProjection) at(point.t).cutoffProjected = point.sr;

    const sorted = [...rows.values()].sort((a, b) => a.t - b.t);
    let previous: number | null = null;
    for (const row of sorted) {
      const value = row.you ?? row.youProjected;
      if (value == null) continue;
      if (previous != null) row.youDelta = value - previous;
      previous = value;
    }
    return sorted;
  }, [history, projection, cutoffHistory, cutoffProjection]);

  const domain = useMemo<[number, number]>(() => {
    const values: number[] = [];
    for (const row of data) {
      for (const value of [
        row.you,
        row.youProjected,
        row.cutoff,
        row.cutoffProjected,
        row.band?.[0],
        row.band?.[1],
      ]) {
        if (typeof value === "number" && Number.isFinite(value)) values.push(value);
      }
    }
    for (const line of goalLines) values.push(line.sr);
    if (values.length === 0) return [0, 100];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max(80, (max - min) * 0.1);
    return [Math.max(0, min - pad), max + pad];
  }, [data, goalLines]);

  if (history.length === 0) {
    return (
      <div
        className={cn(
          "flex h-60 items-center rounded-[8px] border border-border px-4 text-sm text-muted md:h-[420px]",
          className,
        )}
      >
        Log more matches in this window to project a pace.
      </div>
    );
  }

  return (
    <div className={cn("relative h-60 w-full md:h-[420px]", className)}>
      <div
        ref={(node) => {
          if (node !== calloutLayer) setCalloutLayer(node);
        }}
        className="pointer-events-none absolute inset-0 isolate"
      />
      <ResponsiveContainer width="100%" height="100%">
        {/* `right` has to clear half of the final x tick label, or the last
            date on the axis is chopped by the container edge. The `finish`
            labels are right-anchored on their endpoint, so they need no
            gutter of their own. */}
        <ComposedChart data={data} margin={{ top: 72, right: 40, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="3 4"
            vertical={false}
          />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={formatDayTick}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            minTickGap={32}
          />
          <YAxis
            type="number"
            domain={domain}
            tickFormatter={(value: number) => formatSr(Math.round(value))}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "var(--border)" }}
            isAnimationActive={false}
            wrapperStyle={{
              background: "transparent",
              border: "none",
              outline: "none",
              boxShadow: "none",
            }}
          />

          {goalLines.map((line) => (
            <ReferenceLine
              key={line.key}
              y={line.sr}
              stroke="var(--border)"
              strokeDasharray="2 4"
              label={{
                value: line.label,
                position: "insideTopRight",
                fill: "var(--muted)",
                fontSize: 10,
              }}
            />
          ))}

          {/* Typical range: forecast only, never around observed history. */}
          <Area
            dataKey="band"
            stroke="none"
            fill="color-mix(in oklab, var(--accent) 18%, transparent)"
            isAnimationActive={!reduce}
            animationDuration={DRAW_MS}
            connectNulls
            legendType="none"
          />

          <Area
            type="monotone"
            dataKey="you"
            stroke="none"
            fill={`url(#${gradientId})`}
            isAnimationActive={!reduce}
            animationDuration={DRAW_MS}
            connectNulls
            legendType="none"
          />

          {/* Cutoff: solid observed, dashed projected. Muted so the player's
              own line stays the subject even while it is losing the race. */}
          <Line
            type="monotone"
            dataKey="cutoff"
            name="Cutoff"
            stroke="var(--foreground)"
            strokeOpacity={0.45}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={!reduce}
            animationDuration={DRAW_MS}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="cutoffProjected"
            name="Cutoff (projected)"
            stroke="var(--foreground)"
            strokeOpacity={0.45}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={!reduce}
            animationDuration={DRAW_MS}
            connectNulls
          />

          <Line
            type="monotone"
            dataKey="you"
            name="You"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={!reduce}
            animationDuration={DRAW_MS}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="youProjected"
            name="You (projected)"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={!reduce}
            animationDuration={DRAW_MS}
            connectNulls
          />

          {callouts.map((callout) => (
            <CalloutMark
              key={callout.id}
              callout={callout}
              portalNode={calloutLayer}
              reduce={!!reduce}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
