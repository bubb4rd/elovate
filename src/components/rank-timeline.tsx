"use client";

import { useReducedMotion } from "motion/react";
import { formatSr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DIVISIONS, IRIDESCENT_SR, type RankInfo } from "@/lib/ranked";

const SHORT_LABEL: Record<(typeof DIVISIONS)[number]["id"], string> = {
  bronze: "Bron",
  silver: "Silv",
  gold: "Gold",
  platinum: "Plat",
  diamond: "Dia",
  crimson: "Crim",
  iridescent: "Iri",
};

type Segment = {
  id: (typeof DIVISIONS)[number]["id"];
  label: string;
  short: string;
  start: number;
  end: number;
  isCurrent: boolean;
  currentFill: number;
  projectedFill: number;
  cutoffPct: number | null;
};

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

function buildSegments(
  currentSr: number,
  projectedSr: number,
  cutoffSr: number,
  rank: RankInfo,
  maxSr: number,
): Segment[] {
  return DIVISIONS.map((div) => {
    const start = div.minSr;
    const end = divisionEnd(div.id, maxSr);
    return {
      id: div.id,
      label: div.label,
      short: SHORT_LABEL[div.id],
      start,
      end,
      isCurrent:
        rank.division === div.id || (rank.division === "top250" && div.id === "iridescent"),
      currentFill: fillInRange(currentSr, start, end),
      projectedFill: fillInRange(projectedSr, start, end),
      cutoffPct:
        div.id === "iridescent" && cutoffSr > start && cutoffSr < end
          ? fillInRange(cutoffSr, start, end)
          : null,
    };
  });
}

function DivisionBar({
  currentFill,
  projectedFill,
  transition,
  className,
  cutoffPct,
  cutoffSr,
  showNowMark = false,
}: {
  currentFill: number;
  projectedFill: number;
  transition: string;
  className: string;
  cutoffPct?: number | null;
  cutoffSr?: number;
  showNowMark?: boolean;
}) {
  const nowLeft = `${Math.min(100, Math.max(0, currentFill * 100))}%`;

  return (
    <div className={cn("relative", showNowMark && "py-0.5")}>
      <div
        className={cn(
          "relative overflow-hidden rounded-[6px] bg-foreground/[0.12] ring-1 ring-inset ring-foreground/14",
          className,
        )}
      >
        <span className="block h-full w-full" aria-hidden />
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
      {showNowMark ? (
        <span
          className="pointer-events-none absolute top-1/2 h-[18px] w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
          style={{ left: `clamp(1px, ${nowLeft}, calc(100% - 1px))`, transition }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

function TimelineKey({ showCutoff, className }: { showCutoff: boolean; className?: string }) {
  return (
    <span className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted", className)}>
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

function MobileTimeline({
  segments,
  currentSr,
  projectedSr,
  cutoffSr,
  rank,
  showCutoff,
  transition,
}: {
  segments: Segment[];
  currentSr: number;
  projectedSr: number;
  cutoffSr: number;
  rank: RankInfo;
  showCutoff: boolean;
  transition: string;
}) {
  const bandIndex = segments.findIndex((seg) => seg.isCurrent);
  const band = (bandIndex >= 0 ? segments[bandIndex] : segments[0])!;
  const nextSeg = bandIndex >= 0 ? segments[bandIndex + 1] : undefined;
  const endIsCutoff = showCutoff && band.id === "iridescent" && band.end === cutoffSr;
  const endLabel = endIsCutoff ? "T250" : formatSr(band.end);
  const remaining = Math.max(0, band.end - currentSr);
  const remainingHint = endIsCutoff
    ? "to T250"
    : nextSeg
      ? `to ${nextSeg.short}`
      : "SR";
  const filledForHint = band.currentFill;
  const summary = [
    `${rank.label}, ${formatSr(currentSr)} SR`,
    projectedSr !== currentSr ? `${formatSr(projectedSr)} after this match` : null,
    showCutoff ? `Top 250 at ${formatSr(cutoffSr)}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mt-3 md:hidden" data-rank-timeline="mobile">
      <p className="sr-only">{summary}</p>

      <div className="flex justify-between gap-1" aria-hidden>
        {segments.map((seg) => (
          <span
            key={seg.id}
            className={cn(
              "min-w-0 flex-1 text-center text-[11px] leading-none",
              seg.isCurrent ? "font-medium text-accent" : "text-muted",
            )}
          >
            {seg.short}
          </span>
        ))}
      </div>

      <div
        className="mt-2.5"
        role="progressbar"
        aria-valuemin={band.start}
        aria-valuemax={band.end}
        aria-valuenow={Math.min(band.end, Math.max(band.start, currentSr))}
        aria-label={`${band.label} SR`}
      >
        <DivisionBar
          currentFill={band.currentFill}
          projectedFill={band.projectedFill}
          transition={transition}
          className="h-4"
          cutoffPct={band.cutoffPct}
          cutoffSr={cutoffSr}
          showNowMark
        />
      </div>
      {remaining > 0 && filledForHint < 0.9 ? (
        <div className="mt-1 flex h-5" aria-hidden>
          {filledForHint > 0.06 ? (
            <span className="min-w-0" style={{ flex: filledForHint }} />
          ) : null}
          <span className="flex min-w-0 flex-1 items-center justify-center">
            <span className="numeric text-[11px] text-muted">
              <span className="font-medium text-foreground">{formatSr(remaining)}</span>{" "}
              {remainingHint}
            </span>
          </span>
        </div>
      ) : null}
      <div className="mt-1.5 flex items-baseline justify-between gap-3 text-[11px] text-muted">
        <span className="numeric">{formatSr(band.start)}</span>
        <span className={endIsCutoff ? "text-foreground/80" : "numeric"}>{endLabel}</span>
      </div>
    </div>
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
  const segments = buildSegments(currentSr, projectedSr, cutoffSr, rank, maxSr);

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-sm font-medium text-foreground">Rank timeline</h2>
          <TimelineKey showCutoff={showCutoff} className="hidden md:flex" />
        </div>
        <p className="numeric text-xs text-muted">{rank.label}</p>
      </div>
      <TimelineKey showCutoff={showCutoff} className="mt-1 md:hidden" />

      <MobileTimeline
        segments={segments}
        currentSr={currentSr}
        projectedSr={projectedSr}
        cutoffSr={cutoffSr}
        rank={rank}
        showCutoff={showCutoff}
        transition={transition}
      />

      <div className="mt-4 hidden md:block">
        <div className="flex gap-1">
          {segments.map((seg) => (
            <div key={seg.id} className="min-w-0 flex-1">
              <DivisionBar
                currentFill={seg.currentFill}
                projectedFill={seg.projectedFill}
                transition={transition}
                className="h-3"
                cutoffPct={seg.cutoffPct}
                cutoffSr={cutoffSr}
              />
              <p
                className={cn(
                  "mt-2 truncate text-[11px]",
                  seg.isCurrent ? "text-accent" : "text-muted",
                )}
              >
                {seg.label}
              </p>
              <p className="numeric text-[10px] text-muted">{formatSr(seg.start)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
