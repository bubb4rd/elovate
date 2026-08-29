import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FriendStatus } from "./types";

export async function getFriendStatusServer(
  targetId: string,
): Promise<{ status: FriendStatus; requestId: string | null }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { status: "none", requestId: null };

  const { data, error } = await supabase.rpc("get_friend_status", {
    target_id: targetId,
  });
  if (error || !data || typeof data !== "object") {
    return { status: "none", requestId: null };
  }

  const status = (data as { status?: unknown }).status;
  const requestId = (data as { request_id?: unknown }).request_id;
  if (
    status !== "none" &&
    status !== "pending_out" &&
    status !== "pending_in" &&
    status !== "friends"
  ) {
    return { status: "none", requestId: null };
  }

  return {
    status,
    requestId: typeof requestId === "string" ? requestId : null,
  };
}
