import type { CutoffPoint } from "@/lib/data/types";
import {
  getActiveSeason,
  getBoardMetrics,
  getPlayerHistory,
} from "@/lib/data/queries";
import { rankFromSr } from "@/lib/ranked";
import { headerState, peakSrForHeaders } from "./headers";
import { getSeedProfile } from "./seed";
import type {
  ProfileMatch,
  ProfilePeaks,
  ProfileSession,
  ProfileView,
  SeedProfile,
} from "./types";

function photo(seed: string, width: number, height: number): string {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

function seriesFromMatches(matches: ProfileMatch[]): CutoffPoint[] {
  return matches.map((match, index) => ({
    capturedAt: match.createdAt,
    cutoffSr: match.srAfter,
    rank1Sr: match.srAfter,
    deltaCutoff: index === 0 ? null : match.net,
  }));
}

function peaksFromSeed(profile: SeedProfile, cutoffSr: number | null): ProfilePeaks {
  if (profile.matches.length === 0 && profile.sessions.length === 0) {
    return {
      seasonPeakSr: null,
      allTimePeakSr: null,
      peakRankLabel: null,
      peakBoardRank: null,
      bestSession: null,
    };
  }

  const seasonPeakSr = Math.max(
    profile.currentSr,
    ...profile.matches.map((match) => match.srAfter),
    ...profile.sessions.map((session) => session.endSr),
  );
  const allTimePeakSr =
    profile.allTimePeakSr != null && profile.allTimePeakSr > seasonPeakSr
      ? profile.allTimePeakSr
      : null;
  const peakSr = allTimePeakSr ?? seasonPeakSr;
  const bestSession = profile.sessions.reduce<ProfileSession | null>((best, session) => {
    if (!best || session.net > best.net) return session;
    return best;
  }, null);

  return {
    seasonPeakSr,
    allTimePeakSr,
    peakRankLabel: rankFromSr(peakSr, cutoffSr).label,
    peakBoardRank: profile.peakBoardRank ?? null,
    bestSession,
  };
}

function viewFromSeed(profile: SeedProfile, cutoffSr: number | null, seasonName: string | null): ProfileView {
  const matches = [...profile.matches].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const currentSr = matches[matches.length - 1]?.srAfter ?? profile.currentSr;
  const peaks = peaksFromSeed({ ...profile, currentSr, matches }, cutoffSr);
  const grantedHeaderIds = profile.grantedHeaderIds ?? [];
  const headers = headerState({
    peakSr: peakSrForHeaders(peaks, currentSr),
    grantedHeaderIds,
    equippedHeaderId: profile.equippedHeaderId,
  });

  return {
    slug: profile.slug,
    displayName: profile.displayName,
    handle: profile.handle,
    bannerUrl: profile.bannerUrl,
    avatarUrl: profile.avatarUrl,
    mode: profile.mode,
    currentSr,
    cutoffSr,
    boardRank: null,
    seasonName,
    votes: profile.votes,
    matches: [...matches].reverse(),
    series: seriesFromMatches(matches),
    peaks,
    grantedHeaderIds,
    ownedHeaderIds: headers.ownedHeaderIds,
    equippedHeaderId: headers.equippedHeaderId,
    source: "seed",
  };
}

export function getProfile(slug: string): ProfileView | null {
  const season = getActiveSeason();
  const seed = getSeedProfile(slug);
  const metrics = seed
    ? getBoardMetrics(seed.mode, season.id)
    : null;

  if (seed) {
    return viewFromSeed(seed, metrics?.cutoffSr ?? null, season.name);
  }

  const history = getPlayerHistory(slug);
  if (!history) return null;

  const { player, appearances } = history;
  const latest = appearances[appearances.length - 1];
  const mode = latest?.mode ?? "wz";
  const cutoffSr = getBoardMetrics(mode, latest?.season.id ?? season.id)?.cutoffSr ?? null;
  const series: CutoffPoint[] = appearances.map((appearance, index) => ({
    capturedAt: appearance.capturedAt,
    cutoffSr: appearance.sr,
    rank1Sr: appearance.sr,
    deltaCutoff: index === 0 ? null : appearance.sr - appearances[index - 1]!.sr,
  }));

  return {
    slug: player.slug,
    displayName: player.displayName,
    handle: `@${player.slug}`,
    bannerUrl: photo(`${player.slug}-banner`, 1600, 480),
    avatarUrl: photo(`${player.slug}-avatar`, 256, 256),
    mode,
    currentSr: latest?.sr ?? 0,
    cutoffSr,
    boardRank: latest?.rank ?? null,
    seasonName: latest?.season.name ?? season.name,
    votes: { ups: 0, downs: 0 },
    matches: [],
    series,
    peaks: {
      seasonPeakSr: null,
      allTimePeakSr: null,
      peakRankLabel: null,
      peakBoardRank: null,
      bestSession: null,
    },
    grantedHeaderIds: [],
    ownedHeaderIds: ["default"],
    equippedHeaderId: "default",
    source: "ladder",
  };
}
