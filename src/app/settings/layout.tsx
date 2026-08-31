import { SettingsChrome } from "@/components/settings/settings-actions";
import { SettingsNav } from "@/components/settings/settings-nav";
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
  title: "Settings",
};

export default async function SettingsLayout({ children }: LayoutProps<"/settings">) {
  // The per-tab pages own the auth/onboarding redirect via requireAccountSettings(),
  // because they know which tab to return to after login. getViewerProfile() is
  // cache()d, so this call is free — we only use it to skip the live board work
  // (and fall back to the static cutoff) when there's no usable viewer yet.
  const viewer = await getViewerProfile();
  const ready = viewer != null && viewer.onboardingComplete;

  const season = getActiveSeason();
  const seasons = listSeasons();

  let cutoffSr = IRIDESCENT_SR;
  let live: Awaited<ReturnType<typeof getLiveWzBoard>> | null = null;

  if (ready) {
    const seedMetrics = getBoardMetrics("wz", season.id);
    live = await getLiveWzBoard();
    const history = await liveWzHistoryFor(live, season.id);
    const metrics =
      live && seedMetrics
        ? overlayLiveMetrics(seedMetrics, live, history.change24h, {
            avgPerDaySeason: history.avgPerDaySeason,
            avgPerDay7d: history.avgPerDay7d,
          })
        : seedMetrics;
    cutoffSr = metrics?.cutoffSr ?? IRIDESCENT_SR;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteNav
        seasons={seasons}
        loginNext="/settings"
        cutoffSr={cutoffSr}
        nextUpdateAt={live?.nextUpdateAt}
      />
      <main className="mx-auto w-full max-w-[880px] flex-1 px-4 py-10">
        <SettingsChrome>
          <SettingsNav />
          <div className="mt-8 min-w-0">{children}</div>
        </SettingsChrome>
      </main>
      <SiteFooter />
    </div>
  );
}
