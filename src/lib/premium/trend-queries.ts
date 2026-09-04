import { cache } from "react";
import { getViewerProfile } from "@/lib/auth/viewer";
import { getBoardCutoff, type CutoffSource } from "@/lib/data/board-source";
import { liveWzHistoryFor } from "@/lib/data/live-history";
import {
  getActiveSeason,
  getBoardMetrics,
  getCutoffSeries,
  getLiveWzBoard,
} from "@/lib/data/queries";
import type { CutoffPoint } from "@/lib/data/types";
import { parseClimbGoals } from "@/lib/profile/goals";
import type { ClimbTarget } from "@/lib/ranked";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * elovate Pro — trend & goal projection server reads (PREM-03).
 *
 * Server-only, request-cached. No new read surface:
 *   - the cutoff SR, cutoff pace *and cutoff series* all come from the same
 *     public `snapshots` / live-board recipe that `src/app/pro/layout.tsx`
 *     already runs. `liveWzHistoryFor` was already fetching `.series` here and
 *     throwing it away; PREM-03 plots it as the second chart series so "losing
 *     ground" is drawn, not just asserted.
 *   - `profiles.climb_goals` is the viewer's own row (existing self-read).
 *
 * A dead CODMunity API degrades to `{ cutoffSr: null, pacePerDay: null }` — the
 * T250 row then falls back to a static target — never a throw.
 *
 * Coverage caveat: the live snapshot window is ~8 rolling days, so the drawn
 * cutoff history is short even on the Season pace window. When it is empty we
 * fall back to the season's stored `getCutoffSeries` exactly the way
 * `TrackerPage` does. We never synthesise cutoff points to fill the gap.
 */

export type ViewerCutoffContext = {
  cutoffSr: number | null;
  /** The cutoff's own SR/day: 7d average, else season average, else null. */
  pacePerDay: number | null;
  /** Observed cutoff snapshots for the active season. May be short or empty. */
  cutoffSeries: CutoffPoint[];
  seasonEndsAt: string | null;
  source: CutoffSource;
  capturedAt: string | null;
};

const CUTOFF_UNAVAILABLE: ViewerCutoffContext = {
  cutoffSr: null,
  pacePerDay: null,
  cutoffSeries: [],
  seasonEndsAt: null,
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
        cutoffSeries:
          history.series.length > 0
            ? history.series
            : getCutoffSeries("wz", season.id),
        seasonEndsAt: season.endsAt,
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
