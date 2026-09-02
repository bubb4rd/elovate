import { FriendsSignedIn, FriendsSignedOut } from "@/components/friends/friends-page-content";
import { ViewerThemeShell } from "@/components/profile/profile-theme-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getViewerProfile } from "@/lib/auth/viewer";
import { getBoardCutoff } from "@/lib/data/board-source";
import { liveWzHistoryFor } from "@/lib/data/live-history";
import {
  getActiveSeason,
  getBoardMetrics,
  getLiveWzBoard,
  listSeasons,
} from "@/lib/data/queries";
import { IRIDESCENT_SR } from "@/lib/ranked";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Friends",
};

export default async function FriendsPage() {
  const viewer = await getViewerProfile();
  const season = getActiveSeason();
  const seasons = listSeasons();
  const seedMetrics = getBoardMetrics("wz", season.id);
  const live = await getLiveWzBoard();
  const history = await liveWzHistoryFor(live, season.id);
  const { metrics } = await getBoardCutoff({
    mode: "wz",
    seasonId: season.id,
    live,
    seed: seedMetrics,
    history,
  });
  const cutoffSr = metrics?.cutoffSr ?? IRIDESCENT_SR;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteNav
        mode="wz"
        seasons={seasons}
        seasonId={season.id}
        tool="friends"
        cutoffSr={cutoffSr}
        nextUpdateAt={live?.nextUpdateAt}
        loginNext="/friends"
      />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-7">
        {viewer ? (
          <ViewerThemeShell themeId={viewer.pageThemeId}>
            <FriendsSignedIn slug={viewer.slug} displayName={viewer.displayName} />
          </ViewerThemeShell>
        ) : (
          <FriendsSignedOut />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
