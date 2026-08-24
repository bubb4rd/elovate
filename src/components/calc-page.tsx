import { RememberMode } from "@/components/remember-mode";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { SrCalculator } from "@/components/sr-calculator";
import { getActiveSeason, getBoardLadder, getBoardMetrics, listSeasons } from "@/lib/data/queries";
import { formatSnapshotTime } from "@/lib/format";
import { IRIDESCENT_SR } from "@/lib/ranked";
import type { Mode } from "@/lib/data/types";

export function CalcPage({ mode }: { mode: Mode }) {
  const season = getActiveSeason();
  const metrics = getBoardMetrics(mode, season.id);
  const seasons = listSeasons();
  const cutoffSr = metrics?.cutoffSr ?? IRIDESCENT_SR;
  const ladder = getBoardLadder(mode, season.id);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <RememberMode mode={mode} />
      <SiteNav mode={mode} seasons={seasons} tool="calc" />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5">
        <SrCalculator mode={mode} cutoffSr={cutoffSr} ladder={ladder} />
      </main>
      <SiteFooter
        calcHref={`/${mode}/calc`}
        freshness={
          metrics
            ? `Last snapshot ${formatSnapshotTime(metrics.capturedAt)}`
            : undefined
        }
      />
    </div>
  );
}
