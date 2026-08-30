import { HistoryPageContent } from "@/components/history/history-page-content";
import { ViewerThemeShell } from "@/components/profile/profile-theme-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getViewerProfile } from "@/lib/auth/viewer";
import { liveWzHistoryFor } from "@/lib/data/live-history";
import {
  getActiveSeason,
  getBoardMetrics,
  getLiveWzBoard,
  listSeasons,
  overlayLiveMetrics,
} from "@/lib/data/queries";
import { IRIDESCENT_SR } from "@/lib/ranked";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "History",
};

export default async function HistoryPage() {
  const viewer = await getViewerProfile();
  const season = getActiveSeason();
  const seasons = listSeasons();
  const seedMetrics = getBoardMetrics("wz", season.id);
  const live = await getLiveWzBoard();
  const history = await liveWzHistoryFor(live, season.id);
  const metrics =
    live && seedMetrics
      ? overlayLiveMetrics(seedMetrics, live, history.change24h, {
          avgPerDaySeason: history.avgPerDaySeason,
          avgPerDay7d: history.avgPerDay7d,
        })
      : seedMetrics;
  const cutoffSr = metrics?.cutoffSr ?? IRIDESCENT_SR;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteNav
        mode="wz"
        seasons={seasons}
        seasonId={season.id}
        cutoffSr={cutoffSr}
        nextUpdateAt={live?.nextUpdateAt}
        loginNext="/history"
      />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-7">
        <ViewerThemeShell themeId={viewer?.pageThemeId}>
          <HistoryPageContent signedIn={Boolean(viewer)} />
        </ViewerThemeShell>
      </main>
      <SiteFooter />
    </div>
  );
}
