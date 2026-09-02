import { RememberMode } from "@/components/remember-mode";
import { ViewerThemeShell } from "@/components/profile/profile-theme-provider";
import { getViewerProfile } from "@/lib/auth/viewer";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { SrCalculator } from "@/components/sr-calculator";
import { liveWzHistoryFor } from "@/lib/data/live-history";
import {
  getActiveSeason,
  getBoardLadder,
  getBoardMetrics,
  getLiveWzBoard,
  listSeasons,
  overlayLiveMetrics,
} from "@/lib/data/queries";
import { IRIDESCENT_SR } from "@/lib/ranked";
import type { Mode } from "@/lib/data/types";

export async function CalcPage({ mode }: { mode: Mode }) {
  const season = getActiveSeason();
  const seedMetrics = getBoardMetrics(mode, season.id);
  const seasons = listSeasons();
  const live = mode === "wz" ? await getLiveWzBoard() : null;
  const history = await liveWzHistoryFor(live, season.id);
  const metrics =
    live && seedMetrics
      ? overlayLiveMetrics(seedMetrics, live, history.change24h, {
          avgPerDaySeason: history.avgPerDaySeason,
          avgPerDay7d: history.avgPerDay7d,
        })
      : seedMetrics;
  const cutoffSr = metrics?.cutoffSr ?? IRIDESCENT_SR;
  const ladder = live?.ladder ?? getBoardLadder(mode, season.id);
  const viewer = await getViewerProfile();
  const calcHref = `/${mode}/calc`;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <RememberMode mode={mode} />
      <SiteNav
        mode={mode}
        seasons={seasons}
        tool="calc"
        cutoffSr={cutoffSr}
        nextUpdateAt={live?.nextUpdateAt}
        loginNext={calcHref}
      />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5">
        <ViewerThemeShell themeId={viewer?.pageThemeId}>
          <SrCalculator
            mode={mode}
            cutoffSr={cutoffSr}
            ladder={ladder}
            signedIn={viewer != null}
            profileSr={viewer?.currentSr ?? null}
            viewer={
              viewer
                ? {
                    id: viewer.id,
                    slug: viewer.slug,
                    displayName: viewer.displayName,
                  }
                : null
            }
          />
        </ViewerThemeShell>
      </main>
      <SiteFooter />
    </div>
  );
}
