/**
 * elovate Pro — trend & goal projection analytics (PREM-03).
 *
 * Pure, client-safe. No Supabase / React / `Date.now()` — every entry point
 * takes an explicit `now`. Computes, from the player's own WZ climb history:
 *   - a daily SR trend over a 7d / 30d / season window
 *   - the pace (SR/day) implied by that window and a random-walk variance band
 *   - the live T250 cutoff as a *second plottable series* (history + projection),
 *     so "losing ground" is drawn, not only asserted
 *   - a deduped goal list (two targets that resolve to the same SR are one row)
 *   - the page's single hero insight, per window
 *
 * `currentSr` is resolved by the caller as `latest WZ match srAfter ?? profiles.current_sr`
 * and passed in — this module never reaches for it.
 *
 * Read surface: the player's own `climb_matches` only (fed in as a WZ-scoped
 * `HistoryDocument` by `./trend-queries`). The cutoff SR, cutoff pace and cutoff
 * series come from the public `snapshots` read that `/pro/layout` already
 * performs — nothing new.
 *
 * `projectCrossingDays` (moving-target crossing math) is exported standalone and
 * will be reused by PREM-11 — keep it independent of the rest of this module.
 * PREM-11's race is this chart; there is no second T250 page.
 */

import { formatDelta, formatSr } from "@/lib/format";
import type { HistoryDocument, WzHistoryMatch } from "@/lib/history";
import { type ClimbTarget, resolveTarget } from "@/lib/ranked";
import { ONBOARDING_CLIMB_GOALS } from "@/lib/profile/goals";

const DAY_MS = 86_400_000;

/** Below this many materialised trend days, pace/band/dates are withheld. */
export const MIN_TREND_DAYS = 5;

/** A projected hit date further out than this is reported as out of range. */
export const MAX_PROJECTION_DAYS = 365;

export type TrendWindowId = "7d" | "30d" | "season";

export const TREND_WINDOWS: {
  id: TrendWindowId;
  label: string;
  days: number | null;
  /** Caption for the control: this is the *pace sample*, never the plotted x range. */
  paceLabel: string;
}[] = [
  { id: "7d", label: "7 days", days: 7, paceLabel: "last 7 days" },
  { id: "30d", label: "30 days", days: 30, paceLabel: "last 30 days" },
  { id: "season", label: "Season", days: null, paceLabel: "this season" },
];

export function isTrendWindowId(value: unknown): value is TrendWindowId {
  return TREND_WINDOWS.some((w) => w.id === value);
}

/** The three goal targets, always computed regardless of the player's saved goals. */
const GOAL_TARGETS: ClimbTarget[] = ["nextTier", "iridescent", "top250"];

/**
 * When two targets resolve to the same SR, the surviving row keeps the more
 * meaningful name. At Iridescent, `nextTier` *is* the cutoff, so "Live T250"
 * wins over "Next tier" — one line, one name.
 */
const TARGET_PRIORITY: Record<ClimbTarget, number> = {
  top250: 3,
  iridescent: 2,
  nextDivision: 1,
  nextTier: 0,
};

function goalLabel(target: ClimbTarget): string {
  return ONBOARDING_CLIMB_GOALS.find((g) => g.id === target)?.label ?? target;
}

export type TrendDay = {
  day: string;
  t: number;
  games: number;
  netSr: number;
  endSr: number;
};

/** One plottable `(time, SR)` sample. Used for both the player and the cutoff. */
export type TrendPoint = { t: number; sr: number };

export type TrendRayPoint = {
  t: number;
  projected: number;
  /** Random-walk ±1σ range as a [low, high] tuple ("typical range", not a CI). */
  band: [number, number];
};

export type TrendRay = {
  pacePerDay: number;
  sdDaily: number;
  horizonDays: number;
  points: TrendRayPoint[];
};

export type GoalStatus =
  | "reached"
  | "projected"
  | "unreachable"
  | "beyond-horizon"
  | "insufficient-history"
  | "cutoff-unavailable";

