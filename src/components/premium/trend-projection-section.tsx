import { getViewerProfile } from "@/lib/auth/viewer";
import { nowMs } from "@/lib/premium/clock";
import { getViewerWzHistory } from "@/lib/premium/history-queries";
import {
  getViewerClimbGoals,
  getViewerCutoffContext,
} from "@/lib/premium/trend-queries";
import {
  computeTrendProjection,
  type TrendWindowId,
} from "@/lib/premium/trend-projection";
import { TrendProjectionView } from "./trend-projection";

/**
 * `/pro/trend` (PREM-03). Only reachable by an active Pro subscriber - the
 * route hard-redirects everyone else to the pricing page - so this renders the
 * full product page with no gate and no teaser chrome.
 *
 * All three pace windows are computed server-side so the control is instant.
 * `currentSr` = latest WZ match `srAfter`, falling back to `profiles.current_sr`.
 * The cutoff series is threaded through so the chart can draw the race the hero
 * insight talks about (this is also where PREM-11 lives; there is no second
 * T250 page).
 */
export async function TrendProjectionSection({
  initialWindow,
}: {
  initialWindow: TrendWindowId;
}) {
  const [viewer, doc, cutoff, savedGoals] = await Promise.all([
    getViewerProfile(),
    getViewerWzHistory(),
    getViewerCutoffContext(),
    getViewerClimbGoals(),
  ]);

  const wzMatches = doc.matches.filter((m) => m.mode === "wz");
  const latest = wzMatches[wzMatches.length - 1];
  const currentSr = latest?.srAfter ?? viewer?.currentSr ?? 0;
  const now = nowMs();

  const seasonEndMs = cutoff.seasonEndsAt
    ? Date.parse(cutoff.seasonEndsAt)
    : null;

  const projection = computeTrendProjection({
    doc,
    now,
    currentSr,
    cutoff: { sr: cutoff.cutoffSr, pacePerDay: cutoff.pacePerDay },
    cutoffSeries: cutoff.cutoffSeries.map((point) => ({
      t: Date.parse(point.capturedAt),
      sr: point.cutoffSr,
    })),
    seasonEndMs:
      seasonEndMs != null && Number.isFinite(seasonEndMs) ? seasonEndMs : null,
    savedGoals,
  });

  return (
    <section className="mt-6 space-y-5">
      <div>
        <h1 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-semibold tracking-tight">
          <span className="text-2xl md:text-4xl">Trend</span>
          <span className="text-lg text-muted md:text-2xl">Warzone</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            Pro
          </span>
        </h1>
        <p className="mt-2 max-w-prose text-sm text-muted">
          Your SR, the pace it implies, and where that pace puts each goal. The
          band is a typical range, not a promise.
        </p>
      </div>
      <TrendProjectionView
        projection={projection}
        initialWindow={initialWindow}
        now={now}
        cutoffPaceAvailable={cutoff.pacePerDay != null}
      />
    </section>
  );
}
