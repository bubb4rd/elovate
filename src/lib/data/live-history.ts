import { createAnonSupabaseClient } from "@/lib/supabase/server";
import {
  avgPerDayFromCutoffs,
  finalPushCutoffHistory,
  windowCutoffHistory,
  type StoredCutoff,
} from "./cutoff-window";
import type { CutoffPoint, LiveWzBoard, Mode } from "./types";

export type { StoredCutoff };
export { avgPerDayFromCutoffs, finalPushCutoffHistory, windowCutoffHistory };

export type LiveWzHistory = {
  change24h: number | null;
  series: CutoffPoint[];
  avgPerDaySeason: number | null;
  avgPerDay7d: number | null;
};

const EMPTY_HISTORY: LiveWzHistory = {
  change24h: null,
  series: [],
  avgPerDaySeason: null,
  avgPerDay7d: null,
};

/** ms in 8 days — covers the 7d average window plus a day of margin. */
const RECENT_WINDOW_MS = 8 * 24 * 3_600_000;

/**
 * Recent snapshots only (last 8 days). The `.gte` time filter keeps the row
 * count far below PostgREST's 1000-row response cap, so `ORDER BY captured_at
 * ASC` can no longer silently drop the newest rows. `.limit(1200)` is headroom
 * over the theoretical max (~768 = 8d * 96/day).
 */
export async function getRecentCutoffSnapshots(
  mode: Mode,
  seasonId: string,
): Promise<StoredCutoff[]> {
  const supabase = createAnonSupabaseClient();
  if (!supabase) return [];

  const since = new Date(Date.now() - RECENT_WINDOW_MS).toISOString();

  const { data, error } = await supabase
    .from("snapshots")
    .select("captured_at, cutoff_sr, rank1_sr")
    .eq("mode", mode)
    .eq("season_id", seasonId)
    .gte("captured_at", since)
    .order("captured_at", { ascending: true })
    .limit(1200);

  if (error || !data) return [];

  return data.map((row) => ({
    capturedAt: row.captured_at as string,
    cutoffSr: row.cutoff_sr as number,
    rank1Sr: row.rank1_sr as number,
  }));
}

/**
 * The single oldest snapshot for the season — the season-start anchor for
 * `avgPerDaySeason`. Bounded to one row so it is unaffected by table growth.
 */
export async function getSeasonAnchorCutoff(
  mode: Mode,
  seasonId: string,
): Promise<StoredCutoff | null> {
  const supabase = createAnonSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("snapshots")
    .select("captured_at, cutoff_sr, rank1_sr")
    .eq("mode", mode)
    .eq("season_id", seasonId)
    .order("captured_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    capturedAt: data.captured_at as string,
    cutoffSr: data.cutoff_sr as number,
    rank1Sr: data.rank1_sr as number,
  };
}

/**
 * The single newest snapshot for the season — used as the "last recorded
 * cutoff" when the live board is unavailable, so we never fall back to
 * `generate.ts` seed numbers. Descending + `limit(1)`, so it is unaffected by
 * table growth (WZ-12).
 */
export async function getLatestStoredCutoff(
  mode: Mode,
  seasonId: string,
): Promise<StoredCutoff | null> {
  const supabase = createAnonSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("snapshots")
    .select("captured_at, cutoff_sr, rank1_sr")
    .eq("mode", mode)
    .eq("season_id", seasonId)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    capturedAt: data.captured_at as string,
    cutoffSr: data.cutoff_sr as number,
    rank1Sr: data.rank1_sr as number,
  };
}

/**
 * The newest ~400 snapshots for the season, ascending. Unlike
 * `getRecentCutoffSnapshots` this is not bounded by an 8-day time window, so the
 * frozen-home "final push" view keeps working through the whole off-season. The
 * DESC + `limit(400)` keeps the response well under PostgREST's 1000-row cap
 * while still covering several days of pre-lock movement.
 */
export async function getTailCutoffSnapshots(
  mode: Mode,
  seasonId: string,
  limit = 400,
): Promise<StoredCutoff[]> {
  const supabase = createAnonSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("snapshots")
    .select("captured_at, cutoff_sr, rank1_sr")
    .eq("mode", mode)
    .eq("season_id", seasonId)
    .order("captured_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data
    .map((row) => ({
      capturedAt: row.captured_at as string,
      cutoffSr: row.cutoff_sr as number,
      rank1Sr: row.rank1_sr as number,
    }))
    .reverse();
}

/**
 * The final 24h of real cutoff climbing before the season locked — the "closing
 * scramble" shown on the home page while ranked is frozen. Empty result when
 * there is not a full pre-lock window, so the caller just hides the chart.
 */
export async function finalPushWzHistory(
  seasonId: string,
  hours = 24,
): Promise<{ change24h: number | null; series: CutoffPoint[] }> {
  try {
    const snapshots = await getTailCutoffSnapshots("wz", seasonId);
    return finalPushCutoffHistory(snapshots, hours);
  } catch {
    return { change24h: null, series: [] };
  }
}

export async function liveWzHistoryFor(
  live: LiveWzBoard | null,
  seasonId: string,
): Promise<LiveWzHistory> {
  if (!live) return EMPTY_HISTORY;
  try {
    const [snapshots, anchor] = await Promise.all([
      getRecentCutoffSnapshots("wz", seasonId),
      getSeasonAnchorCutoff("wz", seasonId),
    ]);
    const windowed = windowCutoffHistory(snapshots, {
      fetchedAt: live.fetchedAt,
      cutoffSr: live.cutoffSr,
      rank1Sr: live.rank1Sr,
    });
    const avgs = avgPerDayFromCutoffs(
      snapshots,
      {
        fetchedAt: live.fetchedAt,
        cutoffSr: live.cutoffSr,
      },
      anchor,
    );
    return { ...windowed, ...avgs };
  } catch {
    return EMPTY_HISTORY;
  }
}