export type GoalProjection = {
  target: ClimbTarget;
  label: string;
  targetSr: number;
  remaining: number;
  isSavedGoal: boolean;
  /** True when the target line itself moves (Live T250 with a known cutoff pace). */
  moving: boolean;
  status: GoalStatus;
  daysToGoal: number | null;
  etaMs: number | null;
  etaEarliestMs: number | null;
  etaLatestMs: number | null;
  /** SR/day the player loses to a faster-climbing cutoff, else null. */
  groundLostPerDay: number | null;
  /** For an already-reached moving target: days of cushion before the cutoff catches up. */
  bufferDays: number | null;
};

/**
 * A chart annotation.
 *
 * `now` / `cutoff` name each series at today's value; `finish` reads each
 * series' projected value where the chart ends (season end, or the goal-driven
 * horizon), and the cutoff's `finish` carries the "won't catch" verdict when the
 * race is lost. `hit` only exists when the player's projection actually crosses
 * the target (for Live T250: crosses the *moving* cutoff, not a frozen
 * horizontal). Goal names are never planted on the line — only numbers, dates,
 * and the verdict.
 */
export type TrendCallout = {
  id: string;
  kind: "now" | "hit" | "cutoff" | "finish";
  t: number;
  sr: number;
  label: string;
  sublabel: string | null;
  tone: "accent" | "muted";
};

/** The page's single insight. Rendered as type, never as a bordered banner. */
export type TrendHero = {
  headline: string;
  support: string | null;
  tone: "accent" | "negative" | "muted";
};

export type TrendWindow = {
  id: TrendWindowId;
  label: string;
  /** "last 7 days" — the *pace sample*, not the plotted x range. */
  paceLabel: string;
  days: TrendDay[];
  firstDay: string | null;
  totalNet: number;
  games: number;
  activeDays: number;
  elapsedDays: number;
  srPerDay: number;
  srPerActiveDay: number;
  srPerGame: number;
  sdDaily: number | null;
  projection: TrendRay | null;
  /** Every target, undeduped. Kept for existing callers (teaser demo card). */
  goals: GoalProjection[];
  /** Deduped by resolved SR, open rows first. This is what the page lists. */
  goalRows: GoalProjection[];
  /** Observed live cutoff, one point per UTC day, clipped to this window. */
  cutoffHistory: TrendPoint[];
  /** The cutoff extended from now at its own pace, over the same horizon. */
  cutoffProjection: TrendPoint[];
  callouts: TrendCallout[];
  hero: TrendHero | null;
};

export type TrendProjection = {
  windows: Record<TrendWindowId, TrendWindow>;
  currentSr: number;
  /** From the season record. `null` when the active season is open ended. */
  seasonEndMs: number | null;
};

export type TrendInput = {
  doc: HistoryDocument;
  now: number;
  currentSr: number;
  cutoff: { sr: number | null; pacePerDay: number | null };
  savedGoals: ClimbTarget[];
  /**
   * Observed cutoff snapshots at any cadence; bucketed to one point per UTC
   * day here. Optional: with no series the cutoff still projects from
   * `cutoff.sr`, it just has no drawn history.
   */
  cutoffSeries?: TrendPoint[];
  /** Season end in ms. `null`/omitted leaves the horizon goal-driven. */
  seasonEndMs?: number | null;
};

// --- small helpers -------------------------------------------------------

function isWz(match: { mode: string }): match is WzHistoryMatch {
  return match.mode === "wz";
}

