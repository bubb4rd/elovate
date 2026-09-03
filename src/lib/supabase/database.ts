import type { Mode } from "@/lib/data/types";
import type { ProfileGrantId, ProfileHeaderId } from "@/lib/profile/headers";
import type { ProfilePageThemeId } from "@/lib/profile/themes";
import type { ClimbTarget, WzPlacementId } from "@/lib/ranked";

export type ProfileRow = {
  id: string;
  slug: string;
  display_name: string;
  avatar_url: string | null;
  equipped_header_id: ProfileHeaderId;
  page_theme_id: ProfilePageThemeId;
  preferred_mode: Mode;
  climb_goals: ClimbTarget[];
  current_sr: number;
  is_private: boolean;
  notify_cutoff: boolean;
  notify_climb: boolean;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
  /** elovate Pro expiry (PREM-00). Service-role writes only — absent from Insert/Update. */
  pro_until: string | null;
};

export type ProfileGrantRow = {
  profile_id: string;
  grant_id: ProfileGrantId;
};

export type ClimbSessionRow = {
  id: string;
  user_id: string;
  mode: Mode;
  started_at: string;
  ended_at: string | null;
  start_sr: number;
};

export type ClimbMatchRow = {
  id: string;
  user_id: string;
  session_id: string;
  mode: Mode;
  created_at: string;
  sr_before: number;
  sr_after: number;
  net: number;
  placement: WzPlacementId | null;
  squad_elims: number | null;
  your_elims: number | null;
  fee: number | null;
  placement_sr: number | null;
  elim_sr: number | null;
  capped: boolean | null;
  sr_per_win: number | null;
  teammates: Array<{
    displayName: string;
    slug: string | null;
    avatarUrl: string | null;
  }>;
};

export type ProfileVoteRow = {
  voter_id: string;
  profile_id: string;
  value: -1 | 1;
  created_at: string;
  updated_at: string;
};

export type DesktopWaitlistRow = {
  id: string;
  email: string;
  user_id: string | null;
  want_updates: boolean;
  want_beta: boolean;
  source: string;
  created_at: string;
};

export type MatchInviteStatus = "pending" | "accepted" | "denied";

export type MatchInviteRow = {
  id: string;
  source_match_id: string;
  inviter_id: string;
  invitee_id: string;
  status: MatchInviteStatus;
  accepted_match_id: string | null;
  created_at: string;
  responded_at: string | null;
};

export type FriendRequestStatus = "pending" | "accepted" | "declined";

export type FriendRequestRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendRequestStatus;
  created_at: string;
  responded_at: string | null;
};

export type FriendStatusValue = "none" | "pending_out" | "pending_in" | "friends";

export type FriendStatusResult = {
  status: FriendStatusValue;
  request_id?: string;
};

export type FriendLeaderboardRpcRow = {
  profile_id: string;
  slug: string;
  display_name: string;
  avatar_url: string | null;
  current_sr: number;
  rank: number;
  is_viewer: boolean;
};

export type PendingFriendRequestRpcRow = {
  id: string;
  created_at: string;
  requester_id: string;
  requester_slug: string;
  requester_display_name: string;
  requester_avatar_url: string | null;
};

export type CastProfileVoteResult = {
  ups: number;
  downs: number;
  viewer_vote: -1 | 1;
  can_change_vote: boolean;
};

