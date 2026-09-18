import { BoardTable } from "@/components/board-table";
import { CutoffChart } from "@/components/cutoff-chart";
import { CutoffNumeral } from "@/components/cutoff-numeral";
import { EmptyState } from "@/components/empty-state";
import { HeadingMetrics } from "@/components/heading-metrics";
import { BoardPodiumIcon } from "@/components/icons";
import { RankedRampBalls } from "@/components/ranked-ramp-balls";
import { RememberMode } from "@/components/remember-mode";
import { ViewerThemeShell } from "@/components/profile/profile-theme-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import type { BoardFreshnessStatus } from "@/components/live-status";
import { getViewerProfile } from "@/lib/auth/viewer";
import { getBoardCutoff, resolveBoardRows } from "@/lib/data/board-source";
import { getLiveIridescentCount } from "@/lib/data/codmunity";
import { IRIDESCENT_SR } from "@/lib/ranked";
import {
  finalPushWzHistory,
  getLatestStoredCutoff,
  liveWzHistoryFor,
} from "@/lib/data/live-history";
import {
  boardStatusForPhase,
  getActiveSeasonPhase,
  pendingSeasonCopy,
  seasonPhaseCopy,
} from "@/lib/data/season-phase";
import {
  getBoard,
  getBoardMetrics,
  getCutoffSeries,
  getLiveWzBoard,
  getPreviousSeason,
  getSeason,
  isLiveWzBoard,
  listSeasons,
} from "@/lib/data/queries";
import type { BoardMetrics, Mode } from "@/lib/data/types";

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
  const isLiveBoard = season != null && isLiveWzBoard(mode, seasonId);
  const live = isLiveBoard ? await getLiveWzBoard() : null;
  const history = await liveWzHistoryFor(live, seasonId);
  const { resolved, metrics: liveMetrics } = await getBoardCutoff({
    mode,
    seasonId,
    live,
    seed: seedMetrics,
    history,
  });

  // Season phase is orthogonal to `season.isActive` (that flag stays true through
  // the off-season). Only the live season's board reflects the phase; archived
  // boards keep whatever status the caller passed.
  const phaseInfo = await getActiveSeasonPhase();
  const isActiveSeason = season?.isActive === true && mode === "wz";

  // A season can roll over before CODMunity has a reliable Top 250 for it —
  // regular_season is "live" by phase, but there's nothing to show yet. Fall
  // back to the previous season's real final cutoff/chart rather than a blank
  // page until this one reports (WZ-12: never fabricate the active season's
  // numbers, so the fallback has to be another season's real recorded data).
  const pending = isActiveSeason && phaseInfo.phase === "regular_season" && !liveMetrics;
  const previousSeason = pending ? getPreviousSeason() : undefined;
  // Day-zero ramp-up: while pending, prefer a real live headcount of players
  // above Iridescent SR (however small — see getLiveIridescentCount) over the
  // previous-season fallback, matching the homepage's hero treatment.
  const [previousStored, previousFinalPush, rampCount] = pending
    ? await Promise.all([
        previousSeason ? getLatestStoredCutoff("wz", previousSeason.id) : Promise.resolve(null),
        previousSeason ? finalPushWzHistory(previousSeason.id) : Promise.resolve(null),
        getLiveIridescentCount(),
      ])
    : [null, null, null];
  const showRamp = pending && rampCount != null;

  const metrics: BoardMetrics | null = showRamp
    ? {
        cutoffSr: rampCount!,
        change24h: null,
        avgPerDaySeason: null,
        avgPerDay7d: null,
        playersSampled: rampCount!,
        capturedAt: new Date().toISOString(),
      }
    : pending && previousStored
      ? {
          cutoffSr: previousStored.cutoffSr,
          change24h: previousFinalPush?.change24h ?? null,
          avgPerDaySeason: null,
          avgPerDay7d: null,
          playersSampled: seedMetrics?.playersSampled ?? 250,
          capturedAt: previousStored.capturedAt,
        }
      : liveMetrics;

  const pointSeries =
    resolved.source === "live" && resolved.live
      ? [
          {
            capturedAt: resolved.live.fetchedAt,
            cutoffSr: resolved.live.cutoffSr,
            rank1Sr: resolved.live.rank1Sr,
            deltaCutoff: null,
          },
        ]
      : resolved.source === "stored" && resolved.stored
        ? [
            {
              capturedAt: resolved.stored.capturedAt,
              cutoffSr: resolved.stored.cutoffSr,
              rank1Sr: resolved.stored.rank1Sr,
              deltaCutoff: null,
            },
          ]
        : [];
  const series =
    pending && previousFinalPush
      ? previousFinalPush.series
      : history.series.length > 0
        ? history.series
        : isLiveBoard
          ? pointSeries
          : seedSeries;
  // No real per-player roster exists for a previous season's exact final
  // moment (only the aggregate cutoff/rank1 line is persisted — see WZ-12),
  // so pending keeps the roster empty rather than guessing at rows.
  const rows = pending ? null : resolveBoardRows(live?.rows, board?.rows, isLiveBoard);
  const viewer = await getViewerProfile();

  const resolvedBoardStatus: BoardFreshnessStatus = isActiveSeason
    ? pending
      ? "pending"
      : boardStatusForPhase(phaseInfo.phase)
    : boardStatus;
  const phaseNotice =
    pending && previousSeason
      ? pendingSeasonCopy(phaseInfo.seasonName, previousSeason.name)
      : isActiveSeason && resolvedBoardStatus === "frozen"
        ? seasonPhaseCopy(
            phaseInfo.phase,
            phaseInfo.seasonName,
            phaseInfo.phaseEndsAt,
          )
        : null;
  // The Top 250 cutoff can never fall below the Iridescent floor (10k) — a
  // season that hasn't produced a real cutoff yet (or whose "cutoff" is
  // actually the day-zero ramp headcount) still has a known floor to show,
  // same fallback every other nav on the site already uses.
  const navCutoffSr = showRamp ? IRIDESCENT_SR : (metrics?.cutoffSr ?? IRIDESCENT_SR);

  if (!season || (!isLiveBoard && !board) || !metrics) {
    return (
      <div className="flex min-h-[100dvh] flex-col">
        <SiteNav
          mode={mode}
          seasons={seasons}
          seasonId={seasonId}
          tool="board"
          boardStatus={resolvedBoardStatus}
          cutoffSr={navCutoffSr}
        />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-7 py-10">
          <EmptyState
            icon={<BoardPodiumIcon className="size-6" />}
            label="No snapshot for this season yet."
          />
        </main>
        <SiteFooter className="px-7" />
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
        boardStatus={resolvedBoardStatus}
        cutoffSr={navCutoffSr}
        nextUpdateAt={live?.nextUpdateAt}
      />
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-7 py-4 lg:min-h-0">
        <ViewerThemeShell themeId={viewer?.pageThemeId}>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-semibold tracking-tight">
              <span className="accent-glow theme-heading text-4xl md:text-5xl">
                Top 250
              </span>
              <span className="text-2xl text-muted">{modeLabel}</span>
            </h1>
            <HeadingMetrics metrics={metrics} showCutoff={false} />
          </div>
          {phaseNotice ? (
            <p className="mt-2 shrink-0 text-sm text-muted">
              {phaseNotice.detail}
            </p>
          ) : null}
          {resolved.source === "stored" ? (
            <p className="mt-2 shrink-0 text-sm text-muted">
              Live standings unavailable. Showing the last recorded cutoff.
            </p>
          ) : null}
          <div className="mt-4 grid grid-cols-1 gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)] lg:grid-rows-1 lg:gap-10 lg:overflow-hidden">
            <div className="order-2 min-h-0 lg:order-none lg:h-full lg:overflow-hidden">
              {showRamp ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 overflow-hidden px-4 text-center">
                  <CutoffNumeral
                    sr={rampCount!}
                    change24h={null}
                    label="in Top 250 so far this season"
                    size="panel"
                    showChange={false}
                  />
                  <RankedRampBalls count={rampCount!} height={220} />
                </div>
              ) : rows ? (
                <BoardTable rows={rows} linkPlayers={false} />
              ) : (
                <EmptyState
                  icon={<BoardPodiumIcon className="size-6" />}
                  label={
                    pending
                      ? `${phaseInfo.seasonName} standings return once this season starts reporting.`
                      : phaseNotice
                        ? `The ${phaseInfo.seasonName} final Top 250 returns when the feed responds.`
                        : "The player standings return when the live feed is back."
                  }
                />
              )}
            </div>

            <aside className="order-1 h-52 min-h-0 lg:order-none lg:h-full lg:overflow-hidden">
              <CutoffChart
                series={series}
                liveCutoffSr={showRamp ? undefined : metrics.cutoffSr}
                nextUpdateAt={live?.nextUpdateAt}
                boardStatus={resolvedBoardStatus}
              />
            </aside>
          </div>
        </ViewerThemeShell>
      </main>
      <SiteFooter className="px-7 py-8 lg:py-3" />
    </div>
  );
}