function dayStr(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function dayMs(day: string): number {
  return Date.parse(`${day}T00:00:00.000Z`);
}

function signed(value: number): string {
  return formatDelta(Math.round(value));
}

const SHORT_DAY = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

const SHORT_DAY_YEAR = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** "Jan 14", or "Jan 14, 2027" once the date leaves the current year. */
export function formatCalloutDay(ms: number, now: number): string {
  const date = new Date(ms);
  const sameYear = date.getUTCFullYear() === new Date(now).getUTCFullYear();
  return (sameYear ? SHORT_DAY : SHORT_DAY_YEAR).format(date);
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function sampleSd(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
  return Math.sqrt(Math.max(0, variance));
}

// --- exported projection math ------------------------------------------

/**
 * Calendar days for a static target: `remaining / pacePerDay`.
 * `0` when already there (`remaining <= 0`), `null` when the pace can't get
 * there (`pacePerDay <= 0`). Does not clamp to {@link MAX_PROJECTION_DAYS} —
 * the caller decides what "too far" means.
 */
export function projectDaysToTarget(
  remaining: number,
  pacePerDay: number,
): number | null {
  if (remaining <= 0) return 0;
  if (pacePerDay <= 0) return null;
  return remaining / pacePerDay;
}

/**
 * Calendar days to cross a *moving* line: `gap / (userPace - targetPace)`.
 * `0` when the gap is already closed, `null` when the player is not gaining on
 * the line (`userPace <= targetPace`) — never returns `Infinity`.
 *
 * Exported standalone for reuse by PREM-11.
 */
export function projectCrossingDays(
  gap: number,
  userPace: number,
  targetPace: number,
): number | null {
  if (gap <= 0) return 0;
  const closing = userPace - targetPace;
  if (closing <= 0) return null;
  return gap / closing;
}

/**
 * Earliest / latest day a random walk with drift `mean` and per-day sd `sd`
 * reaches `remaining`, solving `mean·t ± sd·√t = remaining` with `u = √t`.
 * `{ null, null }` when `mean <= 0` or the roots are non-positive / imaginary.
 */
export function projectBandDays(
  remaining: number,
  mean: number,
  sd: number,
): { earliest: number | null; latest: number | null } {
  if (remaining <= 0) return { earliest: 0, latest: 0 };
  if (mean <= 0) return { earliest: null, latest: null };
  if (sd <= 0) {
    const t = remaining / mean;
    return { earliest: t, latest: t };
  }
  const disc = sd * sd + 4 * mean * remaining;
  if (disc < 0) return { earliest: null, latest: null };
  const root = Math.sqrt(disc);
  const uEarly = (root - sd) / (2 * mean); // mean·t + sd·√t = remaining
  const uLate = (root + sd) / (2 * mean); // mean·t − sd·√t = remaining
  return {
    earliest: uEarly > 0 ? uEarly * uEarly : null,
    latest: uLate > 0 ? uLate * uLate : null,
  };
}

// --- daily bucketing --------------------------------------------------

type Row = { dayMs: number; t: number; net: number; srAfter: number; srBefore: number };

function windowDays(
  rows: Row[],
  firstEverDayMs: number | null,
  now: number,
  windowLen: number | null,
): TrendDay[] {
  if (firstEverDayMs == null) return [];
  const todayMs = dayMs(dayStr(now));
  const startMs =
    windowLen == null
      ? firstEverDayMs
      : Math.max(firstEverDayMs, todayMs - (windowLen - 1) * DAY_MS);
  if (startMs > todayMs) return [];

  const inWindow = rows
    .filter((r) => r.dayMs >= startMs && r.dayMs <= todayMs)
    .sort((a, b) => a.t - b.t);

  const byDay = new Map<number, Row[]>();
  for (const r of inWindow) {
    const list = byDay.get(r.dayMs) ?? [];
    list.push(r);
    byDay.set(r.dayMs, list);
  }

  const firstMatch = inWindow[0];
  let running = firstMatch ? firstMatch.srBefore : 0;

  const out: TrendDay[] = [];
  for (let ms = startMs; ms <= todayMs; ms += DAY_MS) {
    const list = (byDay.get(ms) ?? []).sort((a, b) => a.t - b.t);
    const netSr = list.reduce((sum, r) => sum + r.net, 0);
    if (list.length > 0) running = list[list.length - 1]!.srAfter;
    out.push({
      day: dayStr(ms),
      t: ms,
      games: list.length,
      netSr,
      endSr: running,
    });
  }
  return out;
}

// --- daily bucketing of an arbitrary-cadence series ------------------

/**
 * Collapse `points` to one sample per UTC day (the last sample of that day),
 * optionally clipped to `[fromMs, toMs]` day boundaries. The live cutoff feed
 * is ~96 snapshots/day; the player trend is daily. Bucketing both to days lets
 * them share one x domain without inventing points.
 */
export function bucketDailyPoints(
  points: TrendPoint[],
  fromMs?: number | null,
  toMs?: number | null,
): TrendPoint[] {
  const byDay = new Map<number, number>();
  const sorted = points
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.sr))
    .sort((a, b) => a.t - b.t);
  for (const point of sorted) {
    const bucket = dayMs(dayStr(point.t));
    if (!Number.isFinite(bucket)) continue;
    if (fromMs != null && bucket < fromMs) continue;
    if (toMs != null && bucket > toMs) continue;
    byDay.set(bucket, point.sr);
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, sr]) => ({ t, sr }));
}

