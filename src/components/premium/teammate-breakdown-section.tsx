import { getViewerWzHistory } from "@/lib/premium/history-queries";
import { computeTeammateBreakdown } from "@/lib/premium/teammate-breakdown";
import { ProGate } from "./pro-gate";
import { TeammateBreakdown } from "./teammate-breakdown";

/**
 * "Teammates" tab of /pro (PREM-01). Pro sees the full ranked table; everyone
 * else sees the top rows blurred behind <ProGate> with one computed insight.
 *
 * With no teammate games there's nothing to gate — show the empty prompt to
 * everyone rather than teasing an empty table.
 */
export async function TeammateBreakdownSection() {
  const doc = await getViewerWzHistory();
  const breakdown = computeTeammateBreakdown(doc);
  const empty = breakdown.rows.length === 0;

  const preview = { ...breakdown, rows: breakdown.rows.slice(0, 3) };

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted">
          Teammate breakdown
        </h2>
        {!empty && (
          <span className="numeric text-xs text-muted">
            {breakdown.rows.length} tracked · {breakdown.gamesWithTeammates} games
          </span>
        )}
      </div>
      <p className="max-w-prose text-sm text-muted">
        Every teammate you&rsquo;ve logged in WZ, ranked by the SR they earn you.
      </p>

      {empty ? (
        <TeammateBreakdown breakdown={breakdown} />
      ) : (
        <ProGate
          title="elovate Pro"
          insight={breakdown.insight ?? undefined}
          teaser={<TeammateBreakdown breakdown={preview} />}
        >
          <TeammateBreakdown breakdown={breakdown} />
        </ProGate>
      )}
    </section>
  );
}
