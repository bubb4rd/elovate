import { cache } from "react";
import { getViewerProfile } from "@/lib/auth/viewer";
import { getBoardCutoff, type CutoffSource } from "@/lib/data/board-source";
import { liveWzHistoryFor } from "@/lib/data/live-history";
import {
  getActiveSeason,
  getBoardMetrics,
  getLiveWzBoard,
} from "@/lib/data/queries";
import { parseClimbGoals } from "@/lib/profile/goals";
import type { ClimbTarget } from "@/lib/ranked";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * elovate Pro — trend & goal projection server reads (PREM-03).
 *
 * Server-only, request-cached. No new read surface:
 *   - the cutoff SR + cutoff pace come from the same public `snapshots` /
 *     live-board recipe that `src/app/pro/layout.tsx` already runs;
 *   - `profiles.climb_goals` is the viewer's own row (existing self-read).
 *
 * A dead CODMunity API degrades to `{ cutoffSr: null, pacePerDay: null }` — the
 * T250 card then falls back to a static target — never a throw.
 */

export type ViewerCutoffContext = {
  cutoffSr: number | null;
  /** The cutoff's own SR/day: 7d average, else season average, else null. */
  pacePerDay: number | null;
  source: CutoffSource;
  capturedAt: string | null;
};

const CUTOFF_UNAVAILABLE: ViewerCutoffContext = {
  cutoffSr: null,
  pacePerDay: null,
  source: "none",
  capturedAt: null,
};

/** The live/stored Top 250 cutoff plus the pace at which that line is moving. */
export const getViewerCutoffContext = cache(
  async (): Promise<ViewerCutoffContext> => {
    try {
      const season = getActiveSeason();
      const seed = getBoardMetrics("wz", season.id);
      const live = await getLiveWzBoard();
      const history = await liveWzHistoryFor(live, season.id);
      const { resolved, metrics } = await getBoardCutoff({
        mode: "wz",
        seasonId: season.id,
        live,
        seed,
        history,
      });
      return {
        cutoffSr: metrics?.cutoffSr ?? resolved.cutoffSr ?? null,
        pacePerDay: history.avgPerDay7d ?? history.avgPerDaySeason ?? null,
        source: resolved.source,
        capturedAt: resolved.capturedAt,
      };
    } catch {
      return CUTOFF_UNAVAILABLE;
    }
  },
);

/** The viewer's saved climb goals (`profiles.climb_goals`), `[]` on any error. */
export const getViewerClimbGoals = cache(async (): Promise<ClimbTarget[]> => {
  try {
    const viewer = await getViewerProfile();
    if (!viewer) return [];
    const supabase = await createServerSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("profiles")
      .select("climb_goals")
      .eq("id", viewer.id)
      .maybeSingle();

    if (error || !data) return [];
    return parseClimbGoals(data.climb_goals);
  } catch {
    return [];
  }
});