// --- ray -------------------------------------------------------------

/**
 * How far the projection (and therefore the x domain) runs: to the last open
 * goal, clipped to season end when the season record has one. A window with an
 * open goal the pace never reaches still gets a long enough horizon for the
 * divergence between the player and the cutoff to be legible.
 */
function horizonDaysFor(params: {
  now: number;
  seasonEndMs: number | null;
  goalDays: number[];
  hasOpenMiss: boolean;
}): number {
  const { now, seasonEndMs, goalDays, hasOpenMiss } = params;
  const maxGoal = goalDays.length > 0 ? Math.max(...goalDays) : 0;
  const floor = hasOpenMiss ? 45 : 14;
  const days = Math.min(120, Math.max(floor, Math.ceil(maxGoal * 1.15) || 0));
  if (seasonEndMs != null) {
    const toSeasonEnd = (seasonEndMs - now) / DAY_MS;
    // A season that ends in 5 days ends the chart in 5 days. The goal-driven
    // floor never extends the domain past the season it is drawn for.
    if (toSeasonEnd > 0) return Math.max(1, Math.min(days, toSeasonEnd));
  }
  return days;
}

function raySteps(horizonDays: number): number[] {
  const step = horizonDays > 60 ? 2 : 1;
  const out: number[] = [];
  for (let d = 0; d <= horizonDays; d += step) out.push(d);
  if (out[out.length - 1] !== horizonDays) out.push(horizonDays);
  return out;
}

function buildRay(
  now: number,
  currentSr: number,
  pacePerDay: number,
  sdDaily: number,
  horizonDays: number,
): TrendRay {
  const points: TrendRayPoint[] = raySteps(horizonDays).map((d) => {
    const projected = currentSr + pacePerDay * d;
    const spread = sdDaily * Math.sqrt(d);
    return {
      t: now + d * DAY_MS,
      projected,
      band: [projected - spread, projected + spread] as [number, number],
    };
  });
  return { pacePerDay, sdDaily, horizonDays, points };
}

/** The cutoff extended from now at its own pace, on the player's horizon. */
function buildCutoffRay(
  now: number,
  cutoffSr: number,
  pacePerDay: number,
  horizonDays: number,
): TrendPoint[] {
  return raySteps(horizonDays).map((d) => ({
    t: now + d * DAY_MS,
    sr: cutoffSr + pacePerDay * d,
  }));
}

// --- goals ---------------------------------------------------------

function emptyGoal(
  target: ClimbTarget,
  targetSr: number,
  remaining: number,
  isSavedGoal: boolean,
  moving: boolean,
  status: GoalStatus,
): GoalProjection {
  return {
    target,
    label: goalLabel(target),
    targetSr,
    remaining,
    isSavedGoal,
    moving,
    status,
    daysToGoal: status === "reached" ? 0 : null,
    etaMs: null,
    etaEarliestMs: null,
    etaLatestMs: null,
    groundLostPerDay: null,
    bufferDays: null,
  };
}

