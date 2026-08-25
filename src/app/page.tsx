import { CutoffNumeral } from "@/components/cutoff-numeral";
import { HomeCutoffObject } from "@/components/home-cutoff-object";
import { HomeHeroCopy } from "@/components/home-hero-copy";
import { ModePick } from "@/components/mode-pick";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import {
  getCutoff24hSeries,
  getHomeSummary,
  getLiveWzBoard,
  listSeasons,
  overlayLiveCutoffSeries,
  overlayLiveMetrics,
} from "@/lib/data/queries";
import { formatSnapshotTime } from "@/lib/format";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "elovate",
};

export const revalidate = 900;

export default async function Home() {
  const { wz: seedWz, mp, season } = getHomeSummary();
  const live = await getLiveWzBoard();
  const wz = seedWz && live ? overlayLiveMetrics(seedWz, live) : seedWz;
  const seasons = listSeasons();
  const capturedAt = live?.fetchedAt ?? wz?.capturedAt ?? mp?.capturedAt;
  const seedDaily = getCutoff24hSeries("wz", season.id);
  const dailySeries =
    live && wz ? overlayLiveCutoffSeries(seedDaily, live, wz.change24h) : seedDaily;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteNav seasons={seasons} />
      <section className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 items-center gap-10 px-4 pt-16 md:grid-cols-2 md:pt-20">
        <div className="text-right">
          {wz ? (
            <>
              <CutoffNumeral
                sr={wz.cutoffSr}
                change24h={wz.change24h}
                showChange={false}
              />
              {dailySeries.length > 0 ? (
                <HomeCutoffObject series={dailySeries} change24h={wz.change24h} />
              ) : null}
            </>
          ) : (
            <p>No snapshot for this season yet.</p>
          )}
        </div>
        <HomeHeroCopy />
      </section>
      <ModePick mp={mp} wz={wz} />
      <SiteFooter
        freshness={
          capturedAt
            ? live
              ? `Last snapshot ${formatSnapshotTime(capturedAt)}`
              : `Last snapshot ${formatSnapshotTime(capturedAt)}. Sample season data.`
            : "Sample snapshots for this build."
        }
      />
    </div>
  );
}
