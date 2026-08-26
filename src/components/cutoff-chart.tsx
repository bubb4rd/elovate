"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  useCartesianScale,
} from "recharts";
import { LiveStatus, type BoardFreshnessStatus } from "@/components/live-status";
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

function RangeSelect() {
  return (
    <div className="inline-flex items-center rounded-[6px] border border-border/80 bg-background/85 p-1 text-xs shadow-sm backdrop-blur-sm">
      <span className="rounded-[4px] px-2 py-1 text-muted">Week</span>
      <span className="rounded-[4px] px-2 py-1 text-muted">Month</span>
      <span className="rounded-[4px] bg-surface-elevated px-2 py-1 font-medium text-accent">
        Max
      </span>
    </div>
  );
}

function LiveCutoffAnnotation({
  point,
  yValue,
  cutoffSr,
  nextUpdateAt,
  boardStatus,
  portalNode,
}: {
  point: ChartRow;
  yValue: number;
  cutoffSr: number;
  nextUpdateAt?: string;
  boardStatus: BoardFreshnessStatus;
  portalNode: HTMLElement | null;
}) {
  const reduce = useReducedMotion();
  const coords = useCartesianScale({ x: point.t, y: yValue });
  const fade = reduce
    ? { duration: 0 }
    : { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const };

  if (coords == null || !Number.isFinite(coords.x) || !Number.isFinite(coords.y)) {
    return null;
  }

  const labelTop = Math.max(8, coords.y - 78);
  // Right-align the float with the endpoint so it shares the chart's right edge.
  const labelLeft = coords.x;
  const lineEndY = labelTop + 56;

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
          x2={labelLeft - 28}
          y2={lineEndY}
          stroke="var(--accent)"
          strokeWidth={1.25}
          strokeOpacity={0.7}
        />
        <circle
          cx={coords.x}
          cy={coords.y}
          r={4.5}
          fill="var(--accent)"
          stroke="var(--background)"
          strokeWidth={2}
        />
      </motion.g>
      {portalNode
        ? createPortal(
            <motion.div
              className="pointer-events-none absolute z-40 -translate-x-full pr-3 text-right"
              style={{ left: labelLeft, top: labelTop }}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={fade}
            >
              <p className="numeric accent-glow text-3xl font-semibold leading-none tracking-tight text-accent">
                {formatSr(cutoffSr)}
              </p>
              <div className="pointer-events-auto mt-1.5 flex items-center justify-end gap-1.5 text-xs font-medium text-muted">
                {nextUpdateAt ? (
                  <LiveStatus nextUpdateAt={nextUpdateAt} status={boardStatus} />
                ) : null}
                <span>Cutoff</span>
              </div>
            </motion.div>,
            portalNode,
          )
        : null}
    </>
  );
}

export function CutoffChart({
  series,
  height,
  showRank1 = false,
  valueLabel = "Cutoff",
  bare = false,
  object = false,
  liveCutoffSr,
  nextUpdateAt,
  boardStatus = "live",
}: {
  series: CutoffPoint[];
  height?: number;
  showRank1?: boolean;
  valueLabel?: string;
  bare?: boolean;
  object?: boolean;
  liveCutoffSr?: number;
  nextUpdateAt?: string;
  boardStatus?: BoardFreshnessStatus;
}) {
  const reduce = useReducedMotion();
  // Match the slower front-page cutoff numeral feel (Recharts can't use springs).
  const duration = reduce ? 0 : 1500;
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
  const framed = !bare && !object;
  const showLiveCallout = framed && data.length > 0 && liveCutoffSr != null;
  const chartData =
    showLiveCallout && liveCutoffSr != null
      ? data.map((point, index) =>
          index === data.length - 1 ? { ...point, cutoffSr: liveCutoffSr } : point,
        )
      : data;
  const lastPoint = chartData.at(-1);
  const [calloutLayer, setCalloutLayer] = useState<HTMLDivElement | null>(null);
  const [calloutReady, setCalloutReady] = useState(() => !!reduce);

  useEffect(() => {
    if (reduce || duration === 0) {
      setCalloutReady(true);
      return;
    }
    setCalloutReady(false);
    const timeout = window.setTimeout(() => setCalloutReady(true), duration + 50);
    return () => window.clearTimeout(timeout);
  }, [series, liveCutoffSr, reduce, duration]);

  if (series.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center px-4 text-sm text-muted",
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
      className={cn("relative overflow-hidden", fill ? "min-h-0 flex-1" : undefined)}
      style={height ? { height } : undefined}
    >
      <div
        ref={(node) => {
          if (node !== calloutLayer) setCalloutLayer(node);
        }}
        className="pointer-events-none absolute inset-0 z-40"
      />
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={
            object
              ? { top: 12, right: 8, left: 8, bottom: 12 }
              : framed
                ? { top: showLiveCallout ? 72 : 44, right: 0, left: 0, bottom: 4 }
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
            animationEasing="ease-out"
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
              animationEasing="ease-out"
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="cutoffSr"
            name={valueLabel}
            stroke={stroke}
            strokeWidth={object ? 3 : 2}
            dot={
              showDots && !showLiveCallout
                ? { r: object ? 5 : 3.5, fill: stroke, strokeWidth: 0 }
                : false
            }
            isAnimationActive={!reduce}
            animationDuration={duration}
            animationEasing="ease-out"
            onAnimationEnd={() => setCalloutReady(true)}
          />
          {showLiveCallout && calloutReady && lastPoint && liveCutoffSr != null ? (
            <LiveCutoffAnnotation
              point={lastPoint}
              yValue={liveCutoffSr}
              cutoffSr={liveCutoffSr}
              nextUpdateAt={nextUpdateAt}
              boardStatus={boardStatus}
              portalNode={calloutLayer}
            />
          ) : null}
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
        "relative flex w-full flex-col",
        fill && "h-full min-h-[28rem] lg:min-h-0",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-start pr-1 pt-1">
        <div className="pointer-events-auto">
          <RangeSelect />
        </div>
      </div>
      {plot}
    </div>
  );
}