function projectGoal(params: {
  target: ClimbTarget;
  now: number;
  currentSr: number;
  srPerDay: number;
  sdDaily: number;
  hasPace: boolean;
  cutoff: { sr: number | null; pacePerDay: number | null };
  savedGoals: ClimbTarget[];
}): GoalProjection {
  const { target, now, currentSr, srPerDay, sdDaily, hasPace, cutoff, savedGoals } =
    params;
  const isSavedGoal = savedGoals.includes(target);
  const isT250 = target === "top250";

  if (isT250 && cutoff.sr == null) {
    return emptyGoal(target, currentSr, 0, isSavedGoal, false, "cutoff-unavailable");
  }

  const resolved = resolveTarget(currentSr, target, cutoff.sr);
  const targetSr = resolved.sr;
  const remaining = targetSr - currentSr;
  const moving = isT250 && cutoff.pacePerDay != null;

  if (resolved.reached || remaining <= 0) {
    const goal = emptyGoal(target, targetSr, remaining, isSavedGoal, moving, "reached");
    if (moving && cutoff.pacePerDay != null) {
      const closing = Math.max(cutoff.pacePerDay - srPerDay, 1e-9);
      goal.bufferDays = (currentSr - targetSr) / closing;
    }
    return goal;
  }

  if (!hasPace) {
    return emptyGoal(
      target,
      targetSr,
      remaining,
      isSavedGoal,
      moving,
      "insufficient-history",
    );
  }

  if (moving && cutoff.pacePerDay != null) {
    const cutoffPace = cutoff.pacePerDay;
    const days = projectCrossingDays(remaining, srPerDay, cutoffPace);
    if (days == null) {
      const goal = emptyGoal(
        target,
        targetSr,
        remaining,
        isSavedGoal,
        true,
        "unreachable",
      );
      goal.groundLostPerDay = cutoffPace - srPerDay;
      return goal;
    }
    if (days > MAX_PROJECTION_DAYS) {
      return emptyGoal(target, targetSr, remaining, isSavedGoal, true, "beyond-horizon");
    }
    const band = projectBandDays(remaining, srPerDay - cutoffPace, sdDaily);
    return {
      target,
      label: goalLabel(target),
      targetSr,
      remaining,
      isSavedGoal,
      moving: true,
      status: "projected",
      daysToGoal: days,
      etaMs: now + days * DAY_MS,
      etaEarliestMs: band.earliest == null ? null : now + band.earliest * DAY_MS,
      etaLatestMs: band.latest == null ? null : now + band.latest * DAY_MS,
      groundLostPerDay: null,
      bufferDays: null,
    };
  }

  // Static target (Next tier, Iridescent, or T250 with no known cutoff pace).
  const days = projectDaysToTarget(remaining, srPerDay);
  if (days == null) {
    return emptyGoal(target, targetSr, remaining, isSavedGoal, false, "unreachable");
  }
  if (days > MAX_PROJECTION_DAYS) {
    return emptyGoal(target, targetSr, remaining, isSavedGoal, false, "beyond-horizon");
  }
  const band = projectBandDays(remaining, srPerDay, sdDaily);
  return {
    target,
    label: goalLabel(target),
    targetSr,
    remaining,
    isSavedGoal,
    moving: false,
    status: "projected",
    daysToGoal: days,
    etaMs: now + days * DAY_MS,
    etaEarliestMs: band.earliest == null ? null : now + band.earliest * DAY_MS,
    etaLatestMs: band.latest == null ? null : now + band.latest * DAY_MS,
    groundLostPerDay: null,
    bufferDays: null,
  };
}

// --- goal dedupe -------------------------------------------------------

function preferGoal(a: GoalProjection, b: GoalProjection): GoalProjection {
  const isSavedGoal = a.isSavedGoal || b.isSavedGoal;
  const display =
    a.isSavedGoal !== b.isSavedGoal
      ? (a.isSavedGoal ? a : b)
      : TARGET_PRIORITY[b.target] > TARGET_PRIORITY[a.target]
        ? b
        : a;
  // The numeric substance always comes from whichever side actually models
  // the moving cutoff crossing — a saved "Next tier" goal that happens to
  // collide with T250 at Iridescent must not silently discard that
  // projection for its own static one. `label`/`target`/`isSavedGoal` still
  // follow the saved-goal-or-priority winner above.
  const numeric = a.target === "top250" ? a : b.target === "top250" ? b : display;
  return { ...numeric, label: display.label, target: display.target, isSavedGoal };
}

function compareGoalRows(a: GoalProjection, b: GoalProjection): number {
  const aReached = a.status === "reached";
  const bReached = b.status === "reached";
  if (aReached !== bReached) return aReached ? 1 : -1;
  if (aReached) return b.targetSr - a.targetSr;
  return a.targetSr - b.targetSr;
}

