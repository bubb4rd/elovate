"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { formatDelta, formatSr } from "@/lib/format";
import {
  formatCalloutDay,
  isTrendWindowId,
  TREND_WINDOWS,
  type GoalProjection,
  type TrendProjection,
  type TrendWindow,
  type TrendWindowId,
} from "@/lib/premium/trend-projection";
import { cn } from "@/lib/utils";
import { TrendChart, type TrendGoalLine } from "./trend-chart";

/**
 * PREM-03 product page body: hero insight, pace window, chart, metrics, goals.
 *
 * One insight, one place - the headline. Goal rows carry dates, never a restated
 * alert. The window control is the *pace sample*; it is wired to `?w=` so the
 * URL survives tab switches and shares.
 */

function round(value: number): number {
  return Math.round(value);
}

function paceTone(value: number): string {
  if (value > 0) return "text-accent";
  if (value < 0) return "text-negative";
  return "text-foreground";
}

const HERO_TONE: Record<"accent" | "negative" | "muted", string> = {
  accent: "text-foreground",
  negative: "text-negative",
  muted: "text-muted",
};

function WindowToggle({
  active,
  onChange,
}: {
  active: TrendWindowId;
  onChange: (id: TrendWindowId) => void;
}) {
  const reduce = useReducedMotion();
  return (
    <div
      role="group"
      aria-label="Pace window"
      className="inline-flex w-max items-center gap-1 rounded-[8px] border border-border bg-surface p-1"
    >
      {TREND_WINDOWS.map((w) => {
        const isActive = active === w.id;
        return (
          <button
            key={w.id}
            type="button"
            onClick={() => onChange(w.id)}
            aria-pressed={isActive}
            className={cn(
              "relative rounded-[6px] px-3 py-1.5 text-xs font-medium tracking-wide transition-colors",
              isActive ? "text-foreground" : "text-muted hover:text-foreground",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="trend-window-pill"
                className="absolute inset-0 rounded-[6px] bg-surface-elevated"
                transition={
                  reduce
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 420, damping: 34 }
                }
              />
            )}
            <span className="relative z-10">{w.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-[0.12em] text-muted">
        {label}
      </dt>
      <dd
        className={cn(
          "numeric mt-1.5 text-xl leading-none",
          tone ?? "text-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function MetricsRow({ win }: { win: TrendWindow }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-4 sm:grid-cols-3 lg:flex lg:flex-wrap lg:gap-x-14">
      <Metric
        label="SR / day"
        value={formatDelta(round(win.srPerDay))}
        // Glow at most on the pace: it is the number the rest support.
        tone={cn(win.srPerDay > 0 && "accent-glow", paceTone(win.srPerDay))}
      />
      <Metric
        label="SR / day played"
        value={formatDelta(round(win.srPerActiveDay))}
        tone={paceTone(win.srPerActiveDay)}
      />
      <Metric
        label="SR / game"
        value={formatDelta(round(win.srPerGame))}
        tone={paceTone(win.srPerGame)}
      />
      <Metric
        label="Typical swing"
        value={win.sdDaily == null ? "n/a" : `±${formatSr(round(win.sdDaily))}`}
      />
      <Metric label="Games" value={formatSr(win.games)} />
    </dl>
  );
}

function goalOpenLine(goal: GoalProjection, now: number): string {
  switch (goal.status) {
    case "projected":
      return goal.etaMs == null
        ? "Projected"
        : `Projected ${formatCalloutDay(goal.etaMs, now)}`;
    case "unreachable":
      return "Won't catch at this pace";
    case "beyond-horizon":
      return "More than a year out at this pace";
    case "insufficient-history":
      return "Not enough history in this window";
    case "cutoff-unavailable":
      return "Live cutoff unavailable right now";
    case "reached":
      return "Reached";
  }
}

function GoalRow({ goal, now }: { goal: GoalProjection; now: number }) {
  const reached = goal.status === "reached";
  const showRange =
    goal.status === "projected" &&
    goal.etaEarliestMs != null &&
    goal.etaLatestMs != null;

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">
          {goal.label}
          {goal.isSavedGoal && (
            <span className="ml-2 text-xs font-normal text-muted">
              your goal
            </span>
          )}
        </p>
        {!reached && (
          <p className="numeric mt-0.5 text-xs text-muted">
            {formatSr(round(goal.targetSr))} SR
            {goal.remaining > 0 && (
              <> · {formatSr(round(goal.remaining))} to go</>
            )}
          </p>
        )}
      </div>
      <div className="text-right">
        <p
          className={cn(
            "text-sm",
            reached
              ? "font-medium text-accent"
              : goal.status === "projected"
                ? "numeric font-medium text-accent"
                : "text-muted",
          )}
        >
          {goalOpenLine(goal, now)}
        </p>
        {showRange && (
          <p className="numeric mt-0.5 text-xs text-muted">
            {formatCalloutDay(goal.etaEarliestMs!, now)} -{" "}
            {formatCalloutDay(goal.etaLatestMs!, now)}
          </p>
        )}
      </div>
    </div>
  );
}

/** Open, distinct targets get a flat reference line - except a live T250 that
 * is already drawn as its own moving series. One line, one name. */
function goalLinesFor(win: TrendWindow): TrendGoalLine[] {
  const drawsCutoff = win.cutoffProjection.length > 0;
  return win.goalRows
    .filter((goal) => goal.status !== "reached")
    .filter((goal) => goal.status !== "cutoff-unavailable")
    .filter((goal) => !(goal.moving && drawsCutoff))
    .map((goal) => ({
      key: goal.target,
      sr: goal.targetSr,
      label: goal.label,
    }));
}

export function TrendProjectionView({
  projection,
  initialWindow,
  now,
  cutoffPaceAvailable,
}: {
  projection: TrendProjection;
  initialWindow: TrendWindowId;
  now: number;
  cutoffPaceAvailable: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const fromUrl = searchParams.get("w");
  const active = isTrendWindowId(fromUrl) ? fromUrl : initialWindow;
  const win = projection.windows[active];

  const setWindow = (id: TrendWindowId) => {
    if (id === active) return;
    router.replace(`${pathname}?w=${id}`, { scroll: false });
  };

  const history = win.days.map((day, index) => ({
    t: day.t,
    // The last observed point is "now": use the resolved current SR so the now
    // mark sits on the line rather than beside it.
    sr: index === win.days.length - 1 ? projection.currentSr : day.endSr,
  }));

  const hero = win.hero;
  // A zero-game window still has something to draw when the live cutoff has
  // its own history/pace - only fall back to the "log a match" prompt when
  // there is truly nothing plottable.
  const empty =
    win.elapsedDays === 0 &&
    win.cutoffHistory.length === 0 &&
    win.cutoffProjection.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {hero && (
            <>
              <p
                className={cn(
                  "text-2xl font-semibold leading-tight tracking-tight md:text-3xl",
                  HERO_TONE[hero.tone],
                )}
              >
                {hero.headline}
              </p>
              {hero.support && (
                <p className="numeric mt-1.5 text-sm text-muted">
                  {hero.support}
                </p>
              )}
            </>
          )}
        </div>
        <div className="flex flex-col items-start gap-1.5 lg:items-end">
          <div className="scrollbar-none -mx-1 max-w-full overflow-x-auto px-1">
            <WindowToggle active={active} onChange={setWindow} />
          </div>
          <span className="text-xs text-muted">pace: {win.paceLabel}</span>
        </div>
      </div>

      {empty ? (
        <div className="flex flex-col items-start gap-2 rounded-[8px] border border-border px-4 py-8 text-sm text-muted">
          <p>Log more matches in this window to project a pace.</p>
          <Link href="/wz/calc" className="text-accent hover:underline">
            Log a match
          </Link>
        </div>
      ) : (
        <TrendChart
          history={history}
          projection={win.projection}
          cutoffHistory={win.cutoffHistory}
          cutoffProjection={win.cutoffProjection}
          goalLines={goalLinesFor(win)}
          callouts={win.callouts}
        />
      )}

      <MetricsRow win={win} />

      {win.goalRows.length > 0 && (
        <div className="divide-y divide-border border-t border-border">
          {win.goalRows.map((goal) => (
            <GoalRow key={goal.target} goal={goal} now={now} />
          ))}
        </div>
      )}

      <div className="space-y-1 text-[11px] text-muted">
        <p>
          The shaded band is a typical range around the projection, not a
          promise.
        </p>
        {!cutoffPaceAvailable && (
          <p>Live T250 shown against a static target. Cutoff pace unavailable.</p>
        )}
        {cutoffPaceAvailable && win.cutoffHistory.length === 0 && (
          <p>
            No stored cutoff snapshots in this window. The cutoff is drawn from
            its current value and pace only.
          </p>
        )}
      </div>
    </div>
  );
}
