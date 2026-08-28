"use client";

import { useEffect, useState } from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { CutoffChart } from "@/components/cutoff-chart";
import { MATCH_HIGHLIGHT_MS, MATCH_LIMIT, MatchHistory } from "@/components/profile/match-history";
import { ProfileHero } from "@/components/profile/profile-hero";
import { ProfileThemeProvider } from "@/components/profile/profile-theme-provider";
import { SrProgress } from "@/components/profile/sr-progress";
import { SiteTooltip } from "@/components/ui/tooltip";
import { formatDelta, formatSr } from "@/lib/format";
import {
  subscribeAcceptedMatch,
  wzMatchToProfileMatch,
} from "@/lib/history";
import type { CutoffPoint } from "@/lib/data/types";
import type { ProfilePageThemeId } from "@/lib/profile/themes";
import type { ProfileMatch, ProfileView } from "@/lib/profile/types";

function seriesPointFromAccept(payload: {
  createdAt: string;
  srAfter: number;
  net: number;
}): CutoffPoint {
  return {
    capturedAt: payload.createdAt,
    cutoffSr: payload.srAfter,
    rank1Sr: payload.srAfter,
    deltaCutoff: payload.net,
  };
}

export function ProfilePageContent({
  profile,
  srDelta,
  canEdit,
  isSignedIn,
}: {
  profile: ProfileView;
  srDelta: number | null;
  canEdit: boolean;
  isSignedIn: boolean;
}) {
  const [pageThemeId, setPageThemeId] = useState<ProfilePageThemeId>(profile.pageThemeId);
  const [matches, setMatches] = useState<ProfileMatch[]>(profile.matches);
  const [currentSr, setCurrentSr] = useState(profile.currentSr);
  const [series, setSeries] = useState<CutoffPoint[]>(profile.series);
  const [enteredId, setEnteredId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    let highlightTimer: number | null = null;
    const unsubscribe = subscribeAcceptedMatch((payload) => {
      const slug = profile.slug.toLowerCase();
      const invitee = payload.inviteeSlug?.toLowerCase() ?? null;
      const inviter = payload.inviterSlug?.toLowerCase() ?? null;

      if (invitee && slug === invitee) {
        const profileMatch = wzMatchToProfileMatch(payload.match);
        if (profileMatch) {
          setMatches((current) => {
            if (current.some((item) => item.id === profileMatch.id)) return current;
            return [profileMatch, ...current].slice(0, MATCH_LIMIT);
          });
          setEnteredId(profileMatch.id);
        }
        setCurrentSr(payload.srAfter);
        setSeries((current) => {
          if (current.some((point) => point.capturedAt === payload.match.createdAt)) {
            return current;
          }
          return [
            ...current,
            seriesPointFromAccept({
              createdAt: payload.match.createdAt,
              srAfter: payload.srAfter,
              net: payload.match.net,
            }),
          ];
        });
        return;
      }

      if (inviter && slug === inviter) {
        setHighlightId(payload.sourceMatchId);
        if (highlightTimer != null) window.clearTimeout(highlightTimer);
        highlightTimer = window.setTimeout(() => {
          setHighlightId((current) =>
            current === payload.sourceMatchId ? null : current,
          );
          highlightTimer = null;
        }, MATCH_HIGHLIGHT_MS);
      }
    });
    return () => {
      unsubscribe();
      if (highlightTimer != null) window.clearTimeout(highlightTimer);
    };
  }, [profile.slug]);

  const firstSr = series[0]?.cutoffSr;
  const lastSr = series[series.length - 1]?.cutoffSr;
  const liveSrDelta =
    firstSr != null && lastSr != null ? lastSr - firstSr : srDelta;
  const up = liveSrDelta != null && liveSrDelta > 0;
  const down = liveSrDelta != null && liveSrDelta < 0;

  return (
    <ProfileThemeProvider themeId={pageThemeId}>
      <ProfileHero
        profile={profile}
        pageThemeId={pageThemeId}
        canEdit={canEdit}
        isSignedIn={isSignedIn}
        onPageThemeChange={setPageThemeId}
      />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="order-2 flex flex-col gap-8 lg:order-1">
          <div className="min-h-80">
            <MatchHistory
              matches={matches}
              enteredId={enteredId}
              highlightId={highlightId}
            />
          </div>
        </div>
        <div className="order-1 flex flex-col gap-8 lg:order-2">
          <div className="min-h-40">
            <div className="mb-2 px-1 text-right">
              <p className="flex items-center justify-end gap-1.5">
                <span className="numeric accent-glow text-4xl font-semibold tracking-tight text-accent md:text-5xl">
                  {formatSr(currentSr)}
                </span>
                {up && liveSrDelta != null ? (
                  <SiteTooltip label={`${formatDelta(liveSrDelta)} SR`} align="end">
                    <span
                      tabIndex={0}
                      aria-label={`Up ${formatDelta(liveSrDelta)} SR`}
                      className="rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <CaretUp weight="bold" className="size-5 text-accent" aria-hidden />
                    </span>
                  </SiteTooltip>
                ) : null}
                {down && liveSrDelta != null ? (
                  <SiteTooltip label={`${formatDelta(Math.abs(liveSrDelta))} SR`} align="end">
                    <span
                      tabIndex={0}
                      aria-label={`Down ${formatDelta(Math.abs(liveSrDelta))} SR`}
                      className="rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <CaretDown weight="bold" className="size-5 text-negative" aria-hidden />
                    </span>
                  </SiteTooltip>
                ) : null}
              </p>
              <p className="mt-1 text-[10px] font-medium tracking-[0.18em] text-muted uppercase">
                Current SR
              </p>
            </div>
            {series.length < 2 ? (
              <p className="flex h-full items-center text-sm text-muted">No SR history yet.</p>
            ) : (
              <CutoffChart
                series={series}
                showRank1={false}
                valueLabel="SR"
                bare
                height={220}
              />
            )}
          </div>
          <div className="min-h-40">
            <SrProgress currentSr={currentSr} cutoffSr={profile.cutoffSr} />
          </div>
        </div>
      </div>
    </ProfileThemeProvider>
  );
}
