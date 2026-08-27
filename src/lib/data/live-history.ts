import { createAnonSupabaseClient } from "@/lib/supabase/server";
import { windowCutoffHistory, type StoredCutoff } from "./cutoff-window";
import type { CutoffPoint, LiveWzBoard, Mode } from "./types";

export type { StoredCutoff };
export { windowCutoffHistory };

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
): Promise<{ change24h: number | null; series: CutoffPoint[] }> {
  if (!live) return { change24h: null, series: [] };
  try {
    const snapshots = await getStoredCutoffSnapshots("wz", seasonId);
    return windowCutoffHistory(snapshots, {
      fetchedAt: live.fetchedAt,
      cutoffSr: live.cutoffSr,
      rank1Sr: live.rank1Sr,
    });
  } catch {
    return { change24h: null, series: [] };
  }
}