export type Database = {
  public: {
    Tables: {
      seasons: {
        Row: {
          id: string;
          name: string;
          starts_at: string;
          ends_at: string | null;
          is_active: boolean;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      snapshots: {
        Row: {
          id: string;
          season_id: string;
          mode: Mode;
          captured_at: string;
          source: string;
          cutoff_sr: number;
          rank1_sr: number;
          player_count: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: {
          id: string;
          slug: string;
          display_name: string;
          avatar_url?: string | null;
          equipped_header_id?: ProfileHeaderId;
          page_theme_id?: ProfilePageThemeId;
          preferred_mode?: Mode;
          climb_goals?: ClimbTarget[];
          current_sr?: number;
          is_private?: boolean;
          notify_cutoff?: boolean;
          notify_climb?: boolean;
          onboarding_completed_at?: string | null;
        };
        Update: {
          slug?: string;
          display_name?: string;
          avatar_url?: string | null;
          equipped_header_id?: ProfileHeaderId;
          page_theme_id?: ProfilePageThemeId;
          preferred_mode?: Mode;
          climb_goals?: ClimbTarget[];
          current_sr?: number;
          is_private?: boolean;
          notify_cutoff?: boolean;
          notify_climb?: boolean;
          onboarding_completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profile_grants: {
        Row: ProfileGrantRow;
        Insert: ProfileGrantRow;
        Update: never;
        Relationships: [];
      };
      climb_sessions: {
        Row: ClimbSessionRow;
        Insert: ClimbSessionRow;
        Update: Partial<Omit<ClimbSessionRow, "id" | "user_id">>;
        Relationships: [];
      };
      climb_matches: {
        Row: ClimbMatchRow;
        Insert: ClimbMatchRow;
        Update: Partial<Omit<ClimbMatchRow, "id" | "user_id">>;
        Relationships: [];
      };
      profile_votes: {
        Row: ProfileVoteRow;
        Insert: {
          voter_id: string;
          profile_id: string;
          value: -1 | 1;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          value?: -1 | 1;
          updated_at?: string;
        };
        Relationships: [];
      };
      desktop_waitlist: {
        Row: DesktopWaitlistRow;
        Insert: {
          id?: string;
          email: string;
          user_id?: string | null;
          want_updates?: boolean;
          want_beta?: boolean;
          source?: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      match_invites: {
        Row: MatchInviteRow;
        Insert: {
          id?: string;
          source_match_id: string;
          inviter_id: string;
          invitee_id: string;
          status?: MatchInviteStatus;
          accepted_match_id?: string | null;
          created_at?: string;
          responded_at?: string | null;
        };
        Update: {
          status?: MatchInviteStatus;
          accepted_match_id?: string | null;
          responded_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "match_invites_inviter_id_fkey";
            columns: ["inviter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_invites_invitee_id_fkey";
            columns: ["invitee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_invites_source_match_id_fkey";
            columns: ["source_match_id"];
            isOneToOne: false;
            referencedRelation: "climb_matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_invites_accepted_match_id_fkey";
            columns: ["accepted_match_id"];
            isOneToOne: false;
            referencedRelation: "climb_matches";
            referencedColumns: ["id"];
          },
        ];
      };
      friend_requests: {
        Row: FriendRequestRow;
        Insert: {
          id?: string;
          requester_id: string;
          addressee_id: string;
          status?: FriendRequestStatus;
          created_at?: string;
          responded_at?: string | null;
        };
        Update: {
          status?: FriendRequestStatus;
          responded_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "friend_requests_requester_id_fkey";
            columns: ["requester_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "friend_requests_addressee_id_fkey";
            columns: ["addressee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      cast_profile_vote: {
        Args: { target_id: string; vote: number };
        Returns: CastProfileVoteResult;
      };
      send_friend_request: {
        Args: { target_id: string };
        Returns: FriendStatusResult;
      };
      respond_friend_request: {
        Args: { request_id: string; accept: boolean };
        Returns: FriendStatusResult;
      };
      get_friend_status: {
        Args: { target_id: string };
        Returns: FriendStatusResult;
      };
      get_friend_leaderboard: {
        Args: Record<string, never>;
        Returns: FriendLeaderboardRpcRow[];
      };
      get_pending_friend_requests: {
        Args: Record<string, never>;
        Returns: PendingFriendRequestRpcRow[];
      };
    };
    CompositeTypes: Record<string, never>;
    Enums: {
      mode: Mode;
      match_invite_status: MatchInviteStatus;
      friend_request_status: FriendRequestStatus;
    };
  };
};
