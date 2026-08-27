import type { CutoffPoint } from "@/lib/data/types";
import {
  getActiveSeason,
  getBoardMetrics,
  getPlayerHistory,
} from "@/lib/data/queries";
import { rowToMatch, rowToSession } from "@/lib/history/map";
import type { WzHistoryMatch } from "@/lib/history";
import { rankFromSr } from "@/lib/ranked";
import type { ClimbMatchRow, ClimbSessionRow, ProfileRow } from "@/lib/supabase/database";
import { createAnonSupabaseClient } from "@/lib/supabase/server";
import { parseClimbGoals } from "./goals";
import { headerState, isProfileHeaderId, peakSrForHeaders, type ProfileHeaderId } from "./headers";
import { getSeedProfile } from "./seed";
import { isProfilePageThemeId, type ProfilePageThemeId } from "./themes";
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
    id: null,
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
    pageThemeId: "gold",
    preferredMode: profile.mode,
    climbGoals: [],
    source: "seed",
  };
}

function climbPeaks(
  sessions: ClimbSessionRow[],
  matches: ClimbMatchRow[],
  currentSr: number,
  cutoffSr: number | null,
): ProfilePeaks {
  if (sessions.length === 0 && matches.length === 0) {
    return {
      seasonPeakSr: currentSr > 0 ? currentSr : null,
      allTimePeakSr: null,
      peakRankLabel: currentSr > 0 ? rankFromSr(currentSr, cutoffSr).label : null,
      peakBoardRank: null,
      bestSession: null,
    };
  }

  const parsedMatches = matches
    .map(rowToMatch)
    .filter((match): match is NonNullable<typeof match> => match != null);
  const seasonPeakSr = Math.max(
    currentSr,
    ...parsedMatches.map((match) => match.srAfter),
    ...sessions.map((session) => session.start_sr),
  );
  const summaries = sessions.map((row) => {
    const session = rowToSession(row);
    const owned = parsedMatches.filter((match) => match.sessionId === session.id);
    const last = [...owned].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1);
    const endSr = last?.srAfter ?? session.startSr;
    return {
      id: session.id,
      startedAt: session.startedAt,
      games: owned.length,
      net: endSr - session.startSr,
      startSr: session.startSr,
      endSr,
    } satisfies ProfileSession;
  });
  const bestSession = summaries
    .filter((session) => session.games > 0)
    .reduce<ProfileSession | null>((best, session) => {
      if (!best || session.net > best.net) return session;
      return best;
    }, null);

  return {
    seasonPeakSr,
    allTimePeakSr: null,
    peakRankLabel: rankFromSr(seasonPeakSr, cutoffSr).label,
    peakBoardRank: null,
    bestSession,
  };
}

function profileMatchesFromRows(rows: ClimbMatchRow[]): ProfileMatch[] {
  return rows
    .map(rowToMatch)
    .filter((match): match is WzHistoryMatch => match != null && match.mode === "wz")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((match) => ({
      id: match.id,
      createdAt: match.createdAt,
      placement: match.placement,
      squadElims: match.squadElims,
      yourElims: match.yourElims,
      net: match.net,
      srAfter: match.srAfter,
      teammates: [],
    }));
}

function viewFromUser(
  profile: ProfileRow,
  grants: ProfileHeaderId[],
  sessions: ClimbSessionRow[],
  matches: ClimbMatchRow[],
  cutoffSr: number | null,
  seasonName: string | null,
): ProfileView {
  const parsed = matches
    .map(rowToMatch)
    .filter((match): match is NonNullable<typeof match> => match != null)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const latest = parsed[parsed.length - 1];
  const mode = latest?.mode ?? profile.preferred_mode ?? "wz";
  const currentSr = latest?.srAfter ?? profile.current_sr ?? 0;
  const modeMatches = parsed.filter((match) => match.mode === mode);
  const displayMatches = profileMatchesFromRows(matches);
  const series = seriesFromMatches(
    modeMatches.map((match) => {
      if (match.mode === "wz") {
        return {
          id: match.id,
          createdAt: match.createdAt,
          placement: match.placement,
          squadElims: match.squadElims,
          yourElims: match.yourElims,
          net: match.net,
          srAfter: match.srAfter,
          teammates: [],
        };
      }
      return {
        id: match.id,
        createdAt: match.createdAt,
        placement: "top15" as const,
        squadElims: 0,
        yourElims: 0,
        net: match.net,
        srAfter: match.srAfter,
        teammates: [],
      };
    }),
  );
  const peaks = climbPeaks(sessions, matches, currentSr, cutoffSr);
  const headerId = isProfileHeaderId(profile.equipped_header_id)
    ? profile.equipped_header_id
    : "default";
  const themeId: ProfilePageThemeId = isProfilePageThemeId(profile.page_theme_id)
    ? profile.page_theme_id
    : "gold";
  const headers = headerState({
    peakSr: peakSrForHeaders(peaks, currentSr),
    grantedHeaderIds: grants,
    equippedHeaderId: headerId,
  });

  return {
    id: profile.id,
    slug: profile.slug,
    displayName: profile.display_name,
    handle: `@${profile.slug}`,
    bannerUrl: photo(`${profile.slug}-banner`, 1600, 480),
    avatarUrl: profile.avatar_url ?? "",
    mode,
    currentSr,
    cutoffSr,
    boardRank: null,
    seasonName,
    votes: { ups: 0, downs: 0 },
    matches: displayMatches,
    series,
    peaks,
    grantedHeaderIds: grants,
    ownedHeaderIds: headers.ownedHeaderIds,
    equippedHeaderId: headers.equippedHeaderId,
    pageThemeId: themeId,
    preferredMode: profile.preferred_mode,
    climbGoals: parseClimbGoals(profile.climb_goals),
    isPrivate: profile.is_private ?? false,
    source: "user",
  };
}

async function getUserProfile(slug: string): Promise<ProfileView | null> {
  const supabase = createAnonSupabaseClient();
  if (!supabase) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !profile) return null;

  const [{ data: grantRows }, { data: sessionRows }, { data: matchRows }] = await Promise.all([
    supabase.from("profile_grants").select("grant_id").eq("profile_id", profile.id),
    supabase.from("climb_sessions").select("*").eq("user_id", profile.id),
    supabase
      .from("climb_matches")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: true })
      .limit(200),
  ]);

  const grants = (grantRows ?? [])
    .map((row) => row.grant_id)
    .filter(isProfileHeaderId);
  const season = getActiveSeason();
  const latestMode = (matchRows ?? []).at(-1)?.mode ?? "wz";
  const cutoffSr = getBoardMetrics(latestMode, season.id)?.cutoffSr ?? null;
  return viewFromUser(
    profile,
    grants,
    sessionRows ?? [],
    matchRows ?? [],
    cutoffSr,
    season.name,
  );
}

export async function getProfile(slug: string): Promise<ProfileView | null> {
  const fromDb = await getUserProfile(slug);
  if (fromDb) return fromDb;

  const season = getActiveSeason();
  const seed = getSeedProfile(slug);
  const metrics = seed ? getBoardMetrics(seed.mode, season.id) : null;

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
    id: null,
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
    pageThemeId: "gold",
    preferredMode: mode,
    climbGoals: [],
    source: "ladder",
  };
}
