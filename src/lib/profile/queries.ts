import type { CutoffPoint } from "@/lib/data/types";
import {
  getActiveSeason,
  getBoardMetrics,
} from "@/lib/data/queries";
import { rowToMatch, rowToSession } from "@/lib/history/map";
import type { WzHistoryMatch } from "@/lib/history";
import { rankFromSr } from "@/lib/ranked";
import type { ClimbMatchRow, ClimbSessionRow, ProfileRow } from "@/lib/supabase/database";
import { createAnonSupabaseClient } from "@/lib/supabase/server";
import { avatarOrDefault } from "@/lib/profile/avatar";
import { parseClimbGoals } from "./goals";
import {
  headerState,
  isProfileGrantId,
  isProfileHeaderId,
  peakSrForHeaders,
  type ProfileGrantId,
} from "./headers";
import { isProfilePageThemeId, type ProfilePageThemeId } from "./themes";
import type {
  ProfileMatch,
  ProfilePeaks,
  ProfileSession,
  ProfileView,
  ReputationVoteValue,
  ReputationVotes,
} from "./types";

function utcDateString(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function todayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function canChangeVoteToday(updatedAt: string | null | undefined): boolean {
  if (!updatedAt) return true;
  return utcDateString(updatedAt) < todayUtcDateString();
}

function aggregateVotes(rows: { value: number }[]): ReputationVotes {
  let ups = 0;
  let downs = 0;
  for (const row of rows) {
    if (row.value === 1) ups += 1;
    else if (row.value === -1) downs += 1;
  }
  return { ups, downs };
}

function seriesFromMatches(matches: ProfileMatch[]): CutoffPoint[] {
  return matches.map((match, index) => ({
    capturedAt: match.createdAt,
    cutoffSr: match.srAfter,
    rank1Sr: match.srAfter,
    deltaCutoff: index === 0 ? null : match.net,
  }));
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
      teammates: match.teammates,
    }));
}

function viewFromUser(
  profile: ProfileRow,
  grants: ProfileGrantId[],
  sessions: ClimbSessionRow[],
  matches: ClimbMatchRow[],
  cutoffSr: number | null,
  seasonName: string | null,
  reputation: Pick<ProfileView, "votes" | "viewerVote" | "canChangeVote">,
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
          teammates: match.teammates,
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
        teammates: match.teammates,
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
    grantedIds: grants,
    equippedHeaderId: headerId,
  });

  return {
    id: profile.id,
    slug: profile.slug,
    displayName: profile.display_name,
    handle: `@${profile.slug}`,
    bannerUrl: "",
    avatarUrl: avatarOrDefault(profile.avatar_url),
    mode,
    currentSr,
    cutoffSr,
    boardRank: null,
    seasonName,
    votes: reputation.votes,
    viewerVote: reputation.viewerVote,
    canChangeVote: reputation.canChangeVote,
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

async function getUserProfile(
  slug: string,
  viewerId?: string | null,
): Promise<ProfileView | null> {
  const supabase = createAnonSupabaseClient();
  if (!supabase) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !profile) return null;

  const [{ data: grantRows }, { data: sessionRows }, { data: matchRows }, { data: voteRows }] =
    await Promise.all([
      supabase.from("profile_grants").select("grant_id").eq("profile_id", profile.id),
      supabase.from("climb_sessions").select("*").eq("user_id", profile.id),
      supabase
        .from("climb_matches")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: true })
        .limit(200),
      supabase.from("profile_votes").select("value, voter_id, updated_at").eq("profile_id", profile.id),
    ]);

  const votes = aggregateVotes(voteRows ?? []);
  let viewerVote: ReputationVoteValue | null = null;
  let canChangeVote = false;
  if (viewerId && viewerId !== profile.id) {
    const own = (voteRows ?? []).find((row) => row.voter_id === viewerId);
    if (own?.value === 1 || own?.value === -1) {
      viewerVote = own.value;
      canChangeVote = canChangeVoteToday(own.updated_at);
    } else {
      canChangeVote = true;
    }
  }

  const grants = (grantRows ?? [])
    .map((row) => row.grant_id)
    .filter(isProfileGrantId);
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
    { votes, viewerVote, canChangeVote },
  );
}

export async function getProfile(
  slug: string,
  viewerId?: string | null,
): Promise<ProfileView | null> {
  return getUserProfile(slug, viewerId);
}
