import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { CastProfileVoteResult } from "@/lib/supabase/database";
import type { ReputationVoteValue, ReputationVotes } from "./types";

export type CastReputationVoteOk = ReputationVotes & {
  viewerVote: ReputationVoteValue;
  canChangeVote: boolean;
};

function parseResult(data: unknown): CastReputationVoteOk | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Partial<CastProfileVoteResult>;
  const ups = Number(row.ups);
  const downs = Number(row.downs);
  const viewerVote = row.viewer_vote;
  if (!Number.isFinite(ups) || !Number.isFinite(downs)) return null;
  if (viewerVote !== 1 && viewerVote !== -1) return null;
  return {
    ups,
    downs,
    viewerVote,
    canChangeVote: Boolean(row.can_change_vote),
  };
}

function errorMessage(error: { message?: string; hint?: string; code?: string } | null): string {
  const hint = error?.hint?.trim();
  if (hint) return hint;
  const message = error?.message ?? "";
  if (message.includes("vote_change_locked")) {
    return "You can change this vote again tomorrow (UTC).";
  }
  if (message.includes("self_vote")) {
    return "You cannot vote on your own profile.";
  }
  if (message.includes("not_authenticated")) {
    return "Sign in to vote.";
  }
  if (message.includes("profile_not_found")) {
    return "Profile not found.";
  }
  return message || "Could not cast vote.";
}

export async function castReputationVote(input: {
  profileId: string;
  vote: ReputationVoteValue;
}): Promise<CastReputationVoteOk | { error: string }> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { error: "Sign-in is not configured." };

  const { data, error } = await supabase.rpc("cast_profile_vote", {
    target_id: input.profileId,
    vote: input.vote,
  });

  if (error) return { error: errorMessage(error) };
  const parsed = parseResult(data);
  if (!parsed) return { error: "Could not cast vote." };
  return parsed;
}
