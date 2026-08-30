"use client";

import { UserMinus, UserPlus } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { loginHref } from "@/lib/auth/paths";
import {
  cancelFriendRequest,
  removeFriend,
  respondFriendRequest,
  sendFriendRequest,
  type FriendStatus,
} from "@/lib/friends";
import { cn } from "@/lib/utils";

export function FriendRequestButton({
  targetProfileId,
  targetSlug,
  initialStatus,
  initialRequestId,
  isSignedIn,
}: {
  targetProfileId: string;
  targetSlug: string;
  initialStatus: FriendStatus;
  initialRequestId: string | null;
  isSignedIn: boolean;
}) {
  const [status, setStatus] = useState<FriendStatus>(initialStatus);
  const [requestId, setRequestId] = useState<string | null>(initialRequestId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isSignedIn) {
    return (
      <Link
        href={loginHref(`/players/${targetSlug}`)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 text-xs font-medium text-muted",
          "hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        )}
      >
        <UserPlus weight="bold" className="size-4" />
        Add friend
      </Link>
    );
  }

  async function run(action: () => Promise<{ ok: boolean; status?: FriendStatus; requestId?: string | null; error?: string }>) {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    if (result.status) setStatus(result.status);
    setRequestId(result.requestId ?? null);
  }

  if (status === "friends") {
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          disabled={busy || !requestId}
          onClick={() => {
            if (!requestId) return;
            void run(async () => removeFriend(requestId));
          }}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 text-xs font-medium text-muted",
            "hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50",
          )}
        >
          <UserMinus weight="bold" className="size-4" />
          Unfriend
        </button>
        {error ? <p className="text-[11px] text-negative">{error}</p> : null}
      </div>
    );
  }

  if (status === "pending_out") {
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          disabled={busy || !requestId}
          onClick={() => {
            if (!requestId) return;
            void run(async () => cancelFriendRequest(requestId));
          }}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-border px-2.5 text-xs font-medium text-muted",
            "hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50",
          )}
        >
          Cancel request
        </button>
        {error ? <p className="text-[11px] text-negative">{error}</p> : null}
      </div>
    );
  }

  if (status === "pending_in") {
    return (
      <div className="flex flex-col items-start gap-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={busy || !requestId}
            onClick={() => {
              if (!requestId) return;
              void run(async () => respondFriendRequest(requestId, true));
            }}
            className={cn(
              "inline-flex h-8 items-center rounded-[6px] bg-accent px-2.5 text-xs font-medium text-accent-fg",
              "hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50",
            )}
          >
            Accept
          </button>
          <button
            type="button"
            disabled={busy || !requestId}
            onClick={() => {
              if (!requestId) return;
              void run(async () => respondFriendRequest(requestId, false));
            }}
            className={cn(
              "inline-flex h-8 items-center rounded-[6px] border border-border px-2.5 text-xs font-medium text-muted",
              "hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50",
            )}
          >
            Decline
          </button>
        </div>
        {error ? <p className="text-[11px] text-negative">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          void run(async () => sendFriendRequest(targetProfileId));
        }}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 text-xs font-medium text-muted",
          "hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50",
        )}
      >
        <UserPlus weight="bold" className="size-4" />
        Add friend
      </button>
      {error ? <p className="text-[11px] text-negative">{error}</p> : null}
    </div>
  );
}
