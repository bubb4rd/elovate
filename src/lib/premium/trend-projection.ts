/**
 * elovate Pro — trend & goal projection analytics (PREM-03).
 *
 * Pure, client-safe. No Supabase / React / `Date.now()` — every entry point
 * takes an explicit `now`. Computes, from the player's own WZ climb history:
 *   - a daily SR trend over a 7d / 30d / season window
 *   - the pace (SR/day) implied by that window and a random-walk variance band
 *   - projected hit dates for three goal cards (Next tier, Iridescent, Live T250)
 *
 * `currentSr` is resolved by the caller as `latest WZ match srAfter ?? profiles.current_sr`
 * and passed in — this module never reaches for it.
 *
 * Read surface: the player's own `climb_matches` only (fed in as a WZ-scoped
 * `HistoryDocument` by `./trend-queries`). The cutoff SR + cutoff pace come from
 * the public `snapshots` read that `/pro/layout` already performs — nothing new.
 *
 * `projectCrossingDays` (moving-target crossing math) is exported standalone and
 * will be reused by PREM-11 — keep it independent of the rest of this module.
 */

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
}[] = [
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "season", label: "Season", days: null },
];

/** The three goal cards, always computed regardless of the player's saved goals. */
const GOAL_TARGETS: ClimbTarget[] = ["nextTier", "iridescent", "top250"];

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

export type TrendWindow = {
  id: TrendWindowId;
  label: string;
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
  goals: GoalProjection[];
};

export type TrendProjection = {
  windows: Record<TrendWindowId, TrendWindow>;
  currentSr: number;
  insight: string | null;
};

export type TrendInput = {
  doc: HistoryDocument;
  now: number;
  currentSr: number;
  cutoff: { sr: number | null; pacePerDay: number | null };
  savedGoals: ClimbTarget[];
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
  const r = Math.round(value);
  return r > 0 ? `+${r}` : `${r}`;
}

const SHORT_DAY = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

function shortDay(ms: number): string {
  return SHORT_DAY.format(new Date(ms));
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

// --- ray -------------------------------------------------------------

function buildRay(
  now: number,
  currentSr: number,
  pacePerDay: number,
  sdDaily: number,
  goalDays: number[],
): TrendRay {
  const maxGoal = goalDays.length > 0 ? Math.max(...goalDays) : 0;
  const horizonDays = Math.min(
    120,
    Math.max(14, Math.ceil(maxGoal * 1.15) || 0),
  );
  const step = horizonDays > 60 ? 2 : 1;
  const points: TrendRayPoint[] = [];
  for (let d = 0; d <= horizonDays; d += step) {
    const projected = currentSr + pacePerDay * d;
    const spread = sdDaily * Math.sqrt(d);
    points.push({
      t: now + d * DAY_MS,
      projected,
      band: [projected - spread, projected + spread],
    });
  }
  const lastD = points[points.length - 1]!.t;
  if (lastD !== now + horizonDays * DAY_MS) {
    const projected = currentSr + pacePerDay * horizonDays;
    const spread = sdDaily * Math.sqrt(horizonDays);
    points.push({
      t: now + horizonDays * DAY_MS,
      projected,
      band: [projected - spread, projected + spread],
    });
  }
  return { pacePerDay, sdDaily, horizonDays, points };
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

// --- window assembly ---------------------------------------------------

function computeWindow(params: {
  spec: (typeof TREND_WINDOWS)[number];
  rows: Row[];
  firstEverDayMs: number | null;
  input: TrendInput;
}): TrendWindow {
  const { spec, rows, firstEverDayMs, input } = params;
  const { now, currentSr, cutoff, savedGoals } = input;

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

  const goalDays = goals
    .map((g) => g.daysToGoal)
    .filter((d): d is number => d != null && d > 0);

  const projection = enoughDays
    ? buildRay(now, currentSr, srPerDay, sdDaily ?? 0, goalDays)
    : null;

  return {
    id: spec.id,
    label: spec.label,
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
  };
}

// --- insight ---------------------------------------------------------

function buildInsight(
  window: TrendWindow,
  hasHistory: boolean,
  currentSr: number,
  cutoff: { sr: number | null; pacePerDay: number | null },
): string | null {
  if (!hasHistory) return null;

  if (window.elapsedDays < MIN_TREND_DAYS || window.projection == null) {
    return `${window.elapsedDays} ${
      window.elapsedDays === 1 ? "day" : "days"
    } logged — Pro projects your goal dates from day ${MIN_TREND_DAYS}.`;
  }

  const pace = window.srPerDay;

  const cutoffOutrunning =
    cutoff.sr != null &&
    cutoff.pacePerDay != null &&
    cutoff.sr - currentSr > 0 &&
    pace <= cutoff.pacePerDay;
  if (cutoffOutrunning && cutoff.pacePerDay != null) {
    const ground = Math.round(cutoff.pacePerDay - pace);
    return `The T250 cutoff is climbing ${signed(
      cutoff.pacePerDay,
    )}/day and you're at ${signed(pace)}/day — you're losing ${ground} SR/day of ground.`;
  }

  const nearest = window.goals
    .filter((g) => g.status === "projected" && g.etaMs != null && g.daysToGoal != null)
    .sort((a, b) => a.daysToGoal! - b.daysToGoal!)[0];
  if (nearest && nearest.etaMs != null) {
    return `You're ${signed(pace)} SR/day over the last ${
      window.elapsedDays
    } days — ${nearest.label} lands around ${shortDay(
      nearest.etaMs,
    )} at this pace.`;
  }

  return `You're ${signed(pace)} SR/day over the last ${
    window.elapsedDays
  } days — Pro shows exactly where that trend lands.`;
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

  const windows = {} as Record<TrendWindowId, TrendWindow>;
  for (const spec of TREND_WINDOWS) {
    windows[spec.id] = computeWindow({ spec, rows, firstEverDayMs, input });
  }

  const insight = buildInsight(
    windows["7d"],
    rows.length > 0,
    input.currentSr,
    input.cutoff,
  );

  return { windows, currentSr: input.currentSr, insight };
}
