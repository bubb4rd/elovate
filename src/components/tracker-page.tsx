import { BoardTable } from "@/components/board-table";
import { CutoffChart } from "@/components/cutoff-chart";
import { HeadingMetrics } from "@/components/heading-metrics";
import { RememberMode } from "@/components/remember-mode";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import type { BoardFreshnessStatus } from "@/components/live-status";
import { liveWzHistoryFor } from "@/lib/data/live-history";
import {
  getBoard,
  getBoardMetrics,
  getCutoffSeries,
  getLiveWzBoard,
  getSeason,
  isLiveWzBoard,
  listSeasons,
  overlayLiveMetrics,
} from "@/lib/data/queries";
import type { Mode } from "@/lib/data/types";

export async function TrackerPage({
  mode,
  seasonId,
  boardStatus = "live",
}: {
  mode: Mode;
  seasonId: string;
  boardStatus?: BoardFreshnessStatus;
}) {
  const season = getSeason(seasonId);
  const board = getBoard(mode, seasonId);
  const seedMetrics = getBoardMetrics(mode, seasonId);
  const seedSeries = getCutoffSeries(mode, seasonId);
  const seasons = listSeasons();
  const modeLabel = mode === "wz" ? "Warzone" : "Multiplayer";
  const live =
    season && isLiveWzBoard(mode, seasonId) ? await getLiveWzBoard() : null;
  const history = await liveWzHistoryFor(live, seasonId);
  const liveOnlySeries =
    live != null
      ? [
          {
            capturedAt: live.fetchedAt,
            cutoffSr: live.cutoffSr,
            rank1Sr: live.rank1Sr,
            deltaCutoff: null,
          },
        ]
      : [];
  const series =
    history.series.length > 0
      ? history.series
      : live
        ? liveOnlySeries
        : seedSeries;
  const rows = live?.rows ?? board?.rows;
  const metrics =
    live && seedMetrics
      ? overlayLiveMetrics(seedMetrics, live, history.change24h)
      : seedMetrics;
  const capturedAt = live?.fetchedAt ?? metrics?.capturedAt;

  if (!season || !board || !metrics || !rows) {
    return (
      <div className="flex min-h-[100dvh] flex-col">
        <SiteNav mode={mode} seasons={seasons} seasonId={seasonId} tool="board" />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-7 py-10">
          <p>No snapshot for this season yet.</p>
        </main>
        <SiteFooter calcHref={`/${mode}/calc`} className="px-7" />
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-background lg:fixed lg:inset-0 lg:overflow-hidden">
      <RememberMode mode={mode} />
      <SiteNav
        mode={mode}
        seasons={seasons}
        seasonId={seasonId}
        tool="board"
      />
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-7 py-4 lg:min-h-0">
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-semibold tracking-tight">
            <span className="accent-glow bg-linear-to-r from-geebung-600 to-geebung-500 bg-clip-text text-4xl text-transparent md:text-5xl">
              Top 250
            </span>
            <span className="text-2xl text-muted">{modeLabel}</span>
          </h1>
          <HeadingMetrics metrics={metrics} showCutoff={false} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)] lg:grid-rows-1 lg:gap-10 lg:overflow-hidden">
          <div className="order-2 min-h-0 lg:order-none lg:h-full lg:overflow-hidden">
            <BoardTable rows={rows} linkPlayers={false} />
          </div>

          <aside className="order-1 h-52 min-h-0 lg:order-none lg:h-full lg:overflow-hidden">
            <CutoffChart
              series={series}
              liveCutoffSr={metrics.cutoffSr}
              nextUpdateAt={live?.nextUpdateAt}
              boardStatus={boardStatus}
            />
          </aside>
        </div>
      </main>
      <SiteFooter
        calcHref={`/${mode}/calc`}
        capturedAt={capturedAt ?? metrics.capturedAt}
        className="px-7 py-8 lg:py-3"
      />
    </div>
  );
}
