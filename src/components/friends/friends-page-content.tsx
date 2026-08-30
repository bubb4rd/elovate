"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  FriendInviteCallout,
  shouldShowFriendInvite,
} from "@/components/friends/friend-invite-callout";
import { FriendLeaderboard } from "@/components/friends/friend-leaderboard";
import { FriendRequestsPanel } from "@/components/friends/friend-requests-panel";
import { loginHref, registerHref } from "@/lib/auth/paths";
import {
  fetchFriendLeaderboard,
  fetchPendingFriendRequests,
  subscribeFriendChanged,
  subscribeFriendRequests,
  type FriendLeaderboardRow,
  type PendingFriendRequest,
} from "@/lib/friends";

export function FriendsSignedOut() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start py-6 md:py-12">
      <h1 className="accent-glow bg-linear-to-r from-geebung-600 to-geebung-500 bg-clip-text text-4xl font-semibold tracking-tight text-transparent md:text-5xl">
        Friends
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-muted md:text-lg">
        Add friends and climb a private leaderboard ranked by skill rating.
        Compete with the squad, not the whole board.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href={registerHref("/friends")}
          className="inline-flex h-11 items-center justify-center rounded-[6px] bg-accent px-5 text-sm font-medium text-accent-fg shadow-sm transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
        >
          Create account
        </Link>
        <Link
          href={loginHref("/friends")}
          className="inline-flex h-11 items-center justify-center rounded-[6px] px-4 text-sm font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

export function FriendsSignedIn({
  slug,
  displayName,
}: {
  slug: string;
  displayName: string;
}) {
  const [rows, setRows] = useState<FriendLeaderboardRow[] | null>(null);
  const [requests, setRequests] = useState<PendingFriendRequest[]>([]);

  const refresh = useCallback(() => {
    void Promise.all([
      fetchFriendLeaderboard(),
      fetchPendingFriendRequests(),
    ]).then(([nextRows, nextRequests]) => {
      setRows(nextRows);
      setRequests(nextRequests);
    });
  }, []);

  useEffect(() => {
    refresh();
    const unsubRequests = subscribeFriendRequests(refresh);
    const unsubChanged = subscribeFriendChanged(refresh);
    function onFocus() {
      refresh();
    }
    window.addEventListener("focus", onFocus);
    return () => {
      unsubRequests();
      unsubChanged();
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return (
    <div className="py-6 md:py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="accent-glow theme-heading text-4xl font-semibold tracking-tight md:text-5xl">
            Friends
          </h1>
          <p className="mt-2 text-sm text-muted">
            Ranked by current skill rating among you and your friends.
          </p>
        </div>
      </div>

      <FriendRequestsPanel requests={requests} onChanged={refresh} />

      {rows == null ? (
        <p className="py-8 text-sm text-muted">Loading leaderboard…</p>
      ) : (
        <>
          <FriendLeaderboard rows={rows} />
          {shouldShowFriendInvite(rows.filter((row) => !row.isViewer).length) ? (
            <FriendInviteCallout slug={slug} displayName={displayName} />
          ) : null}
        </>
      )}
    </div>
  );
}
