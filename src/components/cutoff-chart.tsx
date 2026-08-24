"use client";

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
import { formatDay, formatDelta, formatSr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CutoffPoint } from "@/lib/data/types";

function ChartTooltip({
  active,
  payload,
  labelName,
}: {
  active?: boolean;
  payload?: { payload: CutoffPoint }[];
  labelName: string;
}) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-[6px] border border-border bg-surface-elevated px-3 py-2 text-xs shadow-sm">
      <p>{formatDay(point.capturedAt)}</p>
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

export function CutoffChart({
  series,
  height,
  showRank1 = false,
  valueLabel = "Cutoff",
}: {
  series: CutoffPoint[];
  height?: number;
  showRank1?: boolean;
  valueLabel?: string;
}) {
  const reduce = useReducedMotion();
  const duration = reduce ? 0 : 800;
  const fill = height == null;

  if (series.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center rounded-[6px] border border-border bg-surface px-4 text-sm text-muted",
          fill && "h-full min-h-[28rem] lg:min-h-0",
        )}
        style={height ? { height } : undefined}
      >
        No snapshot for this season yet.
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
      <div
        className={cn(
          "overflow-hidden rounded-[6px] border border-border bg-background p-2",
          fill ? "min-h-0 flex-1" : undefined,
        )}
        style={height ? { height } : undefined}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 16, right: 10, left: 6, bottom: 8 }}>
            <defs>
              <linearGradient id="cutoffFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
          <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 4" />
          <XAxis
            dataKey="capturedAt"
            tickFormatter={formatDay}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tickFormatter={(v: number) => formatSr(v)}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={56}
            domain={["dataMin - 40", "dataMax + 40"]}
          />
          <Tooltip
            content={<ChartTooltip labelName={valueLabel} />}
            cursor={{ stroke: "var(--border)" }}
          />
          <Area
            type="monotone"
            dataKey="cutoffSr"
            fill="url(#cutoffFill)"
            stroke="none"
            isAnimationActive={!reduce}
            animationDuration={duration}
          />
          {showRank1 ? (
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
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={!reduce}
            animationDuration={duration}
          />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
