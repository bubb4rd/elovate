import { getViewerWzHistory } from "@/lib/premium/history-queries";
import { computeTeammateBreakdown } from "@/lib/premium/teammate-breakdown";
import { ProGate } from "./pro-gate";
import { TeammateBreakdown } from "./teammate-breakdown";

/**
 * "Teammates" section on /history (PREM-01). Pro sees the full ranked table;
 * everyone else sees the top rows blurred with one computed insight line.
 *
 * Renders nothing when the player has logged no games with named teammates —
 * an empty teaser converts worse than no teaser.
 */
export async function TeammateBreakdownSection() {
  const doc = await getViewerWzHistory();
  const breakdown = computeTeammateBreakdown(doc);
  if (breakdown.rows.length === 0) return null;

  const preview = { ...breakdown, rows: breakdown.rows.slice(0, 3) };

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted">
          Teammates
        </h2>
        <span className="numeric text-xs text-muted">
          {breakdown.rows.length} tracked · {breakdown.gamesWithTeammates} games
        </span>
      </div>
      <ProGate
        title="Teammate breakdown"
        insight={breakdown.insight ?? undefined}
        teaser={<TeammateBreakdown breakdown={preview} />}
      >
        <TeammateBreakdown breakdown={breakdown} />
      </ProGate>
    </section>
  );
}
