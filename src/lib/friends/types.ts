export type FriendStatus =
  | "none"
  | "pending_out"
  | "pending_in"
  | "friends";

export type FriendLeaderboardRow = {
  profileId: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  currentSr: number;
  rank: number;
  isViewer: boolean;
};

export type PendingFriendRequest = {
  id: string;
  createdAt: string;
  requester: {
    id: string;
    displayName: string;
    slug: string;
    avatarUrl: string | null;
  };
};

export type FriendActionResult =
  | { ok: true; status: FriendStatus; requestId: string | null }
  | { ok: false; error: string };
