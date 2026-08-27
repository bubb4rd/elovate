"use client";

import { useState } from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { CutoffChart } from "@/components/cutoff-chart";
import { MatchHistory } from "@/components/profile/match-history";
import { ProfileHero } from "@/components/profile/profile-hero";
import { ProfileThemeProvider } from "@/components/profile/profile-theme-provider";
import { SrProgress } from "@/components/profile/sr-progress";
import { SiteTooltip } from "@/components/ui/tooltip";
import { formatDelta, formatSr } from "@/lib/format";
import type { ProfilePageThemeId } from "@/lib/profile/themes";
import type { ProfileView } from "@/lib/profile/types";

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
  const up = srDelta != null && srDelta > 0;
  const down = srDelta != null && srDelta < 0;

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
            <MatchHistory matches={profile.matches} />
          </div>
        </div>
        <div className="order-1 flex flex-col gap-8 lg:order-2">
          <div className="min-h-40">
            <div className="mb-2 px-1 text-right">
              <p className="flex items-center justify-end gap-1.5">
                <span className="numeric accent-glow text-4xl font-semibold tracking-tight text-accent md:text-5xl">
                  {formatSr(profile.currentSr)}
                </span>
                {up && srDelta != null ? (
                  <SiteTooltip label={`${formatDelta(srDelta)} SR`} align="end">
                    <span
                      tabIndex={0}
                      aria-label={`Up ${formatDelta(srDelta)} SR`}
                      className="rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <CaretUp weight="bold" className="size-5 text-accent" aria-hidden />
                    </span>
                  </SiteTooltip>
                ) : null}
                {down && srDelta != null ? (
                  <SiteTooltip label={`${formatDelta(srDelta)} SR`} align="end">
                    <span
                      tabIndex={0}
                      aria-label={`Down ${formatDelta(Math.abs(srDelta))} SR`}
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
            {profile.series.length < 2 ? (
              <p className="flex h-full items-center text-sm text-muted">No SR history yet.</p>
            ) : (
              <CutoffChart
                series={profile.series}
                showRank1={false}
                valueLabel="SR"
                bare
                height={220}
              />
            )}
          </div>
          <div className="min-h-40">
            <SrProgress currentSr={profile.currentSr} cutoffSr={profile.cutoffSr} />
          </div>
        </div>
      </div>
    </ProfileThemeProvider>
  );
}
