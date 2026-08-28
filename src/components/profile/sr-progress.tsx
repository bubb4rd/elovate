import type { CSSProperties } from "react";
import { IRIDESCENT_SR, rankFromSr } from "@/lib/ranked";
import { formatSr } from "@/lib/format";
import { cn } from "@/lib/utils";

const SEGMENT_COUNT = 24;

function compactSr(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return formatSr(value);
}

function scaleName(label: string): string {
  if (label === "Iridescent") return "Iri";
  if (label === "Top 250") return "Top250";
  return label;
}

function filledSegmentCount(fill: number): number {
  if (fill <= 0) return 0;
  if (fill >= 1) return SEGMENT_COUNT;
  return Math.min(SEGMENT_COUNT, Math.max(1, Math.round(fill * SEGMENT_COUNT)));
}

function roadState(currentSr: number, cutoffSr: number | null) {
  const rank = rankFromSr(currentSr, cutoffSr);
  const cutoff =
    cutoffSr != null && cutoffSr > IRIDESCENT_SR ? cutoffSr : IRIDESCENT_SR + 10_000;

  if (rank.division === "top250") {
    return {
      goalLabel: "Top 250",
      start: IRIDESCENT_SR,
      startLabel: "Iri",
      end: rank.minSr,
      endLabel: "Top250",
      remaining: 0,
    };
  }

  if (rank.division === "iridescent") {
    return {
      goalLabel: "Top 250",
      start: IRIDESCENT_SR,
      startLabel: "Iri",
      end: cutoff,
      endLabel: "Top250",
      remaining: Math.max(0, cutoff - currentSr),
    };
  }

  const end = rank.nextDivisionSr ?? IRIDESCENT_SR;
  const next = rankFromSr(end, cutoffSr);
  return {
    goalLabel: next.divisionLabel,
    start: rank.floorSr,
    startLabel: scaleName(rank.divisionLabel),
    end,
    endLabel: scaleName(next.divisionLabel),
    remaining: Math.max(0, end - currentSr),
  };
}

function RemainingSpan({
  filledCount,
  remaining,
}: {
  filledCount: number;
  remaining: number;
}) {
  const emptyCount = SEGMENT_COUNT - filledCount;
  if (remaining <= 0 || emptyCount <= 0) return null;

  return (
    <div className="mt-1.5 flex h-6 gap-1" aria-hidden>
      {filledCount > 0 ? <span className="min-w-0" style={{ flex: filledCount }} /> : null}
      <div className="flex min-w-0 items-center" style={{ flex: emptyCount }}>
        <span className="h-3 w-px shrink-0 bg-muted" />
        <span className="h-0.5 min-w-1 flex-1 bg-muted/60" />
        <span className="numeric mx-0.5 shrink-0 whitespace-nowrap rounded-[6px] border border-border bg-surface-elevated px-1.5 py-0.5 text-[11px] tracking-normal text-muted shadow-sm">
          <span className="font-medium text-foreground">{formatSr(remaining)}</span>
          <span> SR</span>
        </span>
        <span className="h-0.5 min-w-1 flex-1 bg-muted/60" />
        <span className="h-3 w-px shrink-0 bg-muted" />
      </div>
    </div>
  );
}

export function SrProgress({
  currentSr,
  cutoffSr,
}: {
  currentSr: number;
  cutoffSr: number | null;
}) {
  const road = roadState(currentSr, cutoffSr);
  const fill =
    road.end > road.start
      ? Math.min(1, Math.max(0, (currentSr - road.start) / (road.end - road.start)))
      : 1;
  const pct = Math.round(fill * 100);
  const filledCount = filledSegmentCount(fill);
  const remaining = road.remaining;

  return (
    <div className="flex h-full flex-col justify-center gap-3 px-1 py-2" data-sr-progress>
      <h2 className="text-sm font-medium text-foreground">Road to {road.goalLabel}</h2>

      <div>
        <div
          className="flex h-10 gap-1 md:h-11"
          role="progressbar"
          aria-valuemin={road.start}
          aria-valuemax={road.end}
          aria-valuenow={currentSr}
          aria-label={
            remaining > 0
              ? `${formatSr(remaining)} SR to ${road.goalLabel}, ${pct}% from ${road.startLabel}`
              : `Reached ${road.goalLabel}`
          }
        >
          {Array.from({ length: SEGMENT_COUNT }, (_, i) => {
            const filled = i < filledCount;
            return (
              <span
                key={i}
                aria-hidden
                data-head={filled && i === filledCount - 1 ? "true" : undefined}
                className={cn(
                  "min-w-0 flex-1 rounded-[6px]",
                  filled
                    ? "sr-progress-pill-fill"
                    : "bg-foreground/[0.08] shadow-[inset_0_1px_2px_color-mix(in_oklab,var(--foreground)_14%,transparent)] ring-1 ring-foreground/12 ring-inset dark:bg-white/[0.11] dark:shadow-[inset_0_2px_3px_rgb(0_0_0/0.55)] dark:ring-white/14",
                )}
                style={
                  filled
                    ? ({
                        "--sr-seg-count": SEGMENT_COUNT,
                        "--sr-seg-pos": `${(i / (SEGMENT_COUNT - 1)) * 100}%`,
                      } as CSSProperties)
                    : undefined
                }
              />
            );
          })}
        </div>

        <RemainingSpan filledCount={filledCount} remaining={remaining} />

        <div className="mt-1 flex items-start justify-between text-[11px] text-muted">
          <p>
            <span className="numeric text-foreground">{compactSr(road.start)}</span>
            <span className="mt-0.5 block">{road.startLabel}</span>
          </p>
          <p className="text-right">
            <span className="numeric text-foreground">{compactSr(road.end)}</span>
            <span className="mt-0.5 block">{road.endLabel}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
