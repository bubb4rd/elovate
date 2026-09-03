"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { formatDelta, formatSr } from "@/lib/format";
import {
  TREND_WINDOWS,
  type GoalProjection,
  type TrendProjection,
  type TrendWindow,
  type TrendWindowId,
} from "@/lib/premium/trend-projection";
import { cn } from "@/lib/utils";
import { TrendChart } from "./trend-chart";

function paceClass(value: number): string {
  if (value > 0) return "text-accent";
  if (value < 0) return "text-negative";
  return "text-muted";
}

function round(value: number): number {
  return Math.round(value);
}

function formatEta(ms: number | null): string {
  if (ms == null) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ms));
}

function formatDays(days: number | null): string {
  if (days == null) return "—";
  if (days < 1) return "<1 day";
  return `${Math.round(days)} days`;
}

const WINDOW_SUBTEXT: Record<TrendWindowId, string> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  season: "since your first logged match",
};

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-[8px] border border-border px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className={cn("numeric mt-0.5 text-sm font-medium", tone ?? "text-foreground")}>
        {value}
      </p>
    </div>
  );
}

function goalStatusLine(goal: GoalProjection): string {
  switch (goal.status) {
    case "reached":
      return goal.moving && goal.bufferDays != null
        ? `Reached · ${formatDays(goal.bufferDays)} of cushion at this pace`
        : "Reached";
    case "insufficient-history":
      return "Need 5 days of history to project this";
    case "cutoff-unavailable":
      return "Live cutoff unavailable right now";
    case "beyond-horizon":
      return "More than a year out at this pace";
    case "unreachable":
      if (goal.groundLostPerDay != null) {
        return `Cutoff is outrunning you by ${round(goal.groundLostPerDay)} SR/day`;
      }
      return "This pace doesn't get there";
    case "projected":
      return `Projected ${formatEta(goal.etaMs)}`;
  }
}

function GoalCard({ goal }: { goal: GoalProjection }) {
  const showRange =
    goal.status === "projected" &&
    goal.etaEarliestMs != null &&
    goal.etaLatestMs != null;

  return (
    <div className="flex flex-col gap-1.5 rounded-[8px] border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{goal.label}</p>
        {goal.isSavedGoal && (
          <span className="rounded-[4px] bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
            Your goal
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 text-xs text-muted">
        <span className="numeric">{formatSr(goal.targetSr)} SR</span>
        {goal.remaining > 0 && (
          <span className="numeric">
            {formatSr(goal.remaining)} to go
          </span>
        )}
      </div>
      <p
        className={cn(
          "text-xs",
          goal.status === "projected"
            ? "text-foreground"
            : goal.status === "reached"
              ? "text-accent"
              : goal.status === "unreachable" && goal.groundLostPerDay != null
                ? "text-negative"
                : "text-muted",
        )}
      >
        {goalStatusLine(goal)}
      </p>
      {showRange && (
        <p className="numeric text-[11px] text-muted">
          Typical range {formatEta(goal.etaEarliestMs)} &ndash;{" "}
          {formatEta(goal.etaLatestMs)}
        </p>
      )}
    </div>
  );
}

function WindowToggle({
  active,
  onChange,
}: {
  active: TrendWindowId;
  onChange: (id: TrendWindowId) => void;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="inline-flex w-max items-center gap-1 rounded-[8px] border border-border bg-surface p-1">
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

function WindowBody({ win }: { win: TrendWindow }) {
  if (win.elapsedDays === 0) {
    return (
      <p className="text-sm text-muted">
        No WZ matches in this window yet. Log a few and your trend shows up here.
      </p>
    );
  }

  const insufficient = win.projection == null;
  const goals = [...win.goals].map((g) => ({
    label: g.label,
    targetSr: g.targetSr,
  }));

  return (
    <div className="space-y-4">
      <TrendChart
        days={win.days}
        projection={win.projection}
        goals={goals}
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Stat
          label="SR / day"
          value={formatDelta(round(win.srPerDay))}
          tone={paceClass(win.srPerDay)}
        />
        <Stat
          label="SR / day played"
          value={formatDelta(round(win.srPerActiveDay))}
          tone={paceClass(win.srPerActiveDay)}
        />
        <Stat
          label="SR / game"
          value={formatDelta(round(win.srPerGame))}
          tone={paceClass(win.srPerGame)}
        />
        <Stat
          label="Typical swing"
          value={win.sdDaily == null ? "—" : `±${formatSr(round(win.sdDaily))}`}
        />
        <Stat label="Games" value={String(win.games)} />
      </div>

      {insufficient && (
        <p className="text-xs text-muted">
          {win.elapsedDays} {win.elapsedDays === 1 ? "day" : "days"} of
          history &mdash; goal dates project from day 5.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        {win.goals.map((goal) => (
          <GoalCard key={goal.target} goal={goal} />
        ))}
      </div>
    </div>
  );
}

export function TrendProjectionView({
  projection,
  cutoffPaceAvailable,
}: {
  projection: TrendProjection;
  cutoffPaceAvailable: boolean;
}) {
  const [active, setActive] = useState<TrendWindowId>("7d");
  const win = projection.windows[active];

  return (
    <div className="space-y-4">
      {projection.insight && (
        <p className="rounded-[8px] border border-accent/30 bg-accent/[0.06] px-3 py-2 text-sm text-foreground">
          {projection.insight}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <WindowToggle active={active} onChange={setActive} />
        <span className="text-xs text-muted">{WINDOW_SUBTEXT[active]}</span>
      </div>

      <WindowBody win={win} />

      {!cutoffPaceAvailable && (
        <p className="text-[11px] text-muted">
          Live T250 shown against a static target &mdash; cutoff pace unavailable.
        </p>
      )}
    </div>
  );
}
