import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  friendErrorMessage,
  logFriendError,
  parseFriendActionResult,
  resolveViewerId,
} from "./status";
import type {
  FriendActionResult,
  FriendStatus,
  PendingFriendRequest,
} from "./types";

export const FRIEND_CHANGED_EVENT = "elovate-friend-changed";

function broadcastFriendChanged(status?: FriendStatus): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(FRIEND_CHANGED_EVENT, { detail: { status } }),
  );
}

export function subscribeFriendChanged(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  function onEvent() {
    onChange();
  }
  window.addEventListener(FRIEND_CHANGED_EVENT, onEvent);
  return () => {
    window.removeEventListener(FRIEND_CHANGED_EVENT, onEvent);
  };
}

export async function sendFriendRequest(
  targetId: string,
): Promise<FriendActionResult> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { ok: false, error: "Sign-in is not configured." };

  const { data, error } = await supabase.rpc("send_friend_request", {
    target_id: targetId,
  });
  const result = parseFriendActionResult(data, error);
  if (result.ok) broadcastFriendChanged(result.status);
  else if (error) logFriendError("send_friend_request", error.message);
  return result;
}

export async function respondFriendRequest(
  requestId: string,
  accept: boolean,
): Promise<FriendActionResult> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { ok: false, error: "Sign-in is not configured." };

  const { data, error } = await supabase.rpc("respond_friend_request", {
    request_id: requestId,
    accept,
  });
  const result = parseFriendActionResult(data, error);
  if (result.ok) broadcastFriendChanged(result.status);
  else if (error) logFriendError("respond_friend_request", error.message);
  return result;
}

export async function cancelFriendRequest(
  requestId: string,
): Promise<FriendActionResult> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { ok: false, error: "Sign-in is not configured." };
  const userId = await resolveViewerId();
  if (!userId) return { ok: false, error: "Sign in to continue." };

  const { error } = await supabase
    .from("friend_requests")
    .delete()
    .eq("id", requestId)
    .eq("requester_id", userId)
    .eq("status", "pending");

  if (error) {
    logFriendError("cancelFriendRequest", error.message);
    return { ok: false, error: friendErrorMessage(error) };
  }
  broadcastFriendChanged("none");
  return { ok: true, status: "none", requestId: null };
}

export async function removeFriend(
  requestId: string,
): Promise<FriendActionResult> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { ok: false, error: "Sign-in is not configured." };
  const userId = await resolveViewerId();
  if (!userId) return { ok: false, error: "Sign in to continue." };

  const { error } = await supabase
    .from("friend_requests")
    .delete()
    .eq("id", requestId)
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) {
    logFriendError("removeFriend", error.message);
    return { ok: false, error: friendErrorMessage(error) };
  }
  broadcastFriendChanged("none");
  return { ok: true, status: "none", requestId: null };
}

export async function fetchPendingFriendRequests(): Promise<
  PendingFriendRequest[]
> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return [];
  const userId = await resolveViewerId();
  if (!userId) return [];

  // Prefer a plain table read (no embeds) so PostgREST relationship
  // cache issues cannot drop the inbox silently.
  const { data: rows, error } = await supabase
    .from("friend_requests")
    .select("id, created_at, requester_id")
    .eq("addressee_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    logFriendError("fetchPendingFriendRequests", error.message);
    return fetchPendingFriendRequestsViaRpc(supabase);
  }
  if (!rows?.length) {
    // Double-check via RPC in case RLS/select grants are stale on the table path.
    const viaRpc = await fetchPendingFriendRequestsViaRpc(supabase);
    return viaRpc;
  }

  const requesterIds = [...new Set(rows.map((row) => row.requester_id))];
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, slug, display_name, avatar_url")
    .in("id", requesterIds);

  if (profileError) {
    logFriendError("fetchPendingFriendRequests.profiles", profileError.message);
    return fetchPendingFriendRequestsViaRpc(supabase);
  }

  const byId = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile] as const),
  );

  const out: PendingFriendRequest[] = [];
  for (const row of rows) {
    const requester = byId.get(row.requester_id);
    if (!requester) continue;
    out.push({
      id: row.id,
      createdAt:
        typeof row.created_at === "string"
          ? row.created_at
          : new Date().toISOString(),
      requester: {
        id: requester.id,
        displayName: requester.display_name,
        slug: requester.slug,
        avatarUrl: requester.avatar_url,
      },
    });
  }
  if (out.length === 0) {
    return fetchPendingFriendRequestsViaRpc(supabase);
  }
  return out;
}

async function fetchPendingFriendRequestsViaRpc(
  supabase: NonNullable<ReturnType<typeof createBrowserSupabaseClient>>,
): Promise<PendingFriendRequest[]> {
  const { data, error } = await supabase.rpc("get_pending_friend_requests");
  if (error) {
    logFriendError("fetchPendingFriendRequestsViaRpc", error.message);
    return [];
  }
  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    requester: {
      id: row.requester_id,
      displayName: row.requester_display_name,
      slug: row.requester_slug,
      avatarUrl: row.requester_avatar_url,
    },
  }));
}

export function subscribeFriendRequests(onChange: () => void): () => void {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return () => {};

  let cancelled = false;
  let unsubscribe: (() => void) | null = null;

  void resolveViewerId().then((userId) => {
    if (cancelled || !userId) return;
    // Unique topic per subscriber: reusing a name returns an already-subscribed
    // channel and throws if more .on() callbacks are added.
    const topic = `friend-requests:${userId}:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friend_requests",
          filter: `addressee_id=eq.${userId}`,
        },
        onChange,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friend_requests",
          filter: `requester_id=eq.${userId}`,
        },
        onChange,
      )
      .subscribe();
    unsubscribe = () => {
      void supabase.removeChannel(channel);
    };
  });

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}