/**
 * Fold targets that resolve to the same SR into one row, then order open rows
 * (ascending SR) ahead of reached ones. At Iridescent with a live cutoff,
 * `nextTier` and `top250` are literally the same number — rendering both is the
 * duplicate-card bug this exists to kill.
 *
 * `cutoff-unavailable` rows are never folded: their `targetSr` is a placeholder,
 * not a real line.
 */
export function dedupeGoals(goals: GoalProjection[]): GoalProjection[] {
  const byKey = new Map<string, GoalProjection>();
  const order: string[] = [];
  goals.forEach((goal, index) => {
    const key =
      goal.status === "cutoff-unavailable"
        ? `unavailable-${index}`
        : String(Math.round(goal.targetSr));
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, goal);
      order.push(key);
      return;
    }
    byKey.set(key, preferGoal(existing, goal));
  });
  return order.map((key) => byKey.get(key)!).sort(compareGoalRows);
}

// --- callouts ----------------------------------------------------------

function buildCallouts(params: {
  now: number;
  currentSr: number;
  srPerDay: number;
  lastDayMs: number | null;
  goalRows: GoalProjection[];
  /** The player's own ray — null below {@link MIN_TREND_DAYS}. */
  projection: TrendRay | null;
  /**
   * Same horizon `projection` would use if it existed. The live cutoff's
   * pace comes from the board, not the player's match history, so its
   * callouts must not wait on the player clearing the history floor.
   */
  horizonDays: number;
  cutoff: { sr: number | null; pacePerDay: number | null };
}): TrendCallout[] {
  const {
    now,
    currentSr,
    srPerDay,
    lastDayMs,
    goalRows,
    projection,
    horizonDays,
    cutoff,
  } = params;
  const out: TrendCallout[] = [];
  const hasCutoffPace = cutoff.sr != null && cutoff.pacePerDay != null;

  if (lastDayMs != null) {
    out.push({
      id: "now",
      kind: "now",
      t: lastDayMs,
      sr: currentSr,
      label: formatSr(Math.round(currentSr)),
      sublabel: "Now",
      tone: "accent",
    });
  }

  // Name the second series where it is today, mirroring the player's now
  // mark. Without this the cutoff is an unlabelled grey line. This runs
  // whether or not the player has enough history for their own ray — the
  // live cutoff progresses regardless of how little the player has logged.
  if (hasCutoffPace) {
    out.push({
      id: "cutoff",
      kind: "cutoff",
      t: now,
      sr: cutoff.sr!,
      label: formatSr(Math.round(cutoff.sr!)),
      sublabel: "Cutoff",
      tone: "muted",
    });
  }

  if (projection) {
    for (const goal of goalRows) {
      if (goal.status !== "projected") continue;
      if (goal.etaMs == null || goal.daysToGoal == null) continue;
      if (goal.daysToGoal > horizonDays) continue;
      out.push({
        id: `hit-${goal.target}`,
        kind: "hit",
        t: goal.etaMs,
        // The crossing sits on the player's ray for both static and moving
        // targets — at the crossing the two lines are the same number.
        sr: currentSr + srPerDay * goal.daysToGoal,
        label: formatCalloutDay(goal.etaMs, now),
        sublabel: goal.label,
        tone: "accent",
      });
    }
  }

  // Where each series ends up. Both dashes get a number at the right edge, so
  // "you finish here, the cutoff finishes there" is readable off the chart
  // without hovering.
  const endMs = now + horizonDays * DAY_MS;

  if (projection) {
    const youFinish = currentSr + srPerDay * horizonDays;
    out.push({
      id: "finish-you",
      kind: "finish",
      t: endMs,
      sr: youFinish,
      label: formatSr(Math.round(youFinish)),
      sublabel: formatCalloutDay(endMs, now),
      tone: "accent",
    });
  }

  if (hasCutoffPace) {
    const cutoffFinish = cutoff.sr! + cutoff.pacePerDay! * horizonDays;
    // Without the player's own pace there is nothing to compare against, so
    // the verdict stays neutral rather than guessing at "won't catch".
    const losing =
      projection != null &&
      goalRows.some((goal) => goal.moving && goal.status === "unreachable");
    out.push({
      id: "finish-cutoff",
      kind: "finish",
      t: endMs,
      sr: cutoffFinish,
      label: formatSr(Math.round(cutoffFinish)),
      sublabel: losing ? "won't catch" : "Cutoff",
      tone: "muted",
    });
  }

  return out;
}

