import type { CutoffPoint, Mode } from "@/lib/data/types";
import type { ClimbTarget, WzPlacementId } from "@/lib/ranked";
import type { ProfileHeaderId } from "./headers";
import type { ProfilePageThemeId } from "./themes";

export type ReputationVotes = {
  ups: number;
  downs: number;
};

export type ReputationVoteValue = -1 | 1;

export type ProfileTeammate = {
  displayName: string;
  slug: string | null;
  avatarUrl: string | null;
};

export type ProfileMatch = {
  id: string;
  createdAt: string;
  placement: WzPlacementId;
  squadElims: number;
  yourElims: number;
  net: number;
  srAfter: number;
  teammates: ProfileTeammate[];
};

export type ProfileSession = {
  id: string;
  startedAt: string;
  games: number;
  net: number;
  startSr: number;
  endSr: number;
};

export type SeedProfile = {
  slug: string;
  displayName: string;
  handle: string;
  bannerUrl: string;
  avatarUrl: string;
  mode: Mode;
  currentSr: number;
  votes: ReputationVotes;
  allTimePeakSr?: number;
  peakBoardRank?: number | null;
  grantedHeaderIds?: ProfileHeaderId[];
  equippedHeaderId?: ProfileHeaderId;
  matches: ProfileMatch[];
  sessions: ProfileSession[];
};

export type ProfilePeaks = {
  seasonPeakSr: number | null;
  allTimePeakSr: number | null;
  peakRankLabel: string | null;
  peakBoardRank: number | null;
  bestSession: ProfileSession | null;
};

export type ProfileView = {
  id: string | null;
  slug: string;
  displayName: string;
  handle: string;
  bannerUrl: string;
  avatarUrl: string;
  mode: Mode;
  currentSr: number;
  cutoffSr: number | null;
  boardRank: number | null;
  seasonName: string | null;
  votes: ReputationVotes;
  viewerVote: ReputationVoteValue | null;
  canChangeVote: boolean;
  matches: ProfileMatch[];
  series: CutoffPoint[];
  peaks: ProfilePeaks;
  grantedHeaderIds: ProfileHeaderId[];
  ownedHeaderIds: ProfileHeaderId[];
  equippedHeaderId: ProfileHeaderId;
  pageThemeId: ProfilePageThemeId;
  preferredMode: Mode;
  climbGoals: ClimbTarget[];
  isPrivate?: boolean;
  source: "seed" | "ladder" | "user";
};
