import { RememberMode } from "@/components/remember-mode";
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
import { formatSnapshotTime } from "@/lib/format";
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
      ? overlayLiveMetrics(seedMetrics, live, history.change24h)
      : seedMetrics;
  const cutoffSr = metrics?.cutoffSr ?? IRIDESCENT_SR;
  const ladder = live?.ladder ?? getBoardLadder(mode, season.id);
  const capturedAt = live?.fetchedAt ?? metrics?.capturedAt;
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
        <SrCalculator
          mode={mode}
          cutoffSr={cutoffSr}
          ladder={ladder}
          signedIn={viewer != null}
          viewer={
            viewer
              ? { slug: viewer.slug, displayName: viewer.displayName }
              : null
          }
        />
      </main>
      <SiteFooter
        calcHref={`/${mode}/calc`}
        freshness={
          capturedAt ? `Last snapshot ${formatSnapshotTime(capturedAt)}` : undefined
        }
      />
    </div>
  );
}