// --- window assembly ---------------------------------------------------

function computeWindow(params: {
  spec: (typeof TREND_WINDOWS)[number];
  rows: Row[];
  firstEverDayMs: number | null;
  cutoffSeries: TrendPoint[];
  hasHistory: boolean;
  input: TrendInput;
}): TrendWindow {
  const { spec, rows, firstEverDayMs, cutoffSeries, hasHistory, input } = params;
  const { now, currentSr, cutoff, savedGoals } = input;
  const seasonEndMs = input.seasonEndMs ?? null;

  const days = windowDays(rows, firstEverDayMs, now, spec.days);
  const totalNet = days.reduce((sum, d) => sum + d.netSr, 0);
  const games = days.reduce((sum, d) => sum + d.games, 0);
  const activeDays = days.filter((d) => d.games > 0).length;
  const elapsedDays = days.length;

  const srPerDay = elapsedDays > 0 ? totalNet / elapsedDays : 0;
  const srPerActiveDay = activeDays > 0 ? totalNet / activeDays : 0;
  const srPerGame = games > 0 ? totalNet / games : 0;

  const enoughDays = elapsedDays >= MIN_TREND_DAYS;
  const sdDaily = enoughDays ? sampleSd(days.map((d) => d.netSr)) : null;

  const goals = GOAL_TARGETS.map((target) =>
    projectGoal({
      target,
      now,
      currentSr,
      srPerDay,
      sdDaily: sdDaily ?? 0,
      hasPace: enoughDays,
      cutoff,
      savedGoals,
    }),
  );

  const goalRows = dedupeGoals(goals);

  const goalDays = goalRows
    .map((g) => g.daysToGoal)
    .filter((d): d is number => d != null && d > 0);
  const hasOpenMiss = goalRows.some(
    (g) => g.status === "unreachable" || g.status === "beyond-horizon",
  );

  const horizonDays = horizonDaysFor({
    now,
    seasonEndMs,
    goalDays,
    hasOpenMiss,
  });

  const projection = enoughDays
    ? buildRay(now, currentSr, srPerDay, sdDaily ?? 0, horizonDays)
    : null;

  const lastDayMs = days.length > 0 ? days[days.length - 1]!.t : null;
  // The live cutoff's own history/pace don't depend on the player's match
  // log, so its clip window is the pace window's *nominal* length (7d/30d/
  // everything for season) — never the player's own materialised days. A
  // brand-new profile with one logged day still gets the cutoff's real
  // progression, not a single point.
  const todayMs = dayMs(dayStr(now));
  const cutoffFromMs = spec.days == null ? null : todayMs - (spec.days - 1) * DAY_MS;
  const cutoffHistory = bucketDailyPoints(cutoffSeries, cutoffFromMs, todayMs);
  const cutoffProjection =
    cutoff.sr != null && cutoff.pacePerDay != null
      ? buildCutoffRay(now, cutoff.sr, cutoff.pacePerDay, horizonDays)
      : [];

  const callouts = buildCallouts({
    now,
    currentSr,
    srPerDay,
    lastDayMs,
    goalRows,
    projection,
    horizonDays,
    cutoff,
  });

  const hero = buildHero({
    now,
    paceLabel: spec.paceLabel,
    hasHistory,
    elapsedDays,
    srPerDay,
    projection,
    goalRows,
    currentSr,
    cutoff,
  });

  return {
    id: spec.id,
    label: spec.label,
    paceLabel: spec.paceLabel,
    days,
    firstDay: days[0]?.day ?? null,
    totalNet,
    games,
    activeDays,
    elapsedDays,
    srPerDay,
    srPerActiveDay,
    srPerGame,
    sdDaily,
    projection,
    goals,
    goalRows,
    cutoffHistory,
    cutoffProjection,
    callouts,
    hero,
  };
}

// --- hero insight ------------------------------------------------------

