import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { FriendStatusResult } from "@/lib/supabase/database";
import type { FriendActionResult, FriendStatus } from "./types";

function isMissingFriendsTable(message: string): boolean {
  return /friend_requests/i.test(message) && /schema cache|does not exist|relation/i.test(message);
}

export function logFriendError(context: string, message: string): void {
  if (isMissingFriendsTable(message)) return;
  console.error(`[friends] ${context}`, message);
}

function parseStatus(raw: unknown): FriendStatus | null {
  if (!raw || typeof raw !== "object") return null;
  const status = (raw as Partial<FriendStatusResult>).status;
  if (
    status === "none" ||
    status === "pending_out" ||
    status === "pending_in" ||
    status === "friends"
  ) {
    return status;
  }
  return null;
}

function parseRequestId(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const id = (raw as { request_id?: unknown }).request_id;
  return typeof id === "string" ? id : null;
}

export function friendErrorMessage(
  error: { message?: string; hint?: string } | null,
): string {
  const hint = error?.hint?.trim();
  if (hint) return hint;
  const message = error?.message ?? "";
  if (message.includes("not_authenticated")) return "Sign in to continue.";
  if (message.includes("self_friend_request")) return "You cannot friend yourself.";
  if (message.includes("profile_not_found")) return "Profile not found.";
  if (message.includes("already_friends")) return "You are already friends.";
  if (message.includes("request_already_pending")) {
    return "Friend request already sent.";
  }
  if (message.includes("request_not_found")) return "Friend request not found.";
  if (message.includes("not_addressee")) return "Only the recipient can respond.";
  if (message.includes("friend_request_already_responded")) {
    return "This request was already answered.";
  }
  return message || "Something went wrong.";
}

export function parseFriendActionResult(
  data: unknown,
  error: { message?: string; hint?: string } | null,
): FriendActionResult {
  if (error) return { ok: false, error: friendErrorMessage(error) };
  const status = parseStatus(data);
  if (!status) return { ok: false, error: "Could not update friend status." };
  return { ok: true, status, requestId: parseRequestId(data) };
}

export async function resolveViewerId(): Promise<string | null> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return null;

  const { data: sessionData } = await supabase.auth.getSession();
  const fromSession = sessionData.session?.user.id;
  if (typeof fromSession === "string") return fromSession;

  const { data: claimsData } = await supabase.auth.getClaims();
  const fromClaims = claimsData?.claims?.sub;
  return typeof fromClaims === "string" ? fromClaims : null;
}

export async function fetchFriendStatus(
  targetId: string,
): Promise<{ status: FriendStatus; requestId: string | null }> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { status: "none", requestId: null };

  const { data, error } = await supabase.rpc("get_friend_status", {
    target_id: targetId,
  });

  if (error) {
    logFriendError("get_friend_status", error.message);
    return { status: "none", requestId: null };
  }

  const status = parseStatus(data) ?? "none";
  return { status, requestId: parseRequestId(data) };
}
