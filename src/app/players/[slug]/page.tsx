import { ProfilePageContent } from "@/components/profile/profile-page-content";
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
import { getFriendStatusServer } from "@/lib/friends/server";
import { getProfile } from "@/lib/profile/queries";
import { IRIDESCENT_SR } from "@/lib/ranked";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const viewer = await getViewerProfile();
  const profile = await getProfile(slug, viewer?.id);
  if (!profile) return { title: "Player" };
  if (profile.isPrivate && profile.id !== viewer?.id) {
    const friend =
      viewer && profile.id
        ? await getFriendStatusServer(profile.id)
        : { status: "none" as const };
    if (friend.status !== "friends") {
      return { title: "Private profile" };
    }
  }
  return { title: profile.displayName };
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewer = await getViewerProfile();
  const profile = await getProfile(slug, viewer?.id);
  if (!profile) notFound();

  const canEdit = Boolean(viewer && profile.id && viewer.id === profile.id);
  const friend =
    viewer && profile.id && !canEdit
      ? await getFriendStatusServer(profile.id)
      : { status: "none" as const, requestId: null };

  if (profile.isPrivate && !canEdit && friend.status !== "friends") {
    notFound();
  }

  const season = getActiveSeason();
  const seasons = listSeasons();
  const seedMetrics = getBoardMetrics(profile.mode, season.id);
  const live = profile.mode === "wz" ? await getLiveWzBoard() : null;
  const history = await liveWzHistoryFor(live, season.id);
  const metrics =
    live && seedMetrics
      ? overlayLiveMetrics(seedMetrics, live, history.change24h)
      : seedMetrics;
  const cutoffSr = metrics?.cutoffSr ?? profile.cutoffSr ?? IRIDESCENT_SR;
  const profileWithLive = { ...profile, cutoffSr };

  const firstSr = profileWithLive.series[0]?.cutoffSr;
  const lastSr = profileWithLive.series[profileWithLive.series.length - 1]?.cutoffSr;
  const srDelta =
    firstSr != null && lastSr != null ? lastSr - firstSr : null;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteNav
        mode={profile.mode}
        seasons={seasons}
        seasonId={season.id}
        cutoffSr={cutoffSr}
        nextUpdateAt={live?.nextUpdateAt}
      />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6">
        <ProfilePageContent
          key={`${profile.source}-${profile.slug}`}
          profile={profileWithLive}
          srDelta={srDelta}
          canEdit={canEdit}
          isSignedIn={Boolean(viewer)}
          friendStatus={friend.status}
          friendRequestId={friend.requestId}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
