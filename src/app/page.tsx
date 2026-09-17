import { CutoffNumeral } from "@/components/cutoff-numeral";
import { DesktopHomeTeaser } from "@/components/desktop-home-teaser";
import { HomeCutoffObject } from "@/components/home-cutoff-object";
import { HomeHeroCopy } from "@/components/home-hero-copy";
import { ModePick } from "@/components/mode-pick";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getBoardCutoff } from "@/lib/data/board-source";
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
  const [previousStored, finalPush] = pending && previousSeason
    ? await Promise.all([
        getLatestStoredCutoff("wz", previousSeason.id),
        finalPushWzHistory(previousSeason.id),
      ])
    : [null, frozen ? await finalPushWzHistory(season.id) : null];

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
    : pending && previousSeason
      ? pendingSeasonCopy(phaseInfo.seasonName, previousSeason.name)
      : null;
  const dailySeries =
    frozen || pending
      ? (finalPush?.series ?? [])
      : history.change24h != null
        ? history.series
        : [];
  const dailyChange =
    frozen || pending ? (finalPush?.change24h ?? null) : (wz?.change24h ?? null);
  const wzNoteSeasonName = pending && previousSeason ? previousSeason.name : phaseInfo.seasonName;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteNav seasons={seasons} />
      <section className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 items-center gap-10 px-4 pt-16 pb-12 md:grid-cols-2 md:pt-20 md:pb-0">
        <div className="text-right">
          {displayWz ? (
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
        wz={displayWz}
        wzNote={phaseNotice ? `${wzNoteSeasonName} final` : null}
      />
      <DesktopHomeTeaser />
      <SiteFooter />
    </div>
  );
}