/**
 * The one insight on the page. The chart has to be able to agree with it: the
 * "losing ground" branch is the same comparison that makes the cutoff outrun
 * the player's dash, so the copy and the drawing can't diverge.
 */
function buildHero(params: {
  now: number;
  paceLabel: string;
  hasHistory: boolean;
  elapsedDays: number;
  srPerDay: number;
  projection: TrendRay | null;
  goalRows: GoalProjection[];
  currentSr: number;
  cutoff: { sr: number | null; pacePerDay: number | null };
}): TrendHero | null {
  const {
    now,
    paceLabel,
    hasHistory,
    elapsedDays,
    srPerDay,
    projection,
    goalRows,
    currentSr,
    cutoff,
  } = params;

  if (!hasHistory) return null;

  if (elapsedDays === 0) {
    return {
      headline: "No matches in this window",
      support: "Log more matches in this window to project a pace.",
      tone: "muted",
    };
  }

  if (projection == null) {
    return {
      headline: `${elapsedDays} ${plural(elapsedDays, "day", "days")} logged`,
      support: `Pro projects goal dates from day ${MIN_TREND_DAYS}.`,
      tone: "muted",
    };
  }

  const cutoffPace = cutoff.pacePerDay;
  const losing =
    cutoff.sr != null &&
    cutoffPace != null &&
    cutoff.sr - currentSr > 0 &&
    srPerDay <= cutoffPace;
  if (losing && cutoffPace != null) {
    const ground = Math.round(cutoffPace - srPerDay);
    const support = `You ${signed(srPerDay)}/day · cutoff ${signed(
      cutoffPace,
    )}/day · ${paceLabel}`;
    if (ground <= 0) {
      return {
        headline: "Holding even with the T250 cutoff",
        support,
        tone: "muted",
      };
    }
    return {
      headline: `Losing ${formatSr(ground)} SR/day to the cutoff`,
      support,
      tone: "negative",
    };
  }

  const nearest = goalRows
    .filter(
      (g) => g.status === "projected" && g.etaMs != null && g.daysToGoal != null,
    )
    .sort((a, b) => a.daysToGoal! - b.daysToGoal!)[0];
  if (nearest && nearest.etaMs != null && nearest.daysToGoal != null) {
    const days = Math.max(0, Math.round(nearest.daysToGoal));
    const headline =
      days < 1
        ? `${nearest.label} today`
        : days <= 60
          ? `${nearest.label} in ${days} ${plural(days, "day", "days")}`
          : `${nearest.label} on ${formatCalloutDay(nearest.etaMs, now)}`;
    return {
      headline,
      support: `${signed(srPerDay)} SR/day · ${paceLabel}`,
      tone: "accent",
    };
  }

  return {
    headline: `${signed(srPerDay)} SR/day`,
    support: `${paceLabel} · no open goal lands at this pace`,
    tone: srPerDay < 0 ? "negative" : "muted",
  };
}

// --- entry point -----------------------------------------------------

export function computeTrendProjection(input: TrendInput): TrendProjection {
  const wz = input.doc.matches.filter(isWz);
  const rows: Row[] = wz
    .map((m) => {
      const t = Date.parse(m.createdAt);
      return {
        t,
        dayMs: dayMs(m.createdAt.slice(0, 10)),
        net: m.net,
        srAfter: m.srAfter,
        srBefore: m.srBefore,
      };
    })
    .filter((r) => Number.isFinite(r.t) && Number.isFinite(r.dayMs))
    .sort((a, b) => a.t - b.t);

  const firstEverDayMs = rows.length > 0 ? rows[0]!.dayMs : null;
  const cutoffSeries = input.cutoffSeries ?? [];
  const hasHistory = rows.length > 0;

  const windows = {} as Record<TrendWindowId, TrendWindow>;
  for (const spec of TREND_WINDOWS) {
    windows[spec.id] = computeWindow({
      spec,
      rows,
      firstEverDayMs,
      cutoffSeries,
      hasHistory,
      input,
    });
  }

  return {
    windows,
    currentSr: input.currentSr,
    seasonEndMs: input.seasonEndMs ?? null,
  };
}
