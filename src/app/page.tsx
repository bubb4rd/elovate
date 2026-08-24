import { CutoffChart } from "@/components/cutoff-chart";
import { CutoffNumeral } from "@/components/cutoff-numeral";
import { ModePick } from "@/components/mode-pick";
import { OpenBoardLink } from "@/components/open-board-link";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getHomeSummary, listSeasons } from "@/lib/data/queries";
import { formatSnapshotTime } from "@/lib/format";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "elovate",
};

export default function Home() {
  const { wz, mp, wzSeries } = getHomeSummary();
  const seasons = listSeasons();
  const capturedAt = wz?.capturedAt ?? mp?.capturedAt;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteNav seasons={seasons} />
      <section className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 items-center gap-10 px-4 pt-16 md:grid-cols-2 md:pt-20">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            Top 250 cutoff
          </p>
          <h1 className="mt-4 max-w-[14ch] text-4xl font-semibold tracking-tighter text-foreground md:text-5xl lg:text-6xl">
            The SR line that keeps moving
          </h1>
          <p className="mt-4 max-w-[36ch] text-base leading-relaxed text-muted">
            Live Top 250 for Ranked Multiplayer and Warzone. Cutoff, daily drift, full board.
          </p>
          <div className="mt-8">
            <OpenBoardLink />
          </div>
        </div>
        <div>
          {wz ? (
            <>
              <CutoffNumeral sr={wz.cutoffSr} change24h={wz.change24h} />
              <div className="mt-8">
                <CutoffChart series={wzSeries} height={160} showRank1={false} />
              </div>
            </>
          ) : (
            <p>No snapshot for this season yet.</p>
          )}
        </div>
      </section>
      <ModePick mp={mp} wz={wz} />
      <SiteFooter
        freshness={
          capturedAt
            ? `Last snapshot ${formatSnapshotTime(capturedAt)}. Sample season data.`
            : "Sample snapshots for this build."
        }
      />
    </div>
  );
}
