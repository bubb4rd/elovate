"use client";

import { useState } from "react";
import { CutoffChart } from "@/components/cutoff-chart";
import { MatchHistory } from "@/components/profile/match-history";
import { ProfileHero } from "@/components/profile/profile-hero";
import { ProfileThemeProvider } from "@/components/profile/profile-theme-provider";
import { SrProgress } from "@/components/profile/sr-progress";
import type { ProfilePageThemeId } from "@/lib/profile/themes";
import type { ProfileView } from "@/lib/profile/types";

export function ProfilePageContent({
  profile,
  srDelta,
  canEdit,
}: {
  profile: ProfileView;
  srDelta: number | null;
  canEdit: boolean;
}) {
  const [pageThemeId, setPageThemeId] = useState<ProfilePageThemeId>(profile.pageThemeId);

  return (
    <ProfileThemeProvider themeId={pageThemeId}>
      <ProfileHero
        profile={profile}
        srDelta={srDelta}
        pageThemeId={pageThemeId}
        canEdit={canEdit}
        onPageThemeChange={setPageThemeId}
      />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-8">
          <div className="min-h-80">
            <MatchHistory matches={profile.matches} />
          </div>
        </div>
        <div className="flex flex-col gap-8">
          <div className="min-h-40">
            {profile.series.length < 2 ? (
              <p className="flex h-full items-center text-sm text-muted">No SR history yet.</p>
            ) : (
              <div>
                <p className="mb-2 px-1 text-[10px] font-medium tracking-[0.16em] text-muted uppercase">
                  SR trend
                </p>
                <CutoffChart
                  series={profile.series}
                  showRank1={false}
                  valueLabel="SR"
                  bare
                  height={220}
                />
              </div>
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
