import type { CutoffPoint, Season } from "@/lib/data/types";
import {
  getActiveSeason,
  getBoardMetrics,
  getPreviousSeason,
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

export type DisplaySrResolution = {
  currentSr: number;
  /** True when profile.current_sr is being shown rather than a real in-season match. */
  usingResetValue: boolean;
};

/**
 * A profile's live current SR: the latest logged match's srAfter, unless
 * that match predates the active season. A season's ranked reset breaks the
 * SR chain in-game, so a match from a prior season is stale, not "current" —
 * profile.current_sr (freshly reset by apply_season_rank_reset(), WZ-18) is
 * the more honest number until the player logs a real match this season.
 */
export function resolveDisplaySr(
  latest: { srAfter: number; createdAt: string } | null | undefined,
  profileCurrentSr: number,
  activeSeasonStartsAt: string,
): DisplaySrResolution {
  if (latest && latest.createdAt >= activeSeasonStartsAt) {
    return { currentSr: latest.srAfter, usingResetValue: false };
  }
  return { currentSr: profileCurrentSr, usingResetValue: true };
}

/** True when a match's timestamp falls inside the active season — same boundary resolveDisplaySr uses. */
export function isInSeason(createdAt: string, activeSeasonStartsAt: string): boolean {
  return createdAt >= activeSeasonStartsAt;
}

const TREND_FALLBACK_WINDOW_MS = 24 * 60 * 60 * 1000;

export type PreviousSeasonWindow = {
  name: string;
  startsAt: string;
  endsAt: string | null;
};

/** Matches within 24h of the latest timestamp in `matches` (must be sorted ascending). */
function withinLastDay<T extends { createdAt: string }>(matches: T[]): T[] {
  if (matches.length === 0) return matches;
  const lastMs = new Date(matches[matches.length - 1]!.createdAt).getTime();
  const cutoffMs = lastMs - TREND_FALLBACK_WINDOW_MS;
  return matches.filter((match) => new Date(match.createdAt).getTime() >= cutoffMs);
}

/**
 * Which matches feed the profile trend chart, plus an optional caption. A
 * brand-new season with fewer than 2 in-season matches falls back to the
 * previous season's final 24 hours (mirrors the board's day-zero/final-push
 * treatment) rather than going blank the moment a season resets.
 */
export function resolveTrendMatches<
  T extends { createdAt: string; srAfter: number; net: number },
>(
  modeMatches: T[],
  seasonStartsAt: string,
  previousSeason: PreviousSeasonWindow | undefined,
): { matches: T[]; note: string | null } {
  const seasonMatches = modeMatches.filter((match) => isInSeason(match.createdAt, seasonStartsAt));
  if (seasonMatches.length >= 2 || !previousSeason) {
    return { matches: seasonMatches, note: null };
  }
  const previousSeasonMatches = modeMatches.filter(
    (match) =>
      match.createdAt >= previousSeason.startsAt &&
      (previousSeason.endsAt == null || match.createdAt <= previousSeason.endsAt),
  );
  const fallback = withinLastDay(previousSeasonMatches);
  if (fallback.length < 2) {
    return { matches: seasonMatches, note: null };
  }
  return { matches: fallback, note: `${previousSeason.name} final 24h` };
}

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

export function climbPeaks(
  sessions: ClimbSessionRow[],
  matches: ClimbMatchRow[],
  currentSr: number,
  cutoffSr: number | null,
  seasonStartsAt: string,
): ProfilePeaks {
  if (sessions.length === 0 && matches.length === 0) {
    const peak = currentSr > 0 ? currentSr : null;
    return {
      seasonPeakSr: peak,
      allTimePeakSr: peak,
      peakRankLabel: peak != null ? rankFromSr(peak, cutoffSr).label : null,
      peakBoardRank: null,
      bestSession: null,
    };
  }

  const parsedMatches = matches
    .map(rowToMatch)
    .filter((match): match is NonNullable<typeof match> => match != null);
  // allTimePeakSr feeds header-unlock logic (peakSrForHeaders) — a header
  // earned last season must stay earned after a reset, so this stays
  // unscoped. seasonPeakSr below is the one that resets with the season.
  const allTimePeakSr = Math.max(
    currentSr,
    ...parsedMatches.map((match) => match.srAfter),
    ...sessions.map((session) => session.start_sr),
  );
  const inSeasonMatches = parsedMatches.filter((match) =>
    isInSeason(match.createdAt, seasonStartsAt),
  );
  const inSeasonSessions = sessions.filter((session) =>
    isInSeason(session.started_at, seasonStartsAt),
  );
  const seasonPeakSr =
    inSeasonMatches.length === 0 && inSeasonSessions.length === 0
      ? currentSr > 0
        ? currentSr
        : null
      : Math.max(
          currentSr,
          ...inSeasonMatches.map((match) => match.srAfter),
          ...inSeasonSessions.map((session) => session.start_sr),
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
    allTimePeakSr,
    peakRankLabel: seasonPeakSr != null ? rankFromSr(seasonPeakSr, cutoffSr).label : null,
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
  seasonId: string,
  seasonStartsAt: string,
  previousSeason: Season | undefined,
  reputation: Pick<ProfileView, "votes" | "viewerVote" | "canChangeVote">,
): ProfileView {
  const parsed = matches
    .map(rowToMatch)
    .filter((match): match is NonNullable<typeof match> => match != null)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const latest = parsed[parsed.length - 1];
  const mode = latest?.mode ?? profile.preferred_mode ?? "wz";
  const { currentSr, usingResetValue } = resolveDisplaySr(
    latest,
    profile.current_sr ?? 0,
    seasonStartsAt,
  );
  const srResetNote =
    usingResetValue && profile.sr_reset_season_id === seasonId
      ? `Adjusted for the ${seasonName ?? "this season"} reset`
      : null;
  const modeMatches = parsed.filter((match) => match.mode === mode);
  const displayMatches = profileMatchesFromRows(matches);
  // The trend chart only shows this season's climb — a match from before the
  // reset would otherwise plot a line ending at a since-reset SR, drawing a
  // discontinuous "climb" straight through the reset boundary. A brand-new
  // season with fewer than 2 in-season matches falls back to last season's
  // final 24 hours instead (see resolveTrendMatches) rather than going blank
  // the moment the season resets. Match History below (displayMatches) still
  // shows real past matches regardless; only the chart is season-scoped.
  const { matches: trendMatches, note: seriesNote } = resolveTrendMatches(
    modeMatches,
    seasonStartsAt,
    previousSeason
      ? { name: previousSeason.name, startsAt: previousSeason.startsAt, endsAt: previousSeason.endsAt }
      : undefined,
  );
  const series = seriesFromMatches(
    trendMatches.map((match) => {
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
  const peaks = climbPeaks(sessions, matches, currentSr, cutoffSr, seasonStartsAt);
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
    srResetNote,
    cutoffSr,
    boardRank: null,
    seasonName,
    votes: reputation.votes,
    viewerVote: reputation.viewerVote,
    canChangeVote: reputation.canChangeVote,
    matches: displayMatches,
    series,
    seriesNote,
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
  const previousSeason = getPreviousSeason();
  const latestMode = (matchRows ?? []).at(-1)?.mode ?? "wz";
  const cutoffSr = getBoardMetrics(latestMode, season.id)?.cutoffSr ?? null;
  return viewFromUser(
    profile,
    grants,
    sessionRows ?? [],
    matchRows ?? [],
    cutoffSr,
    season.name,
    season.id,
    season.startsAt,
    previousSeason,
    { votes, viewerVote, canChangeVote },
  );
}

export async function getProfile(
  slug: string,
  viewerId?: string | null,
): Promise<ProfileView | null> {
  return getUserProfile(slug, viewerId);
}
