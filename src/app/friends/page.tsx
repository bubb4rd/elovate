import { FriendsSignedIn, FriendsSignedOut } from "@/components/friends/friends-page-content";
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
  title: "Friends",
};

export default async function FriendsPage() {
  const viewer = await getViewerProfile();
  const season = getActiveSeason();
  const seasons = listSeasons();
  const seedMetrics = getBoardMetrics("wz", season.id);
  const live = await getLiveWzBoard();
  const history = await liveWzHistoryFor(live, season.id);
  const metrics =
    live && seedMetrics
      ? overlayLiveMetrics(seedMetrics, live, history.change24h)
      : seedMetrics;
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
          <FriendsSignedIn slug={viewer.slug} displayName={viewer.displayName} />
        ) : (
          <FriendsSignedOut />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
