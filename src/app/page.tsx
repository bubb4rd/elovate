import { CutoffNumeral } from "@/components/cutoff-numeral";
import { DesktopHomeTeaser } from "@/components/desktop-home-teaser";
import { HomeCutoffObject } from "@/components/home-cutoff-object";
import { HomeHeroCopy } from "@/components/home-hero-copy";
import { HomeProCta } from "@/components/home-pro-cta";
import { HomeSignalsMarquee } from "@/components/home-signals-marquee";
import { ModePick } from "@/components/mode-pick";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getBoardCutoff } from "@/lib/data/board-source";
import { liveWzHistoryFor } from "@/lib/data/live-history";
import { getHomeSummary, getLiveWzBoard, listSeasons } from "@/lib/data/queries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "elovate",
};

export const revalidate = 900;

export default async function Home() {
  const { wz: seedWz, mp, season } = getHomeSummary();
  const live = await getLiveWzBoard();
  const history = await liveWzHistoryFor(live, season.id);
  const { resolved, metrics: wz } = await getBoardCutoff({
    mode: "wz",
    seasonId: season.id,
    live,
    seed: seedWz,
    history,
  });
  const seasons = listSeasons();
  const dailySeries = history.change24h != null ? history.series : [];

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteNav seasons={seasons} />
      <section className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 items-center gap-10 px-4 pt-16 pb-12 md:grid-cols-2 md:pt-20 md:pb-0">
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
              {resolved.source === "stored" ? (
                <p className="mt-3 text-sm text-muted">
                  Live standings unavailable. Showing the last recorded cutoff.
                </p>
              ) : null}
            </>
          ) : (
            <p>No snapshot for this season yet.</p>
          )}
        </div>
        <HomeHeroCopy />
      </section>
      <HomeSignalsMarquee />
      <HomeProCta />
      <ModePick mp={mp} wz={wz} />
      <DesktopHomeTeaser />
      <SiteFooter />
    </div>
  );
}
