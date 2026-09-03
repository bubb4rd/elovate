import { getViewerProfile } from "@/lib/auth/viewer";
import { formatSr } from "@/lib/format";
import { nowMs } from "@/lib/premium/clock";
import { getViewerWzHistory } from "@/lib/premium/history-queries";
import {
  getViewerClimbGoals,
  getViewerCutoffContext,
} from "@/lib/premium/trend-queries";
import { computeTrendProjection } from "@/lib/premium/trend-projection";
import { TrendProjectionView } from "./trend-projection";

/**
 * "Trend" tab of /pro (PREM-03). Only reachable by an active Pro subscriber —
 * `/pro/trend` hard-redirects everyone else to the pricing page — so this
 * renders the full projection with no gate.
 *
 * All three windows are computed server-side so the client toggle is instant.
 * `currentSr` = latest WZ match `srAfter`, falling back to `profiles.current_sr`.
 */
export async function TrendProjectionSection() {
  const [viewer, doc, cutoff, savedGoals] = await Promise.all([
    getViewerProfile(),
    getViewerWzHistory(),
    getViewerCutoffContext(),
    getViewerClimbGoals(),
  ]);

  const wzMatches = doc.matches.filter((m) => m.mode === "wz");
  const latest = wzMatches[wzMatches.length - 1];
  const currentSr = latest?.srAfter ?? viewer?.currentSr ?? 0;

  const projection = computeTrendProjection({
    doc,
    now: nowMs(),
    currentSr,
    cutoff: { sr: cutoff.cutoffSr, pacePerDay: cutoff.pacePerDay },
    savedGoals,
  });

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted">
          Trend &amp; goal projection
        </h2>
        <span className="numeric text-xs text-muted">
          {formatSr(currentSr)} SR
        </span>
      </div>
      <p className="max-w-prose text-sm text-muted">
        Your WZ SR over time, the pace it implies, and where that pace puts each
        goal &mdash; with a typical range around the projection, never a promise.
      </p>
      <TrendProjectionView
        projection={projection}
        cutoffPaceAvailable={cutoff.pacePerDay != null}
      />
    </section>
  );
}
