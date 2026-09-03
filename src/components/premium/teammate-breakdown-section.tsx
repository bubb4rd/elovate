import { getViewerWzHistory } from "@/lib/premium/history-queries";
import { computeTeammateBreakdown } from "@/lib/premium/teammate-breakdown";
import { TeammateBreakdown } from "./teammate-breakdown";

/**
 * "Teammates" tab of /pro (PREM-01). Only reachable by an active Pro
 * subscriber — `/pro/teammates` hard-redirects everyone else to the pricing
 * page — so this renders the full ranked table with no gate.
 */
export async function TeammateBreakdownSection() {
  const doc = await getViewerWzHistory();
  const breakdown = computeTeammateBreakdown(doc);

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted">
          Teammate breakdown
        </h2>
        {breakdown.rows.length > 0 && (
          <span className="numeric text-xs text-muted">
            {breakdown.rows.length} tracked · {breakdown.gamesWithTeammates} games
          </span>
        )}
      </div>
      <p className="max-w-prose text-sm text-muted">
        Every teammate you&rsquo;ve logged in WZ, ranked by the SR they earn you.
      </p>
      <TeammateBreakdown breakdown={breakdown} />
    </section>
  );
}
