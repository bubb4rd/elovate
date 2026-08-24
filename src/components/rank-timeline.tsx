"use client";

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

function TimelineKey({ showCutoff }: { showCutoff: boolean }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-1.5 w-3 rounded-[2px] bg-accent" aria-hidden />
        Now
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-1.5 w-3 rounded-[2px] bg-accent/35" aria-hidden />
        After
      </span>
      {showCutoff ? (
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-px bg-foreground/70" aria-hidden />
          T250
        </span>
      ) : null}
    </span>
  );
}

export function RankTimeline({
  currentSr,
  projectedSr,
  cutoffSr,
  rank,
  skip = false,
}: {
  currentSr: number;
  projectedSr: number;
  cutoffSr: number;
  rank: RankInfo;
  skip?: boolean;
}) {
  const reduce = useReducedMotion();
  const maxSr = displayMaxSr(cutoffSr, currentSr, projectedSr);
  const showCutoff = cutoffSr > IRIDESCENT_SR;
  const transition =
    skip || reduce
      ? "transform 0s"
      : "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)";

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-sm font-medium text-foreground">Rank timeline</h2>
          <TimelineKey showCutoff={showCutoff} />
        </div>
        <p className="numeric text-xs text-muted">{rank.label}</p>
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
      </div>
    </section>
  );
}
