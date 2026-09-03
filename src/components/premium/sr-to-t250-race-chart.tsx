"use client";

import { useId, useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  Area,
  ComposedChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { ChartHitAnnotation } from "./chart-hit-annotation";

/**
 * PREM-11 teaser chart: a race between your SR and the live cutoff. Two series
 * (solid + dashed projection each), a hit callout on the crossing — same object
 * language as the home cutoff chart and the Trend teaser. Not a gauge.
 */

const DAY_MS = 86_400_000;

export type RacePoint = { t: number; sr: number };

type Row = {
  t: number;
  youObs?: number;
  youProj?: number;
  cutObs?: number;
  cutProj?: number;
};

function buildRows(
  you: RacePoint[],
  cutoff: RacePoint[],
  now: number,
  yourRate: number,
  cutoffRate: number,
  crossMs: number,
): Row[] {
  const rows: Row[] = you.map((p, i) => ({
    t: p.t,
    youObs: p.sr,
    cutObs: cutoff[i]?.sr,
  }));

  const last = rows[rows.length - 1];
  const youNow = you[you.length - 1]?.sr ?? 0;
  const cutNow = cutoff[cutoff.length - 1]?.sr ?? 0;
  if (last) {
    last.youProj = last.youObs;
    last.cutProj = last.cutObs;
  }

  const endT = crossMs + Math.max(DAY_MS, (crossMs - now) * 0.25);
  const steps = 14;
  for (let i = 1; i <= steps; i += 1) {
    const t = now + ((endT - now) * i) / steps;
    const days = (t - now) / DAY_MS;
    rows.push({
      t,
      youProj: youNow + yourRate * days,
      cutProj: cutNow + cutoffRate * days,
    });
  }

  return rows;
}

export function SrToT250RaceChart({
  you,
  cutoff,
  now,
  yourRatePerDay,
  cutoffRatePerDay,
  crossMs,
  crossSr,
  calloutLabel,
  willCatch,
  a11yLabel,
  height = 200,
}: {
  you: RacePoint[];
  cutoff: RacePoint[];
  now: number;
  yourRatePerDay: number;
  cutoffRatePerDay: number;
  crossMs: number;
  crossSr: number;
  calloutLabel: string;
  willCatch: boolean;
  a11yLabel: string;
  height?: number;
}) {
  const reduce = useReducedMotion();
  const gradientId = useId().replace(/:/g, "");
  const drawMs = reduce ? 0 : 1200;
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);

  const rows = useMemo(
    () => buildRows(you, cutoff, now, yourRatePerDay, cutoffRatePerDay, crossMs),
    [you, cutoff, now, yourRatePerDay, cutoffRatePerDay, crossMs],
  );

  const yValues = rows.flatMap((r) =>
    [r.youObs, r.youProj, r.cutObs, r.cutProj].filter(
      (v): v is number => typeof v === "number",
    ),
  );
  yValues.push(crossSr);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const yPad = Math.max(30, (yMax - yMin) * 0.12);

  return (
    <div
      className="relative w-full"
      style={{ height }}
      role="img"
      aria-label={a11yLabel}
    >
      <div
        ref={(node) => {
          if (node !== portal) setPortal(node);
        }}
        className="pointer-events-none absolute inset-0 isolate"
      />
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 12, right: 10, left: 10, bottom: 6 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.05} />
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

          <Line
            type="natural"
            dataKey="cutObs"
            stroke="var(--muted)"
            strokeWidth={1.75}
            dot={false}
            connectNulls={false}
            isAnimationActive={!reduce}
            animationDuration={drawMs}
            animationEasing="ease-out"
          />
          <Line
            type="linear"
            dataKey="cutProj"
            stroke="var(--muted)"
            strokeWidth={1.75}
            strokeDasharray="5 5"
            dot={false}
            connectNulls
            isAnimationActive={!reduce}
            animationBegin={reduce ? 0 : Math.round(drawMs * 0.55)}
            animationDuration={reduce ? 0 : Math.round(drawMs * 0.7)}
            animationEasing="ease-out"
          />
          <Area
            type="natural"
            dataKey="youObs"
            stroke="var(--accent)"
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={false}
            connectNulls={false}
            isAnimationActive={!reduce}
            animationDuration={drawMs}
            animationEasing="ease-out"
          />
          <Line
            type="linear"
            dataKey="youProj"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            connectNulls
            isAnimationActive={!reduce}
            animationBegin={reduce ? 0 : Math.round(drawMs * 0.55)}
            animationDuration={reduce ? 0 : Math.round(drawMs * 0.7)}
            animationEasing="ease-out"
          />

          <ChartHitAnnotation
            x={crossMs}
            y={crossSr}
            label={calloutLabel}
            tone={willCatch ? "accent" : "muted"}
            portalNode={portal}
            delay={reduce ? 0 : (drawMs * 1.1) / 1000}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
