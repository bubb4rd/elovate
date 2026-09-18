import { CutoffNumeral } from "@/components/cutoff-numeral";
import { DesktopHomeTeaser } from "@/components/desktop-home-teaser";
import { HomeCutoffObject } from "@/components/home-cutoff-object";
import { HomeHeroCopy } from "@/components/home-hero-copy";
import { ModePick } from "@/components/mode-pick";
import { RankedRampBalls } from "@/components/ranked-ramp-balls";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getBoardCutoff } from "@/lib/data/board-source";
import { getLiveIridescentCount } from "@/lib/data/codmunity";
import {
  finalPushWzHistory,
  getLatestStoredCutoff,
  liveWzHistoryFor,
} from "@/lib/data/live-history";
import {
  getHomeSummary,
  getLiveWzBoard,
  getPreviousSeason,
  listSeasons,
} from "@/lib/data/queries";
import {
  boardStatusForPhase,
  getActiveSeasonPhase,
  pendingSeasonCopy,
  seasonPhaseCopy,
} from "@/lib/data/season-phase";
import { IRIDESCENT_SR } from "@/lib/ranked";
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
  const phaseInfo = await getActiveSeasonPhase();
  const frozen = boardStatusForPhase(phaseInfo.phase) === "frozen";
  // A season can roll over before CODMunity has a reliable Top 250 for it —
  // regular_season is "live" by phase, but there's nothing to show yet. Fall
  // back to the previous season's real final cutoff/chart rather than a blank
  // hero until this one reports (WZ-12: never fabricate the active season's
  // numbers, so the fallback has to be another season's real recorded data).
  const pending = !frozen && !wz;
  const previousSeason = pending ? getPreviousSeason() : undefined;
  // Day-zero ramp-up: while pending, prefer a real live headcount of players
  // above Iridescent SR (however small — see getLiveIridescentCount) over the
  // previous-season fallback. Fall back further to previous-season data only
  // if CODMunity is fully unreachable (rampCount stays null).
  const [previousStored, finalPush, rampCount] = pending
    ? await Promise.all([
        previousSeason ? getLatestStoredCutoff("wz", previousSeason.id) : Promise.resolve(null),
        previousSeason ? finalPushWzHistory(previousSeason.id) : Promise.resolve(null),
        getLiveIridescentCount(),
      ])
    : [null, frozen ? await finalPushWzHistory(season.id) : null, null];
  const showRamp = pending && rampCount != null;

  const displayWz =
    pending && previousStored
      ? {
          cutoffSr: previousStored.cutoffSr,
          change24h: finalPush?.change24h ?? null,
          avgPerDaySeason: null,
          avgPerDay7d: null,
          playersSampled: seedWz?.playersSampled ?? 250,
          capturedAt: previousStored.capturedAt,
        }
      : wz;

  const phaseNotice = frozen
    ? seasonPhaseCopy(phaseInfo.phase, phaseInfo.seasonName, phaseInfo.phaseEndsAt)
    : pending && !showRamp && previousSeason
      ? pendingSeasonCopy(phaseInfo.seasonName, previousSeason.name)
      : null;
  const dailySeries =
    frozen || (pending && !showRamp)
      ? (finalPush?.series ?? [])
      : history.change24h != null
        ? history.series
        : [];
  const dailyChange =
    frozen || (pending && !showRamp) ? (finalPush?.change24h ?? null) : (wz?.change24h ?? null);
  const wzNoteSeasonName = pending && previousSeason ? previousSeason.name : phaseInfo.seasonName;
  // Same "lead with the 10k cutoff, not the headcount" treatment as the hero
  // numeral above — the tile's big number is a Top 250 *cutoff*, so during
  // ramp-up it should read 10k (consistent with the hero and nav) rather than
  // the small live headcount, which otherwise looks like an already-populated
  // board when the board itself has nothing to show yet.
  const wzTileMetrics = showRamp
    ? {
        cutoffSr: IRIDESCENT_SR,
        change24h: null,
        avgPerDaySeason: null,
        avgPerDay7d: null,
        playersSampled: rampCount!,
        capturedAt: new Date().toISOString(),
      }
    : displayWz;
  const wzNote = showRamp
    ? rampCount! > 0
      ? `${rampCount} in Top 250 so far this season`
      : "Standings return once players start climbing"
    : phaseNotice
      ? `${wzNoteSeasonName} final`
      : null;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteNav seasons={seasons} />
      <section className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 items-center gap-10 px-4 pt-16 pb-12 md:grid-cols-2 md:pt-20 md:pb-0">
        <div className="text-right">
          {showRamp ? (
            <>
              <CutoffNumeral
                sr={IRIDESCENT_SR}
                change24h={null}
                label="Cutoff"
                showChange={false}
              />
              <RankedRampBalls count={rampCount!} height={300} />
              {rampCount! > 0 ? (
                <p className="mt-3 text-sm text-muted">
                  {rampCount} in Top 250 so far this season
                </p>
              ) : null}
            </>
          ) : displayWz ? (
            <>
              <CutoffNumeral
                sr={displayWz.cutoffSr}
                change24h={displayWz.change24h}
                showChange={false}
              />
              {dailySeries.length > 0 ? (
                <HomeCutoffObject
                  series={dailySeries}
                  change24h={dailyChange}
                  unit={frozen || pending ? "final 24h" : "24h"}
                  caption={
                    frozen || pending
                      ? "the last-minute scramble for Top 250"
                      : "cutoff gain"
                  }
                />
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
      <ModePick
        mp={mp}
        wz={wzTileMetrics}
        wzNote={wzNote}
      />
      <DesktopHomeTeaser />
      <SiteFooter />
    </div>
  );
}
