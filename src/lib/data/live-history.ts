import { createAnonSupabaseClient } from "@/lib/supabase/server";
import {
  avgPerDayFromCutoffs,
  windowCutoffHistory,
  type StoredCutoff,
} from "./cutoff-window";
import type { CutoffPoint, LiveWzBoard, Mode } from "./types";

export type { StoredCutoff };
export { avgPerDayFromCutoffs, windowCutoffHistory };

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

export async function getStoredCutoffSnapshots(
  mode: Mode,
  seasonId: string,
): Promise<StoredCutoff[]> {
  const supabase = createAnonSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("snapshots")
    .select("captured_at, cutoff_sr, rank1_sr")
    .eq("mode", mode)
    .eq("season_id", seasonId)
    .order("captured_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    capturedAt: row.captured_at as string,
    cutoffSr: row.cutoff_sr as number,
    rank1Sr: row.rank1_sr as number,
  }));
}

export async function liveWzHistoryFor(
  live: LiveWzBoard | null,
  seasonId: string,
): Promise<LiveWzHistory> {
  if (!live) return EMPTY_HISTORY;
  try {
    const snapshots = await getStoredCutoffSnapshots("wz", seasonId);
    const windowed = windowCutoffHistory(snapshots, {
      fetchedAt: live.fetchedAt,
      cutoffSr: live.cutoffSr,
      rank1Sr: live.rank1Sr,
    });
    const avgs = avgPerDayFromCutoffs(snapshots, {
      fetchedAt: live.fetchedAt,
      cutoffSr: live.cutoffSr,
    });
    return { ...windowed, ...avgs };
  } catch {
    return EMPTY_HISTORY;
  }
}
