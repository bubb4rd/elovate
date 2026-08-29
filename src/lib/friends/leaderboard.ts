import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { FriendLeaderboardRpcRow } from "@/lib/supabase/database";
import { logFriendError } from "./status";
import type { FriendLeaderboardRow } from "./types";

function mapRow(row: FriendLeaderboardRpcRow): FriendLeaderboardRow {
  return {
    profileId: row.profile_id,
    slug: row.slug,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    currentSr: row.current_sr,
    rank: row.rank,
    isViewer: row.is_viewer,
  };
}

export async function fetchFriendLeaderboard(): Promise<FriendLeaderboardRow[]> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("get_friend_leaderboard");
  if (error) {
    logFriendError("get_friend_leaderboard", error.message);
    return [];
  }
  if (!data) return [];
  return data.map(mapRow);
}
