"use client";

import { useLayoutEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { formatSr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DIVISIONS, IRIDESCENT_SR, type RankInfo } from "@/lib/ranked";

function displayMaxSr(cutoffSr: number, currentSr: number, projectedSr: number): number {
  return Math.max(IRIDESCENT_SR + 500, cutoffSr, currentSr, projectedSr);
}

function divisionEnd(id: (typeof DIVISIONS)[number]["id"], maxSr: number): number {
  const div = DIVISIONS.find((d) => d.id === id);
  if (!div) return maxSr;
  return div.nextSr ?? maxSr;
}

function fillInRange(sr: number, start: number, end: number): number {
  if (end <= start) return sr >= start ? 1 : 0;
  if (sr <= start) return 0;
  if (sr >= end) return 1;
  return (sr - start) / (end - start);
}

function srDuration(from: number, to: number): number {
  return Math.min(0.8, 0.28 + Math.abs(to - from) / 1400);
}

function DivisionBar({
  currentFill,
  projectedFill,
  transition,
  className,
  cutoffPct,
  cutoffSr,
}: {
  currentFill: number;
  projectedFill: number;
  transition: string;
  className: string;
  cutoffPct?: number | null;
  cutoffSr?: number;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-[6px] bg-surface-elevated", className)}>
      <span
        className="absolute inset-y-0 left-0 w-full origin-left bg-accent/35"
        style={{ transform: `scaleX(${projectedFill})`, transition }}
      />
      <span
        className="absolute inset-y-0 left-0 w-full origin-left bg-accent"
        style={{ transform: `scaleX(${currentFill})`, transition }}
      />
      {cutoffPct != null ? (
        <span
          className="absolute inset-y-0 w-px bg-foreground/80"
          style={{ left: `${cutoffPct * 100}%` }}
          title={`T250 cutoff ${formatSr(cutoffSr ?? 0)}`}
        />
      ) : null}
    </div>
  );
}

export function RankTimeline({
  currentSr,
  projectedSr,
  cutoffSr,
  rank,
  fee,
  showFee = true,
  skip = false,
}: {
  currentSr: number;
  projectedSr: number;
  cutoffSr: number;
  rank: RankInfo;
  fee: number;
  showFee?: boolean;
  skip?: boolean;
}) {
  const reduce = useReducedMotion();
  const prevCurrent = useRef(currentSr);
  const prevProjected = useRef(projectedSr);
  const duration = Math.max(
    srDuration(prevCurrent.current, currentSr),
    srDuration(prevProjected.current, projectedSr),
  );

  useLayoutEffect(() => {
    prevCurrent.current = currentSr;
    prevProjected.current = projectedSr;
  }, [currentSr, projectedSr]);

  const maxSr = displayMaxSr(cutoffSr, currentSr, projectedSr);
  const feeLabel = fee <= 0 ? "Free" : `-${fee}`;
  const transition =
    skip || reduce ? "transform 0s" : `transform ${duration}s cubic-bezier(0.16, 1, 0.3, 1)`;

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-foreground">Rank timeline</h2>
        <p className="numeric text-xs text-muted">
          {showFee ? `${rank.label} · fee ${feeLabel}` : rank.label}
        </p>
      </div>

      <ol className="mt-4 space-y-3 md:hidden">
        {DIVISIONS.map((div) => {
          const start = div.minSr;
          const end = divisionEnd(div.id, maxSr);
          const isCurrent =
            rank.division === div.id || (rank.division === "top250" && div.id === "iridescent");
          return (
            <li key={div.id}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className={cn(isCurrent ? "text-accent" : "text-muted")}>{div.label}</span>
                <span className="numeric text-muted">{formatSr(start)}</span>
              </div>
              <DivisionBar
                currentFill={fillInRange(currentSr, start, end)}
                projectedFill={fillInRange(projectedSr, start, end)}
                transition={transition}
                className="mt-1 h-2"
              />
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-muted md:hidden">
        Fill is current SR. The lighter bar is projected SR after the selected result.
      </p>

      <div className="mt-4 hidden md:block">
        <div className="flex gap-1">
          {DIVISIONS.map((div) => {
            const start = div.minSr;
            const end = divisionEnd(div.id, maxSr);
            const isCurrent =
              rank.division === div.id || (rank.division === "top250" && div.id === "iridescent");
            const cutoffPct =
              div.id === "iridescent" && cutoffSr > start && cutoffSr < end
                ? fillInRange(cutoffSr, start, end)
                : null;
            return (
              <div key={div.id} className="min-w-0 flex-1">
                <DivisionBar
                  currentFill={fillInRange(currentSr, start, end)}
                  projectedFill={fillInRange(projectedSr, start, end)}
                  transition={transition}
                  className="h-3"
                  cutoffPct={cutoffPct}
                  cutoffSr={cutoffSr}
                />
                <p
                  className={cn(
                    "mt-2 truncate text-[11px]",
                    isCurrent ? "text-accent" : "text-muted",
                  )}
                >
                  {div.label}
                </p>
                <p className="numeric text-[10px] text-muted">{formatSr(start)}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">
          Fill is current SR. The lighter bar is projected SR after the selected result.
          {cutoffSr > IRIDESCENT_SR ? ` The line on Iridescent is the live T250 cutoff (${formatSr(cutoffSr)}).` : ""}
        </p>
      </div>
    </section>
  );
}
