"use client";

import { useId } from "react";
import { useReducedMotion } from "motion/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatChartTime, formatDay, formatDelta, formatSr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CutoffPoint } from "@/lib/data/types";

type ChartRow = CutoffPoint & { t: number };

function ChartTooltip({
  active,
  payload,
  labelName,
}: {
  active?: boolean;
  payload?: { payload: ChartRow }[];
  labelName: string;
}) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-[6px] border border-border bg-surface-elevated px-3 py-2 text-xs shadow-sm">
      <p>{formatChartTime(point.capturedAt)}</p>
      <p className="numeric mt-1 text-foreground">
        {labelName} {formatSr(point.cutoffSr)}
      </p>
      <p className="numeric text-muted">
        {point.deltaCutoff === null
          ? "first sample"
          : `${formatDelta(point.deltaCutoff)} vs prior day`}
      </p>
    </div>
  );
}

function toChartRows(series: CutoffPoint[]): ChartRow[] {
  return series.map((point) => ({
    ...point,
    t: Date.parse(point.capturedAt),
  }));
}

function seriesDelta(series: CutoffPoint[]): number | null {
  if (series.length < 2) return null;
  const first = series[0]!;
  const last = series[series.length - 1]!;
  return last.cutoffSr - first.cutoffSr;
}

function strokeForDelta(delta: number | null): string {
  if (delta === null) return "var(--muted)";
  if (delta < 0) return "var(--negative)";
  return "var(--accent)";
}

export function CutoffChart({
  series,
  height,
  showRank1 = false,
  valueLabel = "Cutoff",
  bare = false,
  object = false,
}: {
  series: CutoffPoint[];
  height?: number;
  showRank1?: boolean;
  valueLabel?: string;
  bare?: boolean;
  object?: boolean;
}) {
  const reduce = useReducedMotion();
  const duration = reduce ? 0 : 800;
  const fill = height == null;
  const data = toChartRows(series);
  const shortSeries = data.length <= 3;
  const xTicks = shortSeries ? data.map((point) => point.t) : undefined;
  const formatXTick = (value: number) => {
    const iso = new Date(value).toISOString();
    return shortSeries ? formatChartTime(iso) : formatDay(iso);
  };
  const gradientId = useId().replace(/:/g, "");
  const delta = seriesDelta(series);
  const stroke = object ? strokeForDelta(delta) : "var(--accent)";
  const showDots = object || shortSeries;

  if (series.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center px-4 text-sm text-muted",
          !bare && !object && "rounded-[6px] border border-border bg-surface",
          fill && "h-full min-h-[28rem] lg:min-h-0",
        )}
        style={height ? { height } : undefined}
      >
        No snapshot for this season yet.
      </div>
    );
  }

  const plot = (
    <div
      className={cn(
        "overflow-hidden",
        !bare && !object && "rounded-[6px] border border-border bg-background p-2",
        fill ? "min-h-0 flex-1" : undefined,
      )}
      style={height ? { height } : undefined}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={
            object
              ? { top: 12, right: 8, left: 8, bottom: 12 }
              : { top: 16, right: 12, left: 4, bottom: 8 }
          }
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={stroke}
                stopOpacity={object ? 0.42 : 0.3}
              />
              <stop
                offset="100%"
                stopColor={stroke}
                stopOpacity={object ? 0.06 : 0.04}
              />
            </linearGradient>
          </defs>
          {!object ? (
            <>
              <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 4" />
              <XAxis
                dataKey="t"
                type="number"
                domain={["dataMin", "dataMax"]}
                ticks={xTicks}
                tickFormatter={formatXTick}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
                minTickGap={28}
                scale="time"
              />
              <YAxis
                dataKey="cutoffSr"
                type="number"
                tickFormatter={(value: number) => formatSr(value)}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={64}
                domain={["dataMin - 40", "dataMax + 40"]}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="t"
                type="number"
                domain={["dataMin", "dataMax"]}
                scale="time"
                hide
              />
              <YAxis
                dataKey="cutoffSr"
                type="number"
                hide
                domain={["dataMin - 20", "dataMax + 20"]}
              />
            </>
          )}
          <Tooltip
            content={<ChartTooltip labelName={valueLabel} />}
            cursor={object ? false : { stroke: "var(--border)" }}
          />
          <Area
            type="monotone"
            dataKey="cutoffSr"
            fill={`url(#${gradientId})`}
            stroke="none"
            isAnimationActive={!reduce}
            animationDuration={duration}
          />
          {showRank1 && !object ? (
            <Line
              type="monotone"
              dataKey="rank1Sr"
              name="Rank 1"
              stroke="var(--muted)"
              strokeWidth={1}
              dot={false}
              isAnimationActive={!reduce}
              animationDuration={duration}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="cutoffSr"
            name={valueLabel}
            stroke={stroke}
            strokeWidth={object ? 3 : 2}
            dot={
              showDots
                ? { r: object ? 5 : 3.5, fill: stroke, strokeWidth: 0 }
                : false
            }
            isAnimationActive={!reduce}
            animationDuration={duration}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  if (bare || object) {
    return (
      <div className={cn("flex w-full flex-col", fill && "h-full min-h-[28rem] lg:min-h-0")}>
        {plot}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full flex-col rounded-[6px] border border-border bg-surface p-4",
        fill && "h-full min-h-[28rem] lg:min-h-0",
      )}
    >
      <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{valueLabel} chart</h3>
          <p className="mt-1 text-xs text-muted">Top 250 cutoff trajectory</p>
        </div>
        <div className="inline-flex items-center rounded-[6px] border border-border bg-surface-elevated p-1 text-xs">
          <span className="rounded-[4px] px-2 py-1 text-muted">Week</span>
          <span className="rounded-[4px] px-2 py-1 text-muted">Month</span>
          <span className="rounded-[4px] bg-background px-2 py-1 font-medium text-accent">
            Max
          </span>
        </div>
      </div>
      {plot}
    </div>
  );
}
